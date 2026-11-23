/**
 * Audio Master - Unified Audio Pipeline
 * Orchestrates all Web Audio nodes into a single, cohesive processing graph.
 */

import { EqualizerProcessor } from './equalizer-node.js';
import { BoosterProcessor } from './booster-node.js';
import { BalanceProcessor } from './balance-node.js';
import { SpotifySoundEngine } from './spotify-engine.js';
import { AudioSeparationStudioEngine } from './ai-separation-engine.js';

export class AudioMasterPipeline {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.sourceNode = null;

    // 1. Input Gain
    this.inputGain = this.ctx.createGain();

    // 2. Vocal & Music Separation Studio
    this.separationEngine = new AudioSeparationStudioEngine(this.ctx);

    // 3. Spotify Mode / Premium Sound Engine
    this.spotifyEngine = new SpotifySoundEngine(this.ctx);

    // 4. 10-Band Equalizer
    this.equalizer = new EqualizerProcessor(this.ctx);

    // 5. Bass Boost Filter (LowShelf @ 120Hz)
    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 120;
    this.bassFilter.gain.value = 0;

    // 6. Vocal Boost Filter (Peaking @ 1800Hz)
    this.vocalFilter = this.ctx.createBiquadFilter();
    this.vocalFilter.type = 'peaking';
    this.vocalFilter.frequency.value = 1800;
    this.vocalFilter.Q.value = 1.0;
    this.vocalFilter.gain.value = 0;

    // 7. Treble Boost Filter (HighShelf @ 8000Hz)
    this.trebleFilter = this.ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 8000;
    this.trebleFilter.gain.value = 0;

    // 8. Stereo Balance (Left / Right)
    this.balance = new BalanceProcessor(this.ctx);

    // 9. Real Volume Booster (100% - 200% with soft limiter)
    this.booster = new BoosterProcessor(this.ctx);

    // 10. Master Volume & Mute
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.75;

    // 11. Analyser Node for Live Visualizer
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.8;

    // Wire up the processing chain
    this._wireGraph();
  }

  _wireGraph() {
    this.inputGain.connect(this.separationEngine.inputNode);
    this.separationEngine.outputNode.connect(this.spotifyEngine.inputNode);
    this.spotifyEngine.outputNode.connect(this.equalizer.inputNode);
    this.equalizer.outputNode.connect(this.bassFilter);
    this.bassFilter.connect(this.vocalFilter);
    this.vocalFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.balance.inputNode);
    this.balance.outputNode.connect(this.booster.inputNode);
    this.booster.outputNode.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  attachStream(mediaStream) {
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (e) {}
    }
    this.sourceNode = this.ctx.createMediaStreamSource(mediaStream);
    this.sourceNode.connect(this.inputGain);
  }

  detachStream() {
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (e) {}
      this.sourceNode = null;
    }
  }

  setSourceMuted(muted) {
    this.inputGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  applyAllSettings(settings) {
    if (!settings) return;
    const now = this.ctx.currentTime;

    if (!this._settings) {
      this._settings = {};
    }
    this._settings = this._mergeSettings(this._settings, settings);
    settings = this._settings;

    const isGlobalOff = settings.processingEnabled === false;

    // Master volume (0 - 100)
    // When Global Master Switch is turned OFF, all audio stops / is muted consistently.
    // When turned ON, individual settings behave according to their stored configurations.
    const isMuted = isGlobalOff || settings.masterMuted || settings.masterVolumeEnabled === false;
    const vol = isMuted ? 0 : (settings.masterVolume ?? 75) / 100;
    this.masterGain.gain.setTargetAtTime(vol, now, 0.02);

    // Balance (-100 to +100)
    this.balance.setEnabled(!isGlobalOff && settings.balanceEnabled !== false);
    this.balance.setBalance(settings.balance || 0);

    // Bass Boost (0 - 100 -> 0dB to +12dB)
    const bassGain = !isGlobalOff && settings.bassBoostEnabled !== false ? ((settings.bassBoost || 0) / 100) * 12 : 0;
    this.bassFilter.gain.setTargetAtTime(bassGain, now, 0.02);

    // Vocal Boost (0 - 100 -> 0dB to +10dB)
    const vocalGain = !isGlobalOff && settings.vocalBoostEnabled !== false ? ((settings.vocalBoost || 0) / 100) * 10 : 0;
    this.vocalFilter.gain.setTargetAtTime(vocalGain, now, 0.02);

    // Treble Boost (0 - 100 -> 0dB to +12dB)
    const trebleGain = !isGlobalOff && settings.trebleBoostEnabled !== false ? ((settings.trebleBoost || 0) / 100) * 12 : 0;
    this.trebleFilter.gain.setTargetAtTime(trebleGain, now, 0.02);

    // Real Volume Booster (100 - 200%)
    this.booster.setEnabled(!isGlobalOff && settings.volumeBoosterEnabled !== false);
    this.booster.setBoostPercentage(settings.volumeBooster || 120);

    // Equalizer (10 Bands)
    this.equalizer.setEnabled(!isGlobalOff && settings.equalizerEnabled !== false);
    if (Array.isArray(settings.equalizerBands)) {
      this.equalizer.setAllBands(settings.equalizerBands);
    }

    // Spotify Mode
    if (settings.spotifyMode) {
      this.spotifyEngine.setProfile(settings.spotifyMode.profile || 'studio');
      this.spotifyEngine.setEnabled(!isGlobalOff && !!settings.spotifyMode.enabled);
    }

    // Separation Studio
    if (settings.separationStudio) {
      this.separationEngine.setEnabled(!isGlobalOff && !!settings.separationStudio.enabled);
      this.separationEngine.setSeparationMode(settings.separationStudio.mode || 'both');
      this.separationEngine.setVocalVolume(settings.separationStudio.vocalVolume ?? 75);
      this.separationEngine.setMusicVolume(settings.separationStudio.musicVolume ?? 35);
      this.separationEngine.setVocalEnabled(settings.separationStudio.vocalEnabled !== false);
      this.separationEngine.setMusicEnabled(settings.separationStudio.musicEnabled !== false);
    }
  }

  _mergeSettings(current, partial) {
    const merged = JSON.parse(JSON.stringify(current || {}));
    const mergeObject = (base, updates) => {
      Object.keys(updates || {}).forEach((key) => {
        if (
          updates[key] !== null &&
          typeof updates[key] === 'object' &&
          !Array.isArray(updates[key]) &&
          base[key] !== null &&
          typeof base[key] === 'object' &&
          !Array.isArray(base[key])
        ) {
          base[key] = mergeObject(base[key], updates[key]);
        } else {
          base[key] = Array.isArray(updates[key])
            ? [...updates[key]]
            : (typeof updates[key] === 'undefined'
              ? undefined
              : JSON.parse(JSON.stringify(updates[key])));
        }
      });
      return base;
    };
    return mergeObject(merged, partial);
  }

  getFrequencyData() {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  dispose() {
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (e) {}
    }
    try { this.inputGain.disconnect(); } catch (e) {}
    try { this.ctx.close(); } catch (e) {}
  }
}
