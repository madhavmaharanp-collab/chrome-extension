/**
 * Audio Master - Real Volume Booster & Anti-Clipping Limiter
 * Amplifies audio up to 200% (6dB) while applying brickwall dynamics limiting
 * and smooth tanh soft-clipping to prevent digital distortion.
 */

export class BoosterProcessor {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.inputNode = this.ctx.createGain();
    this.boostGainNode = this.ctx.createGain();
    this.compressorLimiter = this.ctx.createDynamicsCompressor();
    this.waveShaperNode = this.ctx.createWaveShaper();
    this.outputNode = this.ctx.createGain();

    this.isEnabled = true;
    this.boostPercentage = 120; // 100% - 200%

    this._configureLimiter();
    this._configureSoftCurve();
    this._connectGraph();
  }

  _configureLimiter() {
    // Transparent peak protection limiter
    this.compressorLimiter.threshold.value = -3.0; // dBFS
    this.compressorLimiter.knee.value = 6.0;       // Soft knee
    this.compressorLimiter.ratio.value = 16.0;     // Strong brickwall protection
    this.compressorLimiter.attack.value = 0.003;   // 3ms ultra-fast transient catch
    this.compressorLimiter.release.value = 0.150;  // 150ms transparent release
  }

  _configureSoftCurve() {
    // Hyperbolic tangent (tanh) soft-clipping table: smooths peaks rather than harsh clipping
    const nSamples = 1024;
    const curve = new Float32Array(nSamples);
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1; // Range: -1.0 to +1.0
      // Smooth sigmoid / tanh saturation
      curve[i] = Math.tanh(x * 1.2) / Math.tanh(1.2);
    }
    this.waveShaperNode.curve = curve;
    this.waveShaperNode.oversample = '2x';
  }

  _connectGraph() {
    this.inputNode.connect(this.boostGainNode);
    this.boostGainNode.connect(this.compressorLimiter);
    this.compressorLimiter.connect(this.waveShaperNode);
    this.waveShaperNode.connect(this.outputNode);
  }

  setBoostPercentage(pct) {
    this.boostPercentage = Math.max(100, Math.min(200, pct));
    const now = this.ctx.currentTime;
    if (!this.isEnabled) {
      this.boostGainNode.gain.setTargetAtTime(1.0, now, 0.02);
      return;
    }

    // 100% -> 1.0x (0dB), 200% -> 2.0x (+6.02dB)
    const linearGain = this.boostPercentage / 100;
    this.boostGainNode.gain.setTargetAtTime(linearGain, now, 0.02);
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    this.setBoostPercentage(this.boostPercentage);
  }
}
