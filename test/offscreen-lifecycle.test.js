import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../storage/default-settings.js';

class Param {
  constructor(value = 0) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
}

class Node {
  constructor() {
    for (const key of ['gain', 'pan', 'frequency', 'Q', 'threshold', 'knee', 'ratio', 'attack', 'release']) {
      this[key] = new Param();
    }
  }
  connect() {}
  disconnect() { this.disconnected = true; }
}

class Context {
  static instances = [];
  static resumeGate = null;
  static resumeStarted = false;
  constructor() {
    this.state = 'suspended';
    this.currentTime = 0;
    this.destination = new Node();
    Context.instances.push(this);
  }
  createGain() { return new Node(); }
  createBiquadFilter() { return new Node(); }
  createStereoPanner() { return new Node(); }
  createDynamicsCompressor() { return new Node(); }
  createWaveShaper() { return new Node(); }
  createChannelSplitter() { return new Node(); }
  createChannelMerger() { return new Node(); }
  createAnalyser() { return new Node(); }
  createMediaStreamSource() { this.source = new Node(); return this.source; }
  async resume() {
    Context.resumeStarted = true;
    if (Context.resumeGate) await Context.resumeGate;
    this.state = 'running';
  }
  async suspend() { this.state = 'suspended'; }
}

test('offscreen initializes once, applies updates, and cleans up active and pending streams', async () => {
  let listener;
  let resolveStream;
  let streamCount = 0;
  let rejectCapture = false;
  const notifications = [];
  globalThis.window = { AudioContext: Context };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: () => rejectCapture
      ? Promise.reject(new Error('permission denied'))
      : new Promise(resolve => { resolveStream = resolve; }) } }
  });
  globalThis.chrome = {
    runtime: {
      onMessage: { addListener: fn => { listener = fn; } },
      sendMessage: async msg => { notifications.push(msg); }
    }
  };
  await import('../offscreen/offscreen.js');
  const request = (type, extra = {}) => new Promise(resolve => {
    assert.equal(listener({ target: 'offscreen', type, ...extra }, {}, resolve), true);
  });
  const stream = () => {
    const track = { readyState: 'live', stop() { this.readyState = 'ended'; } };
    streamCount++;
    return { track, getTracks: () => [track], getAudioTracks: () => [track] };
  };

  await Promise.all([
    request('AUDIO_PARAM_UPDATE', { params: DEFAULT_SETTINGS }),
    request('AUDIO_PARAM_UPDATE', { params: { masterVolume: 42 } })
  ]);
  assert.equal(Context.instances.length, 1);
  const starting = request('START_CAPTURE_STREAM', {
    streamId: 'one', tabId: 1, sessionId: 'first', settings: DEFAULT_SETTINGS, tabMuted: false
  });
  while (!resolveStream) await new Promise(resolve => setImmediate(resolve));
  const first = stream();
  resolveStream(first);
  assert.equal((await starting).success, true);
  assert.equal((await request('GET_ENGINE_STATUS')).activeTabId, 1);
  assert.equal((await request('AUDIO_PARAM_UPDATE', { params: { masterVolume: 33 } })).success, true);
  assert.equal((await request('STOP_CAPTURE')).success, true);
  assert.equal(first.track.readyState, 'ended');
  assert.equal(Context.instances[0].source.disconnected, true);
  assert.equal(Context.instances[0].state, 'suspended');
  assert.equal(notifications.length, 0, 'intentional stop must not report an ended stream');

  resolveStream = null;
  const pending = request('START_CAPTURE_STREAM', {
    streamId: 'two', tabId: 2, sessionId: 'second', settings: DEFAULT_SETTINGS, tabMuted: true
  });
  while (!resolveStream) await new Promise(resolve => setImmediate(resolve));
  await request('STOP_CAPTURE');
  const second = stream();
  resolveStream(second);
  assert.equal((await pending).success, false);
  assert.equal(second.track.readyState, 'ended');
  assert.equal((await request('GET_ENGINE_STATUS')).isCapturing, false);
  assert.equal(streamCount, 2);

  resolveStream = null;
  const thirdStart = request('START_CAPTURE_STREAM', {
    streamId: 'three', tabId: 3, sessionId: 'third', settings: DEFAULT_SETTINGS
  });
  while (!resolveStream) await new Promise(resolve => setImmediate(resolve));
  const third = stream();
  resolveStream(third);
  assert.equal((await thirdStart).success, true);
  third.track.readyState = 'ended';
  third.track.onended();
  while (!notifications.length) await new Promise(resolve => setImmediate(resolve));
  assert.equal(notifications[0].sessionId, 'third');
  assert.equal((await request('GET_ENGINE_STATUS')).isCapturing, false);

  let releaseResume;
  Context.resumeStarted = false;
  Context.resumeGate = new Promise(resolve => { releaseResume = resolve; });
  const interrupted = request('START_CAPTURE_STREAM', {
    streamId: 'four', tabId: 4, sessionId: 'fourth', settings: DEFAULT_SETTINGS
  });
  while (!Context.resumeStarted) await new Promise(resolve => setImmediate(resolve));
  const stopping = request('STOP_CAPTURE');
  releaseResume();
  assert.equal((await interrupted).success, false);
  assert.equal((await stopping).success, true);
  assert.equal(Context.instances[0].state, 'suspended');
  assert.equal((await request('GET_ENGINE_STATUS')).isCapturing, false);

  Context.resumeGate = null;
  rejectCapture = true;
  const failure = await request('START_CAPTURE_STREAM', {
    streamId: 'five', tabId: 5, sessionId: 'fifth', settings: DEFAULT_SETTINGS
  });
  assert.equal(failure.success, false);
  assert.match(failure.error, /permission denied/);
  assert.equal(Context.instances[0].state, 'suspended');
  assert.equal((await request('GET_ENGINE_STATUS')).isCapturing, false);
});
