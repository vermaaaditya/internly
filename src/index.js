/**
 * Internly — Main Orchestrator
 *
 * Coordinates the full scraping pipeline:
 *   1. Run all scrapers in parallel (Promise.allSettled)
 *   2. Merge all raw results
 *   3. Normalize each listing with normalizeListing()
 *   4. Score and filter with scoreAndFilter()
 *   5. Upsert to Supabase
 *   6. Log a summary dashboard
 *
 * Schedules a daily cron job at 9:00 AM and runs once immediately on startup.
 */

const cron = require('node-cron');
const config = require('./config');
const logger = require('./utils/logger');
const { normalizeListing } = require('./utils/normalize');
const { scoreAndFilter } = require('./utils/filter');
const { upsertListings, isConnected } = require('./utils/db');

// Scrapers
const { scrapeInternshala } = require('./scrapers/internshala');
const { scrapeWellfound } = require('./scrapers/wellfound');
const { scrapeLinkedin } = require('./scrapers/linkedin');
const { scrapeUnstop } = require('./scrapers/unstop');
const { scrapeSimplify } = require('./scrapers/simplify');

/**
 * Runs the full scraping pipeline end-to-end.
 */
async function runPipeline() {
  const startTime = Date.now();
  logger.header('Internly Pipeline Started');
  logger.info(`Timestamp: ${new Date().toISOString()}`);
  logger.info(`Keywords : [${config.keywords.join(', ')}]`);
  logger.info(`Config   : minStipend=${config.minStipend}, remoteOnly=${config.remoteOnly}, maxResults=${config.maxResults}`);
  logger.info(`Supabase : ${isConnected() ? 'Connected ✔' : 'Not configured (console-only mode)'}`);

  // ── Step 1: Run all scrapers in parallel ──────────────────────────────
  logger.header('Step 1 — Scraping');
  const results = await Promise.allSettled([
    scrapeInternshala(config.keywords),
    scrapeWellfound(),
    scrapeLinkedin(config.keywords),
    scrapeUnstop(),
    scrapeSimplify()
  ]);

  const scraperNames = ['Internshala', 'Wellfound', 'LinkedIn', 'Unstop', 'Simplify'];
  const allRaw = [];
  const errors = [];

  results.forEach((result, index) => {
    const name = scraperNames[index];
    if (result.status === 'fulfilled') {
      const listings = result.value || [];
      logger.info(`${name}: ${listings.length} raw listings collected.`);
      allRaw.push(...listings);
    } else {
      logger.error(`${name} scraper failed:`, result.reason);
      errors.push(`${name}: ${result.reason?.message || 'Unknown error'}`);
    }
  });

  logger.info(`Total raw listings aggregated: ${allRaw.length}`);

  if (allRaw.length === 0) {
    logger.warn('No listings were scraped from any source. Pipeline ending early.');
    return;
  }

  // ── Step 2: Normalize ─────────────────────────────────────────────────
  logger.header('Step 2 — Normalizing');
  const normalized = allRaw.map(raw => normalizeListing(raw));
  logger.success(`Normalized ${normalized.length} listings into standard schema.`);

  // ── Step 3: Score & Filter ────────────────────────────────────────────
  logger.header('Step 3 — Scoring & Filtering');
  const scored = scoreAndFilter(normalized, config);
  const shortlisted = scored.filter(l => l.shortlisted);
  logger.success(`Scored ${scored.length} listings. ${shortlisted.length} shortlisted (score ≥ 6).`);

  // ── Step 4: Upsert to Supabase ────────────────────────────────────────
  if (isConnected()) {
    logger.header('Step 4 — Supabase Sync');
    const { inserted, errors: dbErrors } = await upsertListings(scored);
    if (dbErrors.length > 0) {
      dbErrors.forEach(e => errors.push(`DB: ${e}`));
    }
  } else {
    logger.info('Step 4 — Supabase sync skipped (not configured).');
  }

  // ── Step 5: Print Summary Dashboard ───────────────────────────────────
  printDashboard(scored, shortlisted, errors, startTime);
}

/**
 * Prints a beautiful terminal summary dashboard.
 */
function printDashboard(all, shortlisted, errors, startTime) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  logger.header('Pipeline Summary');

  console.log(`\x1b[1m  Total Scraped      :\x1b[0m ${all.length}`);
  console.log(`\x1b[1m  Shortlisted (≥6)   :\x1b[0m \x1b[32m${shortlisted.length}\x1b[0m`);
  console.log(`\x1b[1m  Errors             :\x1b[0m ${errors.length > 0 ? `\x1b[31m${errors.length}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
  console.log(`\x1b[1m  Elapsed Time       :\x1b[0m ${elapsed}s`);
  console.log(`\x1b[1m  Supabase           :\x1b[0m ${isConnected() ? '\x1b[32mSynced\x1b[0m' : '\x1b[33mSkipped\x1b[0m'}`);

  if (errors.length > 0) {
    console.log('\n\x1b[31m  Errors:\x1b[0m');
    errors.forEach((e, i) => console.log(`    ${i + 1}. ${e}`));
  }

  if (shortlisted.length > 0) {
    logger.header('Top Shortlisted Internships');

    // Show top 10 shortlisted
    const top = shortlisted.slice(0, 10);
    top.forEach((job, idx) => {
      const scoreColor = job.score >= 8 ? '\x1b[32m' : job.score >= 6 ? '\x1b[33m' : '\x1b[37m';
      console.log(`\x1b[1m\x1b[36m  [${idx + 1}] ${job.title}\x1b[0m`);
      console.log(`      Company  : ${job.company}`);
      console.log(`      Stipend  : ₹${job.stipend.toLocaleString()}/month`);
      console.log(`      Score    : ${scoreColor}${job.score}/10\x1b[0m ${job.shortlisted ? '⭐' : ''}`);
      console.log(`      Remote   : ${job.isRemote ? '🏠 Yes' : '🏢 No'}`);
      console.log(`      Skills   : ${job.skills.slice(0, 5).join(', ') || 'N/A'}`);
      console.log(`      Source   : ${job.source}`);
      console.log(`      Apply    : \x1b[4m${job.applyUrl}\x1b[0m`);
      console.log('      ' + '─'.repeat(44));
    });

    if (shortlisted.length > 10) {
      console.log(`\n  ... and ${shortlisted.length - 10} more shortlisted listings.`);
    }
  }

  console.log('');
  logger.success('Pipeline run complete.');
}

// ── Startup & Cron Scheduling ────────────────────────────────────────────────

// Run the pipeline once immediately on startup
logger.info('Internly starting up — executing initial pipeline run...');
runPipeline().then(() => {
  // Schedule daily cron job at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    logger.info('⏰ Scheduled cron job triggered (daily 9:00 AM)');
    runPipeline();
  });

  logger.info('📅 Daily cron job scheduled: "0 9 * * *" (every day at 9:00 AM)');
  logger.info('Internly is running. Press Ctrl+C to exit.');
}).catch(err => {
  logger.error('Fatal error during initial pipeline run:', err);
  process.exit(1);
});
