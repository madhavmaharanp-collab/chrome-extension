/**
 * Audio Master - Spotify Mode / Premium Sound Engine
 * Provides mastering-grade loudness normalization, peak protection,
 * and Mid-Side spatial stereo field expansion without phase cancellation.
 */

import { SPOTIFY_PROFILES } from '../storage/default-settings.js';

export class SpotifySoundEngine {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.inputNode = this.ctx.createGain();
    this.outputNode = this.ctx.createGain();

    this.isEnabled = false;
    this.currentProfile = 'studio';
    this.stereoWidth = 30; // 0 to 100%

    // Dynamics Compressor for transparent loudness normalization
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 3.0;
    this.compressor.attack.value = 0.030; // 30ms smooth
    this.compressor.release.value = 0.200; // 200ms natural release

    // Mid-Side Stereo Widener Nodes
    this.splitter = this.ctx.createChannelSplitter(2);
    this.merger = this.ctx.createChannelMerger(2);

    this.sideGain = this.ctx.createGain();
    this.midGain = this.ctx.createGain();

    this.dryGain = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();

    this._buildGraph();
    this.setProfile('studio');
    this.setEnabled(false);
  }

  _buildGraph() {
    // Dry path (bypass)
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Wet path: Input -> Compressor -> Mid/Side widener -> Wet Gain -> Output
    this.inputNode.connect(this.compressor);

    // Split L and R
    this.compressor.connect(this.splitter);

    // Mid = (L + R) / 2
    // Side = (L - R) / 2
    const midSum = this.ctx.createGain();
    midSum.gain.value = 0.5;
    const sideDiff = this.ctx.createGain();
    sideDiff.gain.value = 0.5;

    const inverter = this.ctx.createGain();
    inverter.gain.value = -1.0;

    // L -> Mid & Side
    this.splitter.connect(midSum, 0);
    this.splitter.connect(sideDiff, 0);

    // R -> Mid & -Side
    this.splitter.connect(midSum, 1);
    this.splitter.connect(inverter, 1);
    inverter.connect(sideDiff);

    midSum.connect(this.midGain);
    sideDiff.connect(this.sideGain);

    // Reconstruct L = Mid + Side, R = Mid - Side
    const sideInvert = this.ctx.createGain();
    sideInvert.gain.value = -1.0;
    this.sideGain.connect(sideInvert);

    // Output L
    this.midGain.connect(this.merger, 0, 0);
    this.sideGain.connect(this.merger, 0, 0);

    // Output R
    this.midGain.connect(this.merger, 0, 1);
    sideInvert.connect(this.merger, 0, 1);

    this.merger.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  setProfile(profileKey) {
    const prof = SPOTIFY_PROFILES[profileKey] || SPOTIFY_PROFILES.studio;
    this.currentProfile = profileKey;

    const now = this.ctx.currentTime;
    // Set dynamic normalization threshold & ratio
    this.compressor.threshold.setTargetAtTime(prof.compThreshold, now, 0.05);
    this.compressor.ratio.setTargetAtTime(prof.compRatio, now, 0.05);

    // Set stereo width
    this.setStereoWidth(prof.stereoWidth);
  }

  setStereoWidth(widthPct) {
    this.stereoWidth = Math.max(0, Math.min(100, widthPct));
    // Factor: 0% width = 1.0 (standard), 100% width = 1.6x side boost
    const sideFactor = 1.0 + (this.stereoWidth / 100) * 0.45;
    const midFactor = 1.0 - (this.stereoWidth / 100) * 0.08;

    const now = this.ctx.currentTime;
    this.sideGain.gain.setTargetAtTime(sideFactor, now, 0.05);
    this.midGain.gain.setTargetAtTime(midFactor, now, 0.05);
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    const now = this.ctx.currentTime;
    if (enabled) {
      this.dryGain.gain.setTargetAtTime(0.0, now, 0.03);
      this.wetGain.gain.setTargetAtTime(1.0, now, 0.03);
    } else {
      this.dryGain.gain.setTargetAtTime(1.0, now, 0.03);
      this.wetGain.gain.setTargetAtTime(0.0, now, 0.03);
    }
  }
}
