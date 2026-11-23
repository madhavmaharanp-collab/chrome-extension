/**
 * Audio Master - Stereo Balance Processor
 * Uses StereoPannerNode with smooth ramping between Left (-1.0) and Right (+1.0).
 */

export class BalanceProcessor {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.inputNode = this.ctx.createGain();
    this.outputNode = this.ctx.createGain();
    this.pannerNode = null;
    this.isEnabled = true;
    this.panValue = 0; // -100 (L) to +100 (R)

    this._initPanner();
  }

  _initPanner() {
    if (typeof this.ctx.createStereoPanner === 'function') {
      this.pannerNode = this.ctx.createStereoPanner();
      this.inputNode.connect(this.pannerNode);
      this.pannerNode.connect(this.outputNode);
    } else {
      // Direct pass-through if StereoPanner is unavailable
      this.inputNode.connect(this.outputNode);
    }
  }

  setBalance(balanceValue) {
    // balanceValue: -100 to +100
    this.panValue = Math.max(-100, Math.min(100, balanceValue));
    if (!this.pannerNode) return;

    const normalizedPan = this.isEnabled ? (this.panValue / 100) : 0;
    const now = this.ctx.currentTime;
    this.pannerNode.pan.setTargetAtTime(normalizedPan, now, 0.02);
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    this.setBalance(this.panValue);
  }

  resetCenter() {
    this.setBalance(0);
  }
}
