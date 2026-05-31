const crypto = require('crypto');
const { randomUUID } = crypto;

/**
 * Generates a deterministic UUID based on a string (applyUrl).
 * Fallback to randomUUID if no string is provided.
 */
function getDeterministicUUID(str) {
  if (!str) return randomUUID();
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-');
}

/**
 * Parses a raw stipend string into a numeric INR value.
 * Handles formats like "₹ 5,000 /month", "₹5000-10000", "10,000", "Unpaid", etc.
 * Returns the first (lowest) number found, or 0 if unparseable.
 *
 * @param {string|number} raw - The raw stipend value
 * @returns {number} Parsed stipend in INR, or 0
 */
function parseStipend(raw) {
  if (typeof raw === 'number') return raw;
  if (!raw || typeof raw !== 'string') return 0;

  const lower = raw.toLowerCase().trim();

  // Explicit zero-value indicators
  if (
    lower.includes('unpaid') ||
    lower === 'not listed' ||
    lower === 'not disclosed' ||
    lower === 'none' ||
    lower === '0' ||
    lower === '-'
  ) {
    return 0;
  }

  // Strip currency symbols, commas, whitespace, and common suffixes
  const cleaned = raw.replace(/[₹$€,\s]/g, '');

  // Extract all numeric sequences
  const numbers = cleaned.match(/\d+/g);
  if (!numbers || numbers.length === 0) return 0;

  // Return the first number (conservative: lower bound of any range)
  return parseInt(numbers[0], 10);
}

/**
 * Takes a raw listing object from any scraper and returns a normalized object
 * with the exact standard schema.
 *
 * @param {Object} raw - Raw listing from a scraper
 * @returns {Object} Normalized listing object
 */
function normalizeListing(raw) {
  // Defensive defaults
  const title    = (raw.title || 'Untitled Internship').trim();
  const company  = (raw.company || 'Unknown Company').trim();
  const stipend  = parseStipend(raw.stipend);
  const duration = (raw.duration || '').trim();
  const postedDate = (raw.postedDate || '').trim();
  const applyUrl = (raw.applyUrl || raw.applyLink || '').trim();
  const source   = (raw.source || 'unknown').trim();

  // Normalize skills: ensure array, lowercase, trim, deduplicate
  let skills = [];
  if (Array.isArray(raw.skills)) {
    skills = [...new Set(raw.skills.map(s => s.toLowerCase().trim()).filter(Boolean))];
  }

  // Determine remote status
  let isRemote = false;
  if (typeof raw.isRemote === 'boolean') {
    isRemote = raw.isRemote;
  } else {
    // Fallback: detect from location or title text
    const searchText = `${raw.location || ''} ${title}`.toLowerCase();
    isRemote = searchText.includes('remote') ||
               searchText.includes('work from home') ||
               searchText.includes('wfh');
  }

  return {
    id: getDeterministicUUID(applyUrl),
    title,
    company,
    stipend,
    duration,
    postedDate,
    applyUrl,
    skills,
    isRemote,
    source,
    scrapedAt: new Date().toISOString()
  };
}

module.exports = {
  normalizeListing,
  parseStipend
};
