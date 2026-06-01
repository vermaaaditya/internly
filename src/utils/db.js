/**
 * Supabase database client helper.
 * Provides typed helper functions for upserting listings,
 * fetching shortlisted items, and updating application status.
 */
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const logger = require('./logger');
const { generateEmbedding } = require('./embed');

// ── Initialize Supabase Client ──────────────────────────────────────────────
let supabase = null;

if (config.supabaseUrl && config.supabaseKey) {
  try {
    supabase = createClient(config.supabaseUrl, config.supabaseKey);
    logger.success('Supabase client initialized successfully.');
  } catch (err) {
    logger.error('Failed to initialize Supabase client:', err);
  }
} else {
  logger.warn(
    'SUPABASE_URL or SUPABASE_KEY not set in environment. ' +
    'Database operations will be skipped (console-only mode).'
  );
}

/**
 * Checks whether the Supabase client is available.
 * @returns {boolean}
 */
function isConnected() {
  return supabase !== null;
}

/**
 * Bulk upserts an array of scored/normalized listings into the `listings` table.
 * Conflicts are resolved on `apply_url` — existing rows are updated with fresh data.
 *
 * @param {Object[]} listings - Array of normalized + scored listing objects
 * @returns {Promise<{inserted: number, errors: string[]}>}
 */
async function upsertListings(listings) {
  if (!supabase) {
    logger.warn('upsertListings skipped — no Supabase connection.');
    return { inserted: 0, errors: ['No Supabase connection'] };
  }

  if (!Array.isArray(listings) || listings.length === 0) {
    return { inserted: 0, errors: [] };
  }

  // Fetch existing listings to preserve their IDs and avoid foreign key constraint violations
  const urlToRowMap = new Map();
  try {
    const { data: existingListings, error: fetchErr } = await supabase
      .from('listings')
      .select('id, apply_url, embedding, description');
    
    if (fetchErr) {
      logger.error('Failed to fetch existing listings for ID mapping:', fetchErr);
    } else if (existingListings) {
      existingListings.forEach(row => {
        if (row.apply_url) {
          urlToRowMap.set(row.apply_url, row);
        }
      });
    }
  } catch (fetchErr) {
    logger.error('Exception while fetching existing listings:', fetchErr);
  }

  // Map from the normalized JS schema to the snake_case DB columns
  const rows = listings.map(l => {
    const existingRow = urlToRowMap.get(l.applyUrl);
    return {
      id:           existingRow ? existingRow.id : l.id,
      title:        l.title,
      company:      l.company,
      stipend:      l.stipend,
      duration:     l.duration || null,
      posted_date:  l.postedDate || null,
      apply_url:    l.applyUrl,
      skills:       l.skills || [],
      is_remote:    l.isRemote,
      source:       l.source,
      score:        l.score || 0,
      shortlisted:  l.shortlisted || false,
      scraped_at:   l.scrapedAt || new Date().toISOString(),
      description:  l.description || existingRow?.description || null,
      embedding:    existingRow ? existingRow.embedding : null
    };
  });

  // Batch generate embeddings for listings that do not have them yet
  const rowsToEmbed = rows.filter(r => r.embedding === null);
  if (rowsToEmbed.length > 0) {
    logger.info(`Generating semantic embeddings for ${rowsToEmbed.length} new/un-embedded listings...`);
    const BATCH_SIZE_EMBED = 5;
    for (let i = 0; i < rowsToEmbed.length; i += BATCH_SIZE_EMBED) {
      const chunk = rowsToEmbed.slice(i, i + BATCH_SIZE_EMBED);
      await Promise.all(chunk.map(async (row) => {
        const inputText = `${row.title} ${row.company} ${row.description || ''}`;
        row.embedding = await generateEmbedding(inputText);
      }));
      // Pause slightly between batches to be friendly to Hugging Face
      if (i + BATCH_SIZE_EMBED < rowsToEmbed.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }

  const errors = [];

  // Supabase has a row-limit for single upserts; batch in chunks of 500
  const BATCH_SIZE = 500;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('listings')
      .upsert(batch, { onConflict: 'apply_url' });

    if (error) {
      logger.error(`Supabase upsert error (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, error);
      errors.push(error.message || JSON.stringify(error));
    } else {
      totalInserted += batch.length;
    }
  }

  if (errors.length === 0) {
    logger.success(`Upserted ${totalInserted} listings to Supabase.`);
  }

  return { inserted: totalInserted, errors };
}

/**
 * Fetches all shortlisted listings (shortlisted = true) ordered by score descending.
 *
 * @returns {Promise<Object[]>} Array of shortlisted listing rows
 */
async function getShortlisted() {
  if (!supabase) {
    logger.warn('getShortlisted skipped — no Supabase connection.');
    return [];
  }

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('shortlisted', true)
    .order('score', { ascending: false });

  if (error) {
    logger.error('Failed to fetch shortlisted listings:', error);
    return [];
  }

  logger.info(`Fetched ${data.length} shortlisted listings from Supabase.`);
  return data;
}

/**
 * Updates (or creates) an application record for a given listing.
 *
 * @param {string} listingId - UUID of the listing
 * @param {string} status    - One of: 'pending' | 'applied' | 'replied' | 'interview' | 'rejected'
 * @param {string} [notes]   - Optional notes about the application
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function updateApplicationStatus(listingId, status, notes = '') {
  if (!supabase) {
    logger.warn('updateApplicationStatus skipped — no Supabase connection.');
    return { success: false, error: 'No Supabase connection' };
  }

  const validStatuses = ['pending', 'applied', 'replied', 'interview', 'rejected'];
  if (!validStatuses.includes(status)) {
    const msg = `Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`;
    logger.error(msg);
    return { success: false, error: msg };
  }

  // Check if an application record already exists for this listing
  const { data: existing, error: fetchErr } = await supabase
    .from('applications')
    .select('id')
    .eq('listing_id', listingId)
    .limit(1);

  if (fetchErr) {
    logger.error('Error checking existing application:', fetchErr);
    return { success: false, error: fetchErr.message };
  }

  let result;

  if (existing && existing.length > 0) {
    // Update existing record
    result = await supabase
      .from('applications')
      .update({
        status,
        notes: notes || undefined,
        applied_at: status === 'applied' ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('listing_id', listingId);
  } else {
    // Insert new application record
    result = await supabase
      .from('applications')
      .insert({
        listing_id: listingId,
        status,
        notes: notes || null,
        applied_at: status === 'applied' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      });
  }

  if (result.error) {
    logger.error('Failed to update application status:', result.error);
    return { success: false, error: result.error.message };
  }

  logger.success(`Application for listing ${listingId} updated to "${status}".`);
  return { success: true };
}

module.exports = {
  isConnected,
  upsertListings,
  getShortlisted,
  updateApplicationStatus
};
