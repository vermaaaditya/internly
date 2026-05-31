// Load environment variables from .env
require('dotenv').config();

const config = {
  // Array of keywords to search/filter in internship titles and requirements
  keywords: ["React", "Python", "Machine Learning", "Flask", "Node.js"],

  // Minimum required stipend in INR per month
  minStipend: parseInt(process.env.MIN_STIPEND || "5000", 10),

  // Set to true to filter for work-from-home / remote opportunities only
  remoteOnly: (process.env.REMOTE_ONLY !== "false"),

  // Target tech domains/tags
  domains: ["AI", "ML", "web", "fullstack", "software"],

  // Maximum cumulative scraped/stored results per cycle
  maxResults: parseInt(process.env.MAX_RESULTS || "50", 10),

  // Supabase Database Sync configuration
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseKey: process.env.SUPABASE_KEY || ""
};

module.exports = config;
