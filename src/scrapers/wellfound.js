const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const WELLFOUND_URL = 'https://wellfound.com/jobs?jobType=internship&remote=true';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Cache-Control': 'no-cache'
};

/**
 * Attempts to parse Wellfound job cards from server-rendered HTML.
 * Wellfound heavily relies on client-side React rendering, so static HTML
 * may yield limited results. This function uses multiple selector strategies.
 *
 * @param {string} html - The raw HTML of the page
 * @returns {Object[]} Parsed listing objects
 */
function parseWellfoundPage(html) {
  const $ = cheerio.load(html);
  const listings = [];

  // Strategy 1: Standard job card selectors observed in Wellfound's SSR output
  const cardSelectors = [
    '[data-test="StartupResult"]',
    '.styles_component__jobCard',
    '.job-card',
    '[class*="JobCard"]',
    '[class*="job-listing"]',
    'div[class*="startup-"]'
  ];

  let $cards = $([]);
  for (const selector of cardSelectors) {
    $cards = $(selector);
    if ($cards.length > 0) break;
  }

  $cards.each((_index, element) => {
    try {
      const $card = $(element);

      // Title
      const title = (
        $card.find('[class*="jobTitle"], [class*="title"] a, h4 a, h3 a').first().text().trim() ||
        $card.find('a[href*="/jobs/"]').first().text().trim() ||
        ''
      );

      // Company
      const company = (
        $card.find('[class*="companyName"], [class*="company"]').first().text().trim() ||
        $card.find('h2').first().text().trim() ||
        ''
      );

      // Compensation / Stipend
      const stipend = (
        $card.find('[class*="compensation"], [class*="salary"]').first().text().trim() ||
        'Not listed'
      );

      // Location
      const locationText = (
        $card.find('[class*="location"]').first().text().trim() ||
        'Remote'
      );
      const isRemote = locationText.toLowerCase().includes('remote') ||
                       $card.text().toLowerCase().includes('remote');
      const location = isRemote ? 'Remote' : locationText;

      // Apply URL
      const relativeLink = (
        $card.find('a[href*="/jobs/"]').first().attr('href') ||
        $card.find('a').first().attr('href') ||
        ''
      );
      const applyUrl = relativeLink
        ? (relativeLink.startsWith('http') ? relativeLink : `https://wellfound.com${relativeLink}`)
        : '';

      // Skills / tags
      const skills = [];
      $card.find('[class*="tag"], [class*="skill"], span[class*="pill"]').each((_i, skillEl) => {
        const skillText = $(skillEl).text().trim();
        if (skillText && skillText.length < 40) skills.push(skillText);
      });

      if (title) {
        listings.push({
          title,
          company,
          stipend,
          location,
          applyUrl,
          skills,
          isRemote,
          source: 'wellfound'
        });
      }
    } catch (parseErr) {
      logger.warn('Skipped a malformed Wellfound listing card.');
    }
  });

  // Strategy 2: If no cards found via selectors, attempt to extract from
  // embedded JSON / Next.js data props (Wellfound uses Next.js under the hood)
  if (listings.length === 0) {
    try {
      const scriptTags = $('script#__NEXT_DATA__');
      if (scriptTags.length > 0) {
        const jsonText = scriptTags.first().html();
        const nextData = JSON.parse(jsonText);

        // Navigate into the props to find job listings
        const pageProps = nextData?.props?.pageProps;
        const jobs = pageProps?.listings || pageProps?.jobs || pageProps?.results || [];

        for (const job of jobs) {
          listings.push({
            title: job.title || job.name || '',
            company: job.company?.name || job.companyName || '',
            stipend: job.compensation || job.salary || 'Not listed',
            location: job.remote ? 'Remote' : (job.location || 'Unknown'),
            applyUrl: job.url || job.slug ? `https://wellfound.com/jobs/${job.slug}` : '',
            skills: job.tags || job.skills || [],
            isRemote: !!job.remote,
            source: 'wellfound'
          });
        }
      }
    } catch (jsonErr) {
      logger.warn('Could not extract Wellfound listings from embedded JSON data.');
    }
  }

  return listings;
}

/**
 * Main scraper entry point for Wellfound.
 * Fetches the public internship search page, parses what static HTML is available.
 * Logs a warning if results are empty (due to client-side rendering limitations).
 *
 * @returns {Promise<Object[]>} Array of raw listing objects
 */
async function scrapeWellfound() {
  logger.header('Wellfound Scraper');
  logger.info(`Fetching: ${WELLFOUND_URL}`);

  try {
    const response = await axios.get(WELLFOUND_URL, {
      headers: HEADERS,
      timeout: 15000,
      maxRedirects: 5
    });

    if (response.status !== 200) {
      logger.warn(`Wellfound returned status ${response.status}.`);
      return [];
    }

    const listings = parseWellfoundPage(response.data);

    if (listings.length === 0) {
      logger.warn(
        'Wellfound returned 0 listings. This is expected — Wellfound renders most content ' +
        'client-side via React. A headless browser (Puppeteer/Playwright) would be needed ' +
        'for full extraction. Consider supplementing with their API or a browser-based scraper.'
      );
    } else {
      logger.success(`Wellfound scraping complete. Collected ${listings.length} listings.`);
    }

    return listings;
  } catch (err) {
    const status = err.response ? err.response.status : 'NETWORK_ERROR';
    logger.error(`Failed to fetch Wellfound [${status}]: ${err.message}`);
    return [];
  }
}

module.exports = { scrapeWellfound };
