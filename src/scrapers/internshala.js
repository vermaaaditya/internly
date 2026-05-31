const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const BASE_URL = 'https://internshala.com';
const REQUEST_DELAY_MS = 1500;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Cache-Control': 'no-cache'
};

/**
 * Delays execution for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Builds the list of URLs to scrape based on keywords.
 * Always includes the base work-from-home page, plus one per keyword.
 * @param {string[]} keywords
 * @returns {string[]}
 */
function buildUrls(keywords) {
  const urls = [
    `${BASE_URL}/internships/work-from-home-internships/`
  ];

  for (const keyword of keywords) {
    // Internshala uses lowercase, hyphenated slugs in the URL path
    const slug = keyword
      .toLowerCase()
      .replace(/\s+/g, '-')       // "Machine Learning" -> "machine-learning"
      .replace(/[^a-z0-9\-]/g, '') // strip special chars like dots
      .replace(/-+/g, '-');        // collapse double hyphens
    urls.push(`${BASE_URL}/internships/${slug}-internship/`);
  }

  return [...new Set(urls)]; // deduplicate
}

/**
 * Parses a single Internshala page's HTML and extracts listing cards.
 * @param {string} html - Raw HTML string
 * @param {string} url - The URL that was fetched (for logging)
 * @returns {Object[]} Array of raw listing objects
 */
function parsePage(html, url) {
  const $ = cheerio.load(html);
  const listings = [];

  // Internshala wraps each listing in a container with class
  // "individual_internship" or uses ".internship_meta" inside it.
  // We target the outermost card container for maximum data capture.
  const cardSelector = '.individual_internship, .internship_meta';

  $(cardSelector).each((_index, element) => {
    try {
      const $card = $(element);

      // Title: the profile/role link text
      const title = (
        $card.find('.profile a').first().text().trim() ||
        $card.find('.company a').first().text().trim() ||
        $card.find('h3').first().text().trim() ||
        ''
      );

      // Company name
      const company = (
        $card.find('.company_name a').first().text().trim() ||
        $card.find('.company_name').first().text().trim() ||
        $card.find('.company').first().text().trim() ||
        ''
      );

      // Stipend (raw string)
      const stipend = (
        $card.find('.stipend').first().text().trim() ||
        $card.find('.desktop-text .stipend_container_tooltip_text').first().text().trim() ||
        'Not disclosed'
      );

      // Duration
      const duration = (
        $card.find('.other_detail_item_row .item_body:contains("Months")').first().text().trim() ||
        $card.find('.other_detail_item_row .item_body:contains("Month")').first().text().trim() ||
        $card.find('.item_body').eq(1).text().trim() ||
        ''
      );

      // Posted date / "start date" or freshness indicator
      const postedDate = (
        $card.find('.status-success').first().text().trim() ||
        $card.find('.status-info').first().text().trim() ||
        $card.find('.posted_by_container span').first().text().trim() ||
        ''
      );

      // Apply URL (relative link -> absolute)
      const relativeLink = (
        $card.find('.profile a').first().attr('href') ||
        $card.find('a[href*="/internship/"]').first().attr('href') ||
        ''
      );
      const applyUrl = relativeLink
        ? (relativeLink.startsWith('http') ? relativeLink : `${BASE_URL}${relativeLink}`)
        : '';

      // Skills (tag list)
      const skills = [];
      $card.find('.round_tabs, .skills_container .round_tabs_container .round_tabs').each((_i, skillEl) => {
        const skillText = $(skillEl).text().trim();
        if (skillText) skills.push(skillText);
      });

      // Remote badge detection
      const cardText = $card.text().toLowerCase();
      const isRemote = (
        cardText.includes('work from home') ||
        cardText.includes('remote') ||
        $card.find('.location_link').text().toLowerCase().includes('work from home') ||
        $card.find('[class*="work_from_home"]').length > 0
      );

      // Only push if we got at least a title
      if (title) {
        listings.push({
          title,
          company,
          stipend,
          duration,
          postedDate,
          applyUrl,
          skills,
          isRemote,
          source: 'internshala'
        });
      }
    } catch (parseErr) {
      // Silently skip malformed cards
      logger.warn(`Skipped a malformed listing card on ${url}`);
    }
  });

  return listings;
}

/**
 * Fetches a single URL from Internshala and parses it.
 * @param {string} url
 * @returns {Promise<Object[]>} Parsed listings, or empty array on failure.
 */
async function fetchAndParse(url) {
  try {
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 12000,
      maxRedirects: 5
    });

    if (response.status !== 200) {
      logger.warn(`Internshala returned status ${response.status} for ${url}`);
      return [];
    }

    const listings = parsePage(response.data, url);
    logger.info(`  → Parsed ${listings.length} listings from ${url}`);
    return listings;
  } catch (err) {
    const status = err.response ? err.response.status : 'NETWORK_ERROR';
    logger.error(`Failed to fetch ${url} [${status}]: ${err.message}`);
    return [];
  }
}

/**
 * Main scraper entry point for Internshala.
 * Accepts the keywords array from config, constructs search URLs,
 * fetches and parses each with a 1.5s delay between requests,
 * deduplicates results, and returns the raw array.
 *
 * @param {string[]} keywords - Array of keyword strings from config
 * @returns {Promise<Object[]>} Array of raw listing objects
 */
async function scrapeInternshala(keywords = []) {
  logger.header('Internshala Scraper');
  logger.info(`Scraping with ${keywords.length} keywords: [${keywords.join(', ')}]`);

  const urls = buildUrls(keywords);
  logger.info(`Built ${urls.length} target URLs to scrape.`);

  const allListings = [];
  const seenUrls = new Set();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    logger.info(`[${i + 1}/${urls.length}] Fetching: ${url}`);

    const listings = await fetchAndParse(url);

    // Deduplicate by applyUrl within the same run
    for (const listing of listings) {
      if (listing.applyUrl && !seenUrls.has(listing.applyUrl)) {
        seenUrls.add(listing.applyUrl);
        allListings.push(listing);
      } else if (!listing.applyUrl) {
        // Keep listings without URLs (edge case) but mark them
        allListings.push(listing);
      }
    }

    // Rate limit: wait 1.5s before the next request (skip delay after the last one)
    if (i < urls.length - 1) {
      await delay(REQUEST_DELAY_MS);
    }
  }

  logger.success(`Internshala scraping complete. Collected ${allListings.length} unique listings.`);
  return allListings;
}

module.exports = { scrapeInternshala };
