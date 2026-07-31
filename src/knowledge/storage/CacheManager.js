/**
 * CacheManager.js
 * File-based Cache Manager under data/cache/ with TTL support.
 */

import fs from 'fs';
import path from 'path';
import { ConfigManager } from '../../../config/ConfigManager.js';

export class CacheManager {
  constructor() {
    const config = ConfigManager.getInstance();
    const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '.';
    this.cacheDir = path.resolve(cwd, config.cachePath);

    if (fs.existsSync && !fs.existsSync(this.cacheDir)) {
      try {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      } catch (e) {}
    }
  }

  getFilePath(key) {
    const safeKey = key.replace(/[^a-z0-9_-]/gi, '_');
    return path.join(this.cacheDir, `${safeKey}.json`);
  }

  set(key, data, ttlMs = 86400000) { // Default 24 hours
    const payload = {
      key,
      timestamp: Date.now(),
      ttlMs,
      data
    };
    try {
      fs.writeFileSync(this.getFilePath(key), JSON.stringify(payload, null, 2), 'utf8');
    } catch (e) {
      console.warn(`[CacheManager] Could not write cache key ${key}:`, e.message);
    }
  }

  get(key) {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) return null;

    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Date.now() - content.timestamp > content.ttlMs) {
        fs.unlinkSync(filePath); // Expired
        return null;
      }
      return content.data;
    } catch (e) {
      return null;
    }
  }

  isValid(key) {
    return this.get(key) !== null;
  }
}
