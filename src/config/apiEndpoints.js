// src/config/apiEndpoints.js

// Safe environment variable retrieval that works in both Node.js and Vite browser contexts
const getEnvVar = (name, fallback = '') => {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[`VITE_${name}`] || import.meta.env[name] || fallback;
  }
  return fallback;
};

export const API_ENDPOINTS = {
  // Spicerack Public Decklist Database API
  SPICERACK: {
    EXPORT_DECKLISTS: 'https://api.spicerack.gg/api/export-decklists/',
    API_KEY: getEnvVar('SPICERACK_API_KEY')
  },
  
  // Deterministic Hypergeometric Validation
  VALIDATION: {
    API_ALG: getEnvVar('VALIDATION_API_URL', 'https://api.spicerack.gg/api/alg')
  },

  // Scryfall Card Database
  SCRYFALL: {
    SEARCH: 'https://api.scryfall.com/cards/search',
    NAMED: 'https://api.scryfall.com/cards/named',
    IMAGE_FALLBACK: 'https://cards.scryfall.io/normal/front/1/2/12f2c1ff-b8dc-4c49-be72-132d78dfbc49.jpg'
  },

  // LLM APIs
  AI: {
    OPENAI: 'https://api.openai.com/v1/chat/completions',
    OPENROUTER: 'https://openrouter.ai/api/v1/chat/completions',
    ANTHROPIC: 'https://api.anthropic.com/v1/messages',
    GEMINI: 'https://generativelanguage.googleapis.com/v1beta'
  },

  // Apify Scraper
  APIFY: {
    MTGTOP8_SCRAPER: 'https://api.apify.com/v2/acts/jungle_synthesizer~mtgtop8-magic-tournament-archive-scraper'
  }
};
