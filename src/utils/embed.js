const axios = require('axios');
const logger = require('./logger');

// Load env vars if run directly
require('dotenv').config();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const EMBED_MODEL_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

/**
 * Generates a 384-dimensional embedding for a given text using HuggingFace Inference API.
 * @param {string} text - The input text to embed.
 * @returns {Promise<number[]>} Array of 384 floats representing the embedding, or null.
 */
async function generateEmbedding(text) {
  if (!HUGGINGFACE_API_KEY) {
    logger.warn('HUGGINGFACE_API_KEY is not defined. Skipping embedding generation.');
    return null;
  }

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return null;
  }

  // Pre-process the input string (clean newlines, trimmings)
  const cleanedText = text.replace(/\s+/g, ' ').trim();

  try {
    const response = await axios.post(
      EMBED_MODEL_URL,
      { inputs: cleanedText },
      {
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    let embedding = response.data;
    if (Array.isArray(embedding)) {
      if (Array.isArray(embedding[0])) {
        embedding = embedding[0];
      }
      if (embedding.length === 384) {
        return embedding;
      }
    }

    logger.error('Invalid embedding response structure from HuggingFace:', response.data);
    return null;
  } catch (err) {
    const status = err.response ? err.response.status : 'NETWORK_ERROR';
    logger.error(`Failed to generate embedding from HuggingFace [${status}]: ${err.message}`);
    return null;
  }
}

module.exports = { generateEmbedding };
