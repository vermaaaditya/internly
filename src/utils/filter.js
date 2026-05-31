/**
 * Scoring and filtering engine for normalized internship listings.
 * Implements a 0–10 scoring system and deduplication by applyUrl.
 */

/**
 * Computes a relevance score (0–10) for a single normalized listing.
 *
 * Scoring breakdown:
 *   +3  if stipend >= config.minStipend (or +1 if stipend is 0/unknown — benefit of doubt)
 *   +3  if any listing skill matches any config keyword (case-insensitive)
 *   +2  if title contains any config domain keyword
 *   +2  if isRemote === true (skipped if config.remoteOnly is false)
 *
 * @param {Object} listing - A normalized listing object
 * @param {Object} config  - The application config
 * @returns {number} Score between 0 and 10
 */
function computeScore(listing, config) {
  let score = 0;

  // --- Stipend check (+3 or +1) ---
  if (listing.stipend === 0) {
    // Unknown / not disclosed — benefit of the doubt
    score += 1;
  } else if (listing.stipend >= config.minStipend) {
    score += 3;
  }

  // --- Keyword match against skills (+3) ---
  if (Array.isArray(config.keywords) && config.keywords.length > 0) {
    const listingSkills = listing.skills.map(s => s.toLowerCase());
    const hasKeywordMatch = config.keywords.some(keyword => {
      const kwLower = keyword.toLowerCase();
      return listingSkills.some(skill => skill.includes(kwLower));
    });
    if (hasKeywordMatch) {
      score += 3;
    }
  }

  // --- Domain match in title (+2) ---
  if (Array.isArray(config.domains) && config.domains.length > 0) {
    const titleLower = listing.title.toLowerCase();
    const hasDomainMatch = config.domains.some(domain =>
      titleLower.includes(domain.toLowerCase())
    );
    if (hasDomainMatch) {
      score += 2;
    }
  }

  // --- Remote bonus (+2) — only applies when config.remoteOnly is true ---
  if (config.remoteOnly) {
    if (listing.isRemote) {
      score += 2;
    }
  }
  // If config.remoteOnly is false, we skip this check entirely (no penalty or bonus)

  // --- Student / Full-Time Blacklist Check (-4 penalty) ---
  const blacklist = [
    "full time", "full-time", "immediate joiner", 
    "no part time", "6 days", "office only",
    "not suitable for students", "full commitment"
  ];

  const descLower = (listing.description || '').toLowerCase();
  const titleLower = (listing.title || '').toLowerCase();
  const skillsLower = (listing.skills || []).map(s => s.toLowerCase()).join(' ');

  const flagged = blacklist.some(term => 
    descLower.includes(term) || 
    titleLower.includes(term) ||
    skillsLower.includes(term)
  );

  if (flagged) {
    score -= 4;
  }

  return Math.max(0, Math.min(score, 10));
}

/**
 * Scores, deduplicates, sorts, and filters a list of normalized listings.
 *
 * 1. Computes a score (0–10) for each listing
 * 2. Attaches `score` and `shortlisted` (score >= 6) to each listing
 * 3. Removes duplicates by applyUrl
 * 4. Returns listings sorted by score descending, limited to config.maxResults
 *
 * @param {Object[]} listings - Array of normalized listing objects
 * @param {Object}   config   - The application config
 * @returns {Object[]} Scored, filtered, and sorted listings
 */
function scoreAndFilter(listings, config) {
  if (!Array.isArray(listings)) return [];

  // 1. Score each listing
  const scored = listings.map(listing => {
    const score = computeScore(listing, config);
    return {
      ...listing,
      score,
      shortlisted: score >= 6
    };
  });

  // 2. Deduplicate by applyUrl (keep the first occurrence / highest score)
  const seen = new Map();
  for (const listing of scored) {
    const key = listing.applyUrl || listing.id; // fallback to id if no URL
    if (!seen.has(key) || seen.get(key).score < listing.score) {
      seen.set(key, listing);
    }
  }
  const deduplicated = [...seen.values()];

  // 3. Sort by score descending
  deduplicated.sort((a, b) => b.score - a.score);

  // 4. Limit to maxResults
  const maxResults = config.maxResults || 50;
  return deduplicated.slice(0, maxResults);
}

module.exports = {
  scoreAndFilter,
  computeScore
};
