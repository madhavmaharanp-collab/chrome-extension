/**
 * Audio Master - Mini Player Controller
 * Seamless two-way state binding with the unified audio engine.
 */

import { storageManager } from '../storage/storage-manager.js';

class MiniPlayerController {
  constructor() {
    this.dom = {
      volumeSlider: document.getElementById('miniVolumeSlider'),
      volumeVal: document.getElementById('miniVolumeVal'),
      muteBtn: document.getElementById('miniMuteBtn'),
      expandBtn: document.getElementById('miniExpandBtn'),
      statusLabel: document.getElementById('miniStatusLabel')
    };
    this.isMuted = false;
    this.statusRequest = 0;
  }

  async init() {
    const settings = await storageManager.getSettings();
    this.syncUI(settings);

    // Live update when settings change from main popup or engine
    storageManager.onChanged((updated) => this.syncUI(updated));

    this.setupEvents();
  }

  syncUI(settings) {
    if (!settings) return;

    // Apply theme
    const currentTheme = settings.general?.theme || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);

    const isMasterOff = settings.processingEnabled === false;
    const vol = settings.masterVolume ?? 75;
    this.isMuted = isMasterOff || !!settings.masterMuted;

    this.dom.volumeSlider.value = this.isMuted ? 0 : vol;
    this.dom.volumeVal.textContent = isMasterOff ? 'OFF' : this.isMuted ? 'MUTED' : `${vol}%`;
    const statusRequest = ++this.statusRequest;
    this.dom.statusLabel.textContent = isMasterOff ? 'Disabled' : 'Checking';
    this.dom.statusLabel.style.color = 'var(--text-dim)';
    if (!isMasterOff && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'GET_AUDIO_STATUS' }).then(status => {
        if (statusRequest !== this.statusRequest) return;
        if (!status?.success) throw new Error(status?.error || 'No response from service worker');
        const active = status.isCapturing && status.contextState === 'running';
        this.dom.statusLabel.textContent = active ? 'Active' : 'Not capturing';
        this.dom.statusLabel.style.color = active ? '#10b981' : 'var(--text-dim)';
      }).catch(err => {
        if (statusRequest !== this.statusRequest) return;
        console.error('[Audio Master Mini Player] Status failed:', err);
        this.dom.statusLabel.textContent = 'Audio error';
        this.dom.statusLabel.title = err.message;
      });
    }

    const pct = this.isMuted ? 0 : vol;
    this.dom.volumeSlider.style.setProperty('--fill-pct', `${pct}%`);
  }

  setupEvents() {
    this.dom.volumeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.dom.volumeVal.textContent = `${val}%`;
      this.dom.volumeSlider.style.setProperty('--fill-pct', `${val}%`);

      this.updateAudio({ masterVolume: val, masterMuted: false });
    });

    this.dom.muteBtn.addEventListener('click', async () => {
      this.isMuted = !this.isMuted;
      await this.updateAudio({ masterMuted: this.isMuted });
      this.dom.volumeVal.textContent = this.isMuted ? 'Muted' : `${this.dom.volumeSlider.value}%`;
    });

    this.dom.expandBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.action && chrome.action.openPopup) {
        chrome.action.openPopup().catch(() => {
          window.open(chrome.runtime.getURL('popup/popup.html'), '_blank', 'width=460,height=620');
        });
      } else {
        window.open('../popup/popup.html', '_blank', 'width=460,height=620');
      }
    });
  }

  async updateAudio(params) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const response = await chrome.runtime.sendMessage({ type: 'AUDIO_PARAM_UPDATE', params });
        if (!response || !response.success) throw new Error(response?.error || 'No response from audio engine');
      } else {
        await storageManager.updateSettings(params);
      }
    } catch (err) {
      console.error('[Audio Master Mini Player] Audio update failed:', err);
      this.dom.statusLabel.textContent = 'Audio error';
      this.dom.statusLabel.title = err.message;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const mini = new MiniPlayerController();
  mini.init();
});
