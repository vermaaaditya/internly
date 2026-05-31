const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const BASE_URL = 'https://www.linkedin.com';
const REQUEST_DELAY_MS = 1500;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive'
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
 * Builds LinkedIn job search URLs for each keyword targeting internships.
 * Uses LinkedIn's public job search (no auth required for the first page).
 *
 * @param {string[]} keywords
 * @returns {string[]} Array of search URLs
 */
function buildUrls(keywords) {
  const urls = [];

  for (const keyword of keywords) {
    const encoded = encodeURIComponent(`${keyword} internship`);
    urls.push(
      `${BASE_URL}/jobs/search?keywords=${encoded}&f_E=1&f_JT=I&location=India&trk=public_jobs_jobs-search-bar_search-submit`
    );
  }

  return [...new Set(urls)];
}

/**
 * Parses LinkedIn's public job search HTML for listing cards.
 * LinkedIn serves limited SSR content for public/guest searches.
 *
 * @param {string} html - Raw HTML
 * @param {string} url  - Source URL (for logging)
 * @returns {Object[]} Parsed listings
 */
function parsePage(html, url) {
  const $ = cheerio.load(html);
  const listings = [];

  // LinkedIn public search uses these card selectors
  const cardSelectors = [
    '.base-card',
    '.job-search-card',
    '.jobs-search__results-list li',
    '[data-entity-urn]'
  ];

  let $cards = $([]);
  for (const selector of cardSelectors) {
    $cards = $(selector);
    if ($cards.length > 0) break;
  }

  $cards.each((_index, element) => {
    try {
      const $card = $(element);

      const title = (
        $card.find('.base-search-card__title').first().text().trim() ||
        $card.find('h3').first().text().trim() ||
        ''
      );

      const company = (
        $card.find('.base-search-card__subtitle a').first().text().trim() ||
        $card.find('h4 a').first().text().trim() ||
        ''
      );

      const location = (
        $card.find('.job-search-card__location').first().text().trim() ||
        ''
      );

      const postedDate = (
        $card.find('time').first().text().trim() ||
        $card.find('.job-search-card__listdate').first().text().trim() ||
        ''
      );

      const relativeLink = (
        $card.find('a.base-card__full-link').first().attr('href') ||
        $card.find('a[href*="/jobs/view/"]').first().attr('href') ||
        ''
      );
      const applyUrl = relativeLink
        ? (relativeLink.startsWith('http') ? relativeLink.split('?')[0] : `${BASE_URL}${relativeLink.split('?')[0]}`)
        : '';

      const isRemote = location.toLowerCase().includes('remote') ||
                       $card.text().toLowerCase().includes('remote');

      if (title) {
        listings.push({
          title,
          company,
          stipend: 'Not listed',  // LinkedIn rarely shows stipend publicly
          duration: '',
          postedDate,
          applyUrl,
          skills: [],             // Skills are not on the search results page
          isRemote,
          source: 'linkedin'
        });
      }
    } catch (parseErr) {
      logger.warn(`Skipped a malformed LinkedIn listing card on ${url}`);
    }
  });

  return listings;
}

/**
 * Fetches a single LinkedIn search URL and parses it.
 * @param {string} url
 * @returns {Promise<Object[]>}
 */
async function fetchAndParse(url) {
  try {
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 12000,
      maxRedirects: 5
    });

    if (response.status !== 200) {
      logger.warn(`LinkedIn returned status ${response.status} for ${url}`);
      return [];
    }

    const listings = parsePage(response.data, url);
    logger.info(`  → Parsed ${listings.length} listings from LinkedIn`);
    return listings;
  } catch (err) {
    const status = err.response ? err.response.status : 'NETWORK_ERROR';
    logger.error(`Failed to fetch LinkedIn [${status}]: ${err.message}`);
    return [];
  }
}

/**
 * Main scraper entry point for LinkedIn.
 * Constructs keyword-based internship search URLs, fetches each with
 * rate limiting, deduplicates, and returns the raw array.
 *
 * @param {string[]} keywords - Array of keyword strings from config
 * @returns {Promise<Object[]>} Array of raw listing objects
 */
async function scrapeLinkedin(keywords = []) {
  logger.header('LinkedIn Scraper');
  logger.info(`Scraping with ${keywords.length} keywords: [${keywords.join(', ')}]`);

  const urls = buildUrls(keywords);
  logger.info(`Built ${urls.length} target URLs to scrape.`);

  const allListings = [];
  const seenUrls = new Set();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    logger.info(`[${i + 1}/${urls.length}] Fetching: ${url}`);

    const listings = await fetchAndParse(url);

    for (const listing of listings) {
      if (listing.applyUrl && !seenUrls.has(listing.applyUrl)) {
        seenUrls.add(listing.applyUrl);
        allListings.push(listing);
      } else if (!listing.applyUrl) {
        allListings.push(listing);
      }
    }

    if (i < urls.length - 1) {
      await delay(REQUEST_DELAY_MS);
    }
  }

  logger.success(`LinkedIn scraping complete. Collected ${allListings.length} unique listings.`);
  return allListings;
}

module.exports = { scrapeLinkedin };
