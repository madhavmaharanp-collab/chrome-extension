/**
 * Audio Master - 10-Band Equalizer Processor
 * Connects 10 calibrated BiquadFilterNodes in series with individual gain & bypass control.
 */

import { EQ_FREQUENCIES, AUDIO_CONSTRAINTS } from './audio-constants.js';

export class EqualizerProcessor {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.filters = [];
    this._targetGains = [];
    this.inputNode = this.ctx.createGain();
    this.outputNode = this.ctx.createGain();
    this.isEnabled = true;

    this._buildFilterGraph();
  }

  _buildFilterGraph() {
    let prevNode = this.inputNode;

    EQ_FREQUENCIES.forEach((spec, idx) => {
      const filter = this.ctx.createBiquadFilter();
      filter.type = spec.type;
      filter.frequency.value = spec.freq;
      filter.Q.value = spec.q;
      filter.gain.value = 0;

      prevNode.connect(filter);
      prevNode = filter;
      this.filters.push(filter);
    });

    prevNode.connect(this.outputNode);
  }

  setBandGain(index, gainDb) {
    if (index >= 0 && index < this.filters.length) {
      const clampedGain = Math.max(
        AUDIO_CONSTRAINTS.MIN_GAIN_DB,
        Math.min(AUDIO_CONSTRAINTS.MAX_GAIN_DB, gainDb)
      );
      this._targetGains[index] = clampedGain;
      // Smooth exponential/linear ramp to avoid clicks
      const now = this.ctx.currentTime;
      this.filters[index].gain.setTargetAtTime(
        this.isEnabled ? clampedGain : 0,
        now,
        0.015
      );
    }
  }

  setAllBands(gainArray) {
    if (!Array.isArray(gainArray)) return;
    gainArray.forEach((gain, idx) => {
      this.setBandGain(idx, gain);
    });
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    const now = this.ctx.currentTime;
    this.filters.forEach((filter, index) => {
      filter.gain.setTargetAtTime(enabled ? (this._targetGains[index] ?? 0) : 0, now, 0.02);
    });
  }

  reset() {
    const now = this.ctx.currentTime;
    this.filters.forEach((filter, index) => {
      this._targetGains[index] = 0;
      filter.gain.setTargetAtTime(0, now, 0.02);
    });
  }
}
