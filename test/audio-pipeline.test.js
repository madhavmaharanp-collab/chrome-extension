import test from 'node:test';
import assert from 'node:assert/strict';
import { EQ_FREQUENCIES, AUDIO_CONSTRAINTS } from '../engine/audio-constants.js';
import { SPOTIFY_PROFILES } from '../storage/default-settings.js';
import { AudioSeparationStudioEngine } from '../engine/ai-separation-engine.js';
import { EqualizerProcessor } from '../engine/equalizer-node.js';
import { AudioMasterPipeline } from '../engine/audio-pipeline.js';

// Mock Web Audio Context for Node test runner
class MockAudioParam {
  constructor(val = 0) {
    this.value = val;
  }
  setTargetAtTime(val) {
    this.value = val;
  }
}

class MockAudioNode {
  constructor() {
    this.gain = new MockAudioParam(1);
    this.pan = new MockAudioParam(0);
    this.frequency = new MockAudioParam(1000);
    this.Q = new MockAudioParam(1);
    this.threshold = new MockAudioParam(-14);
    this.knee = new MockAudioParam(10);
    this.ratio = new MockAudioParam(3);
    this.attack = new MockAudioParam(0.01);
    this.release = new MockAudioParam(0.1);
  }
  connect() {}
  disconnect() {}
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = new MockAudioNode();
  }
  createGain() { return new MockAudioNode(); }
  createBiquadFilter() { return new MockAudioNode(); }
  createStereoPanner() { return new MockAudioNode(); }
  createDynamicsCompressor() { return new MockAudioNode(); }
  createWaveShaper() { return new MockAudioNode(); }
  createChannelSplitter() { return new MockAudioNode(); }
  createChannelMerger() { return new MockAudioNode(); }
  createAnalyser() {
    const node = new MockAudioNode();
    node.frequencyBinCount = 32;
    node.getByteFrequencyData = (arr) => arr.fill(128);
    return node;
  }
}

test('AudioConstants: Verified 10 EQ bands specifications', () => {
  assert.equal(EQ_FREQUENCIES.length, 10);
  assert.equal(EQ_FREQUENCIES[0].freq, 60);
  assert.equal(EQ_FREQUENCIES[4].freq, 1000);
  assert.equal(EQ_FREQUENCIES[9].freq, 16000);
});

test('Spotify Profiles: All 4 profiles are valid and have balanced configurations', () => {
  const expected = ['studio', 'bass', 'immersive', 'clear'];
  expected.forEach(key => {
    const prof = SPOTIFY_PROFILES[key];
    assert.ok(prof, `Profile ${key} should exist`);
    assert.equal(prof.eqBands.length, 10);
    assert.ok(prof.compThreshold <= 0);
    assert.ok(prof.compRatio >= 1);
  });
});

test('Separation Studio: AI Model Evaluation report is structured and factual', () => {
  const report = AudioSeparationStudioEngine.getAiEvaluationReport();
  assert.ok(report.modelOptions.includes('Demucs v4 (HTDemucs)'));
  assert.ok(report.clientSideBrowserViability.recommendation.includes('Hybrid'));
});

