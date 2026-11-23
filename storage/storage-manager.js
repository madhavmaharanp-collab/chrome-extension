/**
 * Audio Master - Storage Manager
 * Handles safe persistence, schema migration, and cross-context synchronization
 * using chrome.storage.local (with graceful fallback for testing).
 */

import { DEFAULT_SETTINGS, BUILTIN_PRESETS, SECTION_DEFAULTS } from './default-settings.js';

const STORAGE_KEY = 'audio_master_settings_v1';

export class StorageManager {
  constructor() {
    this._listeners = new Set();
    this._cachedSettings = null;
    this._initPromise = null;
    this._writeQueue = Promise.resolve();
    this._setupStorageListener();
  }

  /**
   * Determine storage provider
   */
  get _hasChromeStorage() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  }

  /**
   * Listen to external changes (e.g. from popup, offscreen, mini-player)
   */
  _setupStorageListener() {
    if (this._hasChromeStorage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes[STORAGE_KEY]) {
          this._cachedSettings = this._deepMerge(DEFAULT_SETTINGS, changes[STORAGE_KEY].newValue || {});
          this._notifyListeners(this._cachedSettings);
        }
      });
    }
  }

  /**
   * Safe deep merge of loaded object against default settings schema
   */
  _deepMerge(target, source) {
    if (!source || typeof source !== 'object') return { ...target };
    const output = { ...target };

    for (const key of Object.keys(target)) {
      if (key in source) {
        if (
          target[key] !== null &&
          typeof target[key] === 'object' &&
          !Array.isArray(target[key])
        ) {
          output[key] = this._deepMerge(target[key], source[key]);
        } else if (Array.isArray(target[key]) && Array.isArray(source[key])) {
          output[key] = [...source[key]];
        } else if (typeof source[key] === typeof target[key]) {
          output[key] = source[key];
        }
      }
    }

    // Handle custom user collections (replace when explicitly passed)
    if ('customPresets' in source) {
      output.customPresets = { ...source.customPresets };
    }
    if ('perWebsiteProfiles' in source) {
      output.perWebsiteProfiles = { ...source.perWebsiteProfiles };
    }

    return output;
  }

  /**
   * Initialize and retrieve settings
   */
  async getSettings() {
    if (this._cachedSettings) {
      return JSON.parse(JSON.stringify(this._cachedSettings));
    }

    if (!this._initPromise) {
      this._initPromise = (async () => {
        let loaded = null;
        if (this._hasChromeStorage) {
          try {
            const data = await chrome.storage.local.get(STORAGE_KEY);
            loaded = data ? data[STORAGE_KEY] : null;
          } catch (err) {
            console.error('[AudioMaster Storage] Failed to load from chrome.storage:', err);
            throw err;
          }
        } else if (typeof localStorage !== 'undefined') {
          try {
            const item = localStorage.getItem(STORAGE_KEY);
            if (item) loaded = JSON.parse(item);
          } catch (err) {
            console.error('[AudioMaster Storage] Failed to load from localStorage:', err);
            throw err;
          }
        }

        this._cachedSettings = this._deepMerge(DEFAULT_SETTINGS, loaded || {});
        return JSON.parse(JSON.stringify(this._cachedSettings));
      })().catch(err => {
        this._initPromise = null;
        throw err;
      });
    }

    return this._initPromise;
  }

  async refreshSettings() {
    if (this._hasChromeStorage) {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      this._cachedSettings = this._deepMerge(DEFAULT_SETTINGS, data?.[STORAGE_KEY] || {});
    }
    return this.getSettings();
  }

  /**
   * Save partial or full settings
   */
  async updateSettings(partialUpdates) {
    const operation = this._writeQueue.then(async () => {
      const current = await this.refreshSettings();
      const updated = this._deepMerge(current, partialUpdates);
      if (this._hasChromeStorage) {
        await chrome.storage.local.set({ [STORAGE_KEY]: updated });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      this._cachedSettings = updated;
      this._notifyListeners(updated);
      return JSON.parse(JSON.stringify(updated));
    });
    this._writeQueue = operation.catch(() => {});
    return operation;
  }

  /**
   * Save a custom preset
   */
  async saveCustomPreset(presetName, presetData) {
    if (!presetName || !presetName.trim()) throw new Error('Preset name cannot be empty');
    const settings = await this.refreshSettings();
    const customPresets = { ...settings.customPresets, [presetName.trim()]: presetData };
    return this.updateSettings({ customPresets, selectedPreset: presetName.trim() });
  }

  /**
   * Delete a custom preset
   */
  async deleteCustomPreset(presetName) {
    const settings = await this.refreshSettings();
    const customPresets = { ...settings.customPresets };
    delete customPresets[presetName];
    return this.updateSettings({
      customPresets,
      selectedPreset: settings.selectedPreset === presetName ? 'Default' : settings.selectedPreset
    });
  }

  /**
   * Get settings for a specific domain (or default)
   */
  async getSettingsForDomain(domain) {
    const settings = await this.refreshSettings();
    if (domain && settings.perWebsiteProfiles && settings.perWebsiteProfiles[domain]) {
      return {
        ...settings,
        ...settings.perWebsiteProfiles[domain],
        _activeDomain: domain,
        _hasProfile: true
      };
    }
    return { ...settings, _activeDomain: domain, _hasProfile: false };
  }

  /**
   * Save settings for a specific domain
   */
  async saveDomainProfile(domain, profileData) {
    if (!domain) return;
    const settings = await this.refreshSettings();
    const perWebsiteProfiles = {
      ...settings.perWebsiteProfiles,
      [domain]: {
        ...profileData,
        lastUpdated: Date.now()
      }
    };
    return this.updateSettings({ perWebsiteProfiles });
  }

  /**
   * Reset a specific section to its default configuration without touching other sections
   */
  async resetSection(sectionKey) {
    const defaults = SECTION_DEFAULTS[sectionKey];
    if (!defaults) {
      throw new Error(`[AudioMaster Storage] Unknown section key: ${sectionKey}`);
    }
    return this.updateSettings(defaults);
  }

  /**
   * Reset all settings to factory defaults
   */
  async resetToDefaults() {
    const operation = this._writeQueue.then(async () => {
      const defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      if (this._hasChromeStorage) {
        await chrome.storage.local.set({ [STORAGE_KEY]: defaults });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      }
      this._cachedSettings = defaults;
      this._notifyListeners(defaults);
      return JSON.parse(JSON.stringify(defaults));
    });
    this._writeQueue = operation.catch(() => {});
    return operation;
  }

  /**
   * Subscribe to settings updates
   */
  onChanged(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  _notifyListeners(settings) {
    for (const listener of this._listeners) {
      try {
        listener(settings);
      } catch (err) {
        console.error('[AudioMaster Storage] Listener error:', err);
      }
    }
  }
}

export const storageManager = new StorageManager();
