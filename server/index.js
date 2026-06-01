const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!HUGGINGFACE_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("WARNING: Missing required environment variables: HUGGINGFACE_API_KEY, SUPABASE_URL, or SUPABASE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EMBED_MODEL_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';
const ZERO_SHOT_MODEL_URL = 'https://api-inference.huggingface.co/models/facebook/bart-large-mnli';

// Predefined list of skills to check for gap analysis
const SKILL_KEYWORDS = [
  'React', 'Python', 'Machine Learning', 'Flask', 'Node.js', 'Next.js', 'TypeScript', 
  'JavaScript', 'SQL', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Kubernetes', 
  'Java', 'C++', 'Golang', 'Django', 'Tailwind', 'HTML', 'CSS', 'Git', 'CI/CD', 
  'FastAPI', 'PyTorch', 'TensorFlow', 'LLMs', 'OpenAI', 'LangChain', 'MLOps'
];

app.post('/api/search', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }

  try {
    // 1. Generate query embedding
    const response = await axios.post(
      EMBED_MODEL_URL,
      { inputs: query.replace(/\s+/g, ' ').trim() },
      {
        headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` },
        timeout: 10000
      }
    );

    let embedding = response.data;
    if (Array.isArray(embedding)) {
      if (Array.isArray(embedding[0])) {
        embedding = embedding[0];
      }
    }

    if (!embedding || embedding.length !== 384) {
      throw new Error('Invalid embedding vector returned from HuggingFace.');
    }

    // 2. Query Supabase using match_listings RPC
    const { data: results, error } = await supabase.rpc('match_listings', {
      query_embedding: embedding,
      match_threshold: 0.1,
      match_count: 50
    });

    if (error) throw error;

    res.json({ results });
  } catch (err) {
    console.error('Semantic search failed:', err.message);
    res.status(500).json({ error: err.message || 'Semantic search failed.' });
  }
});

app.post('/api/match', async (req, res) => {
  const { resume, description } = req.body;
  
  if (!resume || !description) {
    return res.status(400).json({ error: 'Both resume and description are required.' });
  }

  try {
    // 1. HuggingFace Zero-Shot Classification
    const context = `Resume: ${resume}\n\nJob Description: ${description}`;
    const hfResponse = await axios.post(
      ZERO_SHOT_MODEL_URL,
      {
        inputs: context,
        parameters: {
          candidate_labels: ['strong match', 'partial match', 'weak match']
        }
      },
      {
        headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` },
        timeout: 15000
      }
    );

    const data = hfResponse.data;
    if (!data.labels || !data.scores) {
      throw new Error('Invalid response from zero-shot classifier.');
    }

    const scoresMap = {};
    data.labels.forEach((label, idx) => {
      scoresMap[label] = data.scores[idx];
    });

    // Compute normalized 0-100 score
    const strong = scoresMap['strong match'] || 0;
    const partial = scoresMap['partial match'] || 0;
    const weak = scoresMap['weak match'] || 0;
    
    let rawScore = (strong * 100) + (partial * 50) + (weak * 0);
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    // 2. Deterministic Skill Gap Analysis
    const jdLower = description.toLowerCase();
    const resumeLower = resume.toLowerCase();

    const jobKeywords = SKILL_KEYWORDS.filter(skill => jdLower.includes(skill.toLowerCase()));
    const matchingSkills = jobKeywords.filter(skill => resumeLower.includes(skill.toLowerCase()));
    const missingSkills = jobKeywords.filter(skill => !resumeLower.includes(skill.toLowerCase()));

    // Generate verdict
    let verdict = '';
    if (score >= 70) {
      verdict = `Strong match! Perfect alignment for skills: ${matchingSkills.slice(0, 3).join(', ')}.`;
    } else if (score >= 40) {
      verdict = `Partial match. Good fit, but missing key skills: ${missingSkills.slice(0, 3).join(', ')}.`;
    } else {
      verdict = `Weak match. Missing critical skills: ${missingSkills.slice(0, 4).join(', ')}.`;
    }

    res.json({
      score,
      gapAnalysis: {
        matchingSkills,
        missingSkills,
        verdict
      }
    });
  } catch (err) {
    console.error('Resume matching failed:', err.message);
    res.status(500).json({ error: err.message || 'Resume matching failed.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Internly API server is running on port ${PORT}`);
});