test('Equalizer: disabling and re-enabling preserves stored band gains', () => {
  const ctx = new MockAudioContext();
  const eq = new EqualizerProcessor(ctx);
  eq.setAllBands([3, -2, 4, 0, 1, 2, -1, 5, 0, -3]);
  assert.deepEqual(eq.filters.map(filter => filter.gain.value), [3, -2, 4, 0, 1, 2, -1, 5, 0, -3]);

  eq.setEnabled(false);
  assert.deepEqual(eq.filters.map(filter => filter.gain.value), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  eq.setEnabled(true);
  assert.deepEqual(eq.filters.map(filter => filter.gain.value), [3, -2, 4, 0, 1, 2, -1, 5, 0, -3]);
});

test('Separation Studio: vocal and music paths honor volumes and enable flags', () => {
  const ctx = new MockAudioContext();
  const separation = new AudioSeparationStudioEngine(ctx);

  separation.setEnabled(true);
  separation.setSeparationMode('vocals-only');
  separation.setVocalVolume(80);
  separation.setVocalEnabled(true);
  assert.equal(separation.vocalGainNode.gain.value > 0, true);

  separation.setVocalEnabled(false);
  assert.equal(separation.vocalGainNode.gain.value, 0);

  separation.setSeparationMode('music-only');
  separation.setMusicVolume(120);
  separation.setMusicEnabled(true);
  assert.equal(separation.musicGainNode.gain.value > 0, true);

  separation.setMusicEnabled(false);
  assert.equal(separation.musicGainNode.gain.value, 0);
});

test('Audio pipeline: partial updates preserve unrelated settings', () => {
  const ctx = new MockAudioContext();
  const pipeline = new AudioMasterPipeline(ctx);
  pipeline.applyAllSettings({
    processingEnabled: true,
    masterVolume: 75,
    balance: 0,
    bassBoost: 65,
    vocalBoost: 70,
    trebleBoost: 60,
    volumeBooster: 120,
    equalizerBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  });

  pipeline.applyAllSettings({ masterVolume: 42 });
  assert.equal(pipeline.masterGain.gain.value, 0.42);
  assert.equal(pipeline.balance.pannerNode.pan.value, 0);
  assert.equal(pipeline.bassFilter.gain.value, (65 / 100) * 12);
  assert.equal(pipeline.trebleFilter.gain.value, (60 / 100) * 12);
});

test('Audio pipeline: processing OFF mutes the output but remains reversible', () => {
  const ctx = new MockAudioContext();
  const pipeline = new AudioMasterPipeline(ctx);
  pipeline.applyAllSettings({
    processingEnabled: true,
    masterVolume: 80,
    balance: 0,
    bassBoost: 65,
    vocalBoost: 70,
    trebleBoost: 60,
    volumeBooster: 120,
    equalizerBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  });
  assert.equal(pipeline.masterGain.gain.value, 0.8);

  pipeline.applyAllSettings({ processingEnabled: false });
  assert.equal(pipeline.masterGain.gain.value, 0);

  pipeline.applyAllSettings({ processingEnabled: true });
  assert.equal(pipeline.masterGain.gain.value, 0.8);
});

test('Audio pipeline: active processing nodes and Spotify profiles receive updates', () => {
  const pipeline = new AudioMasterPipeline(new MockAudioContext());
  pipeline.applyAllSettings({
    processingEnabled: true, masterVolume: 40, balance: -50,
    bassBoost: 50, vocalBoost: 20, trebleBoost: 25,
    equalizerEnabled: true, equalizerBands: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    separationStudio: { enabled: true, mode: 'custom-mix', vocalVolume: 60, musicVolume: 90 }
  });
  assert.equal(pipeline.masterGain.gain.value, 0.4);
  assert.equal(pipeline.balance.pannerNode.pan.value, -0.5);
  assert.equal(pipeline.bassFilter.gain.value, 6);
  assert.equal(pipeline.vocalFilter.gain.value, 2);
  assert.equal(pipeline.trebleFilter.gain.value, 3);
  assert.equal(pipeline.equalizer.filters[2].gain.value, 3);
  assert.equal(pipeline.separationEngine.vocalGainNode.gain.value, 0.6);
  assert.equal(pipeline.separationEngine.musicGainNode.gain.value, 0.9);
  pipeline.setSourceMuted(true);
  assert.equal(pipeline.inputGain.gain.value, 0);
  pipeline.setSourceMuted(false);
  assert.equal(pipeline.inputGain.gain.value, 1);

  for (const [key, profile] of Object.entries(SPOTIFY_PROFILES)) {
    pipeline.applyAllSettings({ spotifyMode: { enabled: true, profile: key } });
    assert.equal(pipeline.spotifyEngine.currentProfile, key);
    assert.equal(pipeline.spotifyEngine.compressor.threshold.value, profile.compThreshold);
    assert.equal(pipeline.spotifyEngine.stereoWidth, profile.stereoWidth);
    assert.equal(pipeline.spotifyEngine.wetGain.gain.value, 1);
  }
  pipeline.applyAllSettings({ spotifyMode: { enabled: false } });
  assert.equal(pipeline.spotifyEngine.dryGain.gain.value, 1);
  assert.equal(pipeline.spotifyEngine.wetGain.gain.value, 0);
  pipeline.applyAllSettings({ spotifyMode: { enabled: true } });
  assert.equal(pipeline.spotifyEngine.currentProfile, 'clear');
  assert.equal(pipeline.spotifyEngine.wetGain.gain.value, 1);
});
