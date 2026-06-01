const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const SIMPLIFY_URL = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md';

/**
 * Parses the SimplifyJobs README HTML tables.
 * Handles row span / sub-company indicators (↳).
 *
 * @param {string} markdown - The raw markdown content containing HTML tables.
 * @returns {Object[]} Parsed listing array
 */
function parseSimplifyMarkdown(markdown) {
  const listings = [];
  
  // Load the markdown containing HTML tables into Cheerio
  const $ = cheerio.load(markdown);

  let lastCompany = '';

  $('table tbody tr').each((_i, el) => {
    try {
      const $row = $(el);
      const $tds = $row.find('td');
      
      if ($tds.length < 4) return; // Malformed row

      // 1. Company
      let company = $tds.eq(0).text().trim();
      // Handle sub-company / same-company arrow
      if (!company || company.includes('↳') || company === '↳') {
        company = lastCompany;
      } else {
        lastCompany = company;
      }

      // 2. Role
      const title = $tds.eq(1).text().trim();

      // 3. Location
      const location = $tds.eq(2).text().trim();

      // 4. Apply URL
      const $applyCell = $tds.eq(3);
      // The direct link is the first <a> inside the cell
      const applyUrl = $applyCell.find('a').first().attr('href') || '';

      // 5. Posted Date (Age)
      const postedDate = $tds.eq(4).text().trim();

      // Extract skills from title to help the scoring engine find matches
      const skills = [];
      const keywordsToMatch = ["React", "Python", "Machine Learning", "Flask", "Node.js", "TypeScript", "JavaScript", "Golang", "Java", "C++", "AWS"];
      keywordsToMatch.forEach(kw => {
        if (title.toLowerCase().includes(kw.toLowerCase())) {
          skills.push(kw);
        }
      });

      // remote check (exclude US/Canada restrictions unless it explicitly says India or Worldwide)
      let isRemote = false;
      const locLower = location.toLowerCase();
      const titleLower = title.toLowerCase();
      
      const hasRemoteKeyword = locLower.includes('remote') || titleLower.includes('remote');
      const hasUSRestriction = locLower.includes('usa') || locLower.includes('in usa') || locLower.includes('canada') || locLower.includes(', us') || locLower.includes(', ca') || locLower.includes(', fl') || locLower.includes(', ma') || locLower.includes(', ny') || locLower.includes(', tx') || locLower.includes(', wa') || locLower.includes(', or');
      const hasIndiaOrGlobal = locLower.includes('india') || locLower.includes('worldwide') || locLower.includes('global') || locLower.includes('anywhere');
      
      if (hasRemoteKeyword) {
        if (hasUSRestriction && !hasIndiaOrGlobal) {
          isRemote = false; // Exclude US-only remote
        } else {
          isRemote = true;
        }
      }

      if (title && applyUrl) {
        listings.push({
          title,
          company,
          stipend: 'Not disclosed', // GitHub lists don't have stipends
          duration: '3 Months',
          postedDate: postedDate ? `${postedDate} ago` : 'Recently',
          applyUrl,
          skills,
          isRemote,
          source: 'simplify'
        });
      }
    } catch (err) {
      logger.warn('Skipped a malformed SimplifyJobs table row.');
    }
  });

  return listings;
}

/**
 * Main scraper entry point for SimplifyJobs.
 * Fetches the raw README from SimplifyJobs GitHub repo, parses the active table.
 *
 * @returns {Promise<Object[]>} Aggregated listings
 */
async function scrapeSimplify() {
  logger.header('SimplifyJobs Scraper');
  logger.info(`Fetching raw README: ${SIMPLIFY_URL}`);

  try {
    const response = await axios.get(SIMPLIFY_URL, {
      timeout: 15000
    });

    if (response.status !== 200) {
      logger.error(`GitHub returned status ${response.status} for SimplifyJobs.`);
      return [];
    }

    const listings = parseSimplifyMarkdown(response.data);
    logger.success(`SimplifyJobs scraping complete. Collected ${listings.length} active listings.`);
    return listings;
  } catch (err) {
    logger.error(`Failed to fetch SimplifyJobs: ${err.message}`);
    return [];
  }
}

module.exports = { scrapeSimplify };
