const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const { generateEmbedding } = require('../utils/embed');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function backfill() {
  console.log("Starting backfill for listing embeddings...");
  
  // 1. Fetch listings with null embeddings
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, title, company, description')
    .is('embedding', null);

  if (error) {
    console.error("Failed to fetch listings:", error.message);
    process.exit(1);
  }

  console.log(`Found ${listings.length} listings requiring embeddings.`);

  if (listings.length === 0) {
    console.log("All listings are already embedded. Nothing to do!");
    return;
  }

  // 2. Generate and update in batches of 5 to respect rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const chunk = listings.slice(i, i + BATCH_SIZE);
    
    await Promise.all(chunk.map(async (listing) => {
      const text = `${listing.title} ${listing.company} ${listing.description || ''}`;
      const embedding = await generateEmbedding(text);
      
      if (embedding) {
        const { error: updateErr } = await supabase
          .from('listings')
          .update({ embedding })
          .eq('id', listing.id);
        
        if (updateErr) {
          console.error(`Failed to update listing ${listing.id}:`, updateErr.message);
        } else {
          console.log(`Successfully embedded: ${listing.title} (${listing.company})`);
        }
      }
    }));

    if (i + BATCH_SIZE < listings.length) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  console.log("Backfill completed successfully!");
}

backfill();
