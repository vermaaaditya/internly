const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const BASE_URL = 'https://unstop.com';
const UNSTOP_URL = 'https://unstop.com/internships';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
  'Cache-Control': 'no-cache'
};

// High-Fidelity simulated student opportunities for Unstop when blocked or dynamic shell loads empty
const SIMULATED_UNSTOP_OPPORTUNITIES = [
  {
    title: 'Amazon ML Challenge Intern',
    company: 'Amazon India',
    stipend: '₹ 80,000 /month',
    duration: '2 Months',
    postedDate: 'Just now',
    applyUrl: 'https://unstop.com/o/amazon-ml-challenge-2026',
    skills: ['Machine Learning', 'Python', 'NLP', 'Deep Learning'],
    isRemote: true,
    source: 'unstop'
  },
  {
    title: 'Uber Hacktag Engineering Intern',
    company: 'Uber India',
    stipend: '₹ 1,20,000 /month',
    duration: '3 Months',
    postedDate: '2 days ago',
    applyUrl: 'https://unstop.com/o/uber-hacktag-2026',
    skills: ['Data Structures', 'Algorithms', 'System Design'],
    isRemote: false,
    source: 'unstop'
  },
  {
    title: 'AI/ML Engineering Intern',
    company: 'Flipkart Grid 7.0',
    stipend: '₹ 50,000 /month',
    duration: '6 Months',
    postedDate: '1 day ago',
    applyUrl: 'https://unstop.com/o/flipkart-grid-ai-ml-track',
    skills: ['Computer Vision', 'PyTorch', 'Python'],
    isRemote: true,
    source: 'unstop'
  },
  {
    title: 'Software Developer Intern',
    company: 'Adobe India',
    stipend: '₹ 1,00,000 /month',
    duration: '3 Months',
    postedDate: '3 days ago',
    applyUrl: 'https://unstop.com/o/adobe-shecodes-hiring-challenge',
    skills: ['C++', 'Java', 'Object Oriented Programming'],
    isRemote: false,
    source: 'unstop'
  },
  {
    title: 'MLOps Internship Challenge',
    company: 'HashedIn by Deloitte',
    stipend: '₹ 25,000 /month',
    duration: '6 Months',
    postedDate: 'Just now',
    applyUrl: 'https://unstop.com/o/hashedin-mlops-challenge',
    skills: ['Docker', 'Kubernetes', 'MLOps', 'Python'],
    isRemote: true,
    source: 'unstop'
  }
];

/**
 * Parses Unstop static HTML page using Cheerio.
 * Since Unstop is heavily client-side rendered, it checks for card elements.
 * 
 * @param {string} html - Raw page HTML
 * @returns {Object[]} Parsed listing array
 */
function parseUnstopHTML(html) {
  const $ = cheerio.load(html);
  const listings = [];

  // Selectors for Unstop's opportunity listings
  const cardSelectors = ['.opp-card', '.opportunity-card', '[class*="opportunityCard"]', '.listing-card'];
  let $cards = $([]);
  
  for (const selector of cardSelectors) {
    $cards = $(selector);
    if ($cards.length > 0) break;
  }

  $cards.each((_i, el) => {
    try {
      const $card = $(el);
      const title = $card.find('h3, .title, [class*="title"]').first().text().trim();
      const company = $card.find('.company-name, .company, [class*="company"]').first().text().trim();
      const stipendText = $card.find('.stipend, .salary, [class*="stipend"]').first().text().trim() || 'Not listed';
      
      const relativeLink = $card.find('a').first().attr('href') || '';
      const applyUrl = relativeLink
        ? (relativeLink.startsWith('http') ? relativeLink : `${BASE_URL}${relativeLink}`)
        : '';

      const skills = [];
      $card.find('.skill-tag, .tag, [class*="tag"]').each((_idx, tagEl) => {
        const text = $(tagEl).text().trim();
        if (text) skills.push(text);
      });

      if (title) {
        listings.push({
          title,
          company,
          stipend: stipendText,
          duration: '3 Months', // Default duration
          postedDate: 'Recently',
          applyUrl,
          skills,
          isRemote: $card.text().toLowerCase().includes('remote') || $card.text().toLowerCase().includes('work from home'),
          source: 'unstop'
        });
      }
    } catch (err) {
      logger.warn('Skipped a malformed Unstop HTML listing card.');
    }
  });

  return listings;
}

/**
 * Main scraper entry point for Unstop.
 * Fetches the public internship search page, parses Cheerio elements,
 * and falls back to student hiring tracks when anti-bot or dynamic rendering returns zero.
 * 
 * @returns {Promise<Object[]>} Aggregated raw listings
 */
async function scrapeUnstop() {
  logger.header('Unstop Scraper');
  logger.warn('Unstop scraper is disabled — challenges and competitions are excluded.');
  return [];
}

module.exports = { scrapeUnstop };
