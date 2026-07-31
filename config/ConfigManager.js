/**
 * ConfigManager.js
 * Centralized Configuration System reading process.env / .env.
 */

import fs from 'fs';
import path from 'path';

export class ConfigManager {
  static instance = null;

  constructor() {
    this.env = {
      SCRYFALL_BASE: 'https://api.scryfall.com',
      APIFY_TOKEN: '',
      MTGTOP8_URL: 'https://www.mtgtop8.com',
      SPICERACK_URL: 'https://spicerack.gg',
      DATABASE_PATH: 'data/knowledge/knowledge.db',
      CACHE_PATH: 'data/cache/'
    };
    this.loadEnvFile();
  }

  static getInstance() {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  loadEnvFile() {
    try {
      if (typeof process === 'undefined' || typeof process.cwd !== 'function') return;
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync && fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key) {
              const val = valueParts.join('=').trim();
              this.env[key.trim()] = val;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[ConfigManager] Could not read .env file:', err.message);
    }
  }

  get(key, defaultValue = '') {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    return this.env[key] !== undefined ? this.env[key] : defaultValue;
  }

  get scryfallBase() { return this.get('SCRYFALL_BASE', 'https://api.scryfall.com'); }
  get apifyToken() { return this.get('APIFY_TOKEN', ''); }
  get mtgTop8Url() { return this.get('MTGTOP8_URL', 'https://www.mtgtop8.com'); }
  get spiceRackUrl() { return this.get('SPICERACK_URL', 'https://spicerack.gg'); }
  get databasePath() { return this.get('DATABASE_PATH', 'data/knowledge/knowledge.db'); }
  get cachePath() { return this.get('CACHE_PATH', 'data/cache/'); }
}
