import test from 'node:test';
import assert from 'node:assert/strict';

function event() {
  const listeners = [];
  return {
    listeners,
    addListener(listener) { listeners.push(listener); },
    emit(...args) { for (const listener of listeners) listener(...args); }
  };
}

test('worker serializes controls and capture across restarts and failures', async () => {
  const onMessage = event();
  const onChanged = event();
  const onActivated = event();
  const onUpdated = event();
  const onRemoved = event();
  const data = {};
  const tabs = new Map([
    [1, { id: 1, active: true, audible: true, url: 'https://example.com', mutedInfo: { muted: false } }],
    [2, { id: 2, active: false, audible: true, url: 'https://open.spotify.com', mutedInfo: { muted: true } }]
  ]);
  let activeTabId = 1;
  let docExists = false;
  let captureCount = 0;
  let stopCount = 0;
  let tabUpdates = 0;
  let failStart = false;
  let failUpdate = false;
  let initFailures = 2;
  let status = { isCapturing: false, activeTabId: null, sessionId: null, contextState: 'uninitialized' };
  let engineSettings;
  let sourceMuted;
  const clone = value => structuredClone(value);

  globalThis.chrome = {
    runtime: {
      onMessage, getURL: path => `chrome-extension://test/${path}`,
      getContexts: async () => docExists ? [{}] : [],
      sendMessage: async message => {
        assert.equal(message.target, 'offscreen');
        if (message.type === 'OFFSCREEN_INIT') {
          if (initFailures > 0) {
            initFailures--;
            throw new Error('Receiving end does not exist');
          }
          return { success: true, ...status };
        }
        if (message.type === 'GET_ENGINE_STATUS') return { success: true, ...status };
        if (message.type === 'STOP_CAPTURE') {
          stopCount++;
          status = { isCapturing: false, activeTabId: null, sessionId: null, contextState: 'suspended' };
          return { success: true };
        }
        if (message.type === 'START_CAPTURE_STREAM') {
          if (failStart) return { success: false, error: 'capture failed' };
          captureCount++;
          engineSettings = clone(message.settings);
          sourceMuted = message.tabMuted;
          status = { isCapturing: true, activeTabId: message.tabId, sessionId: message.sessionId, contextState: 'running' };
          return { success: true };
        }
        if (message.type === 'AUDIO_PARAM_UPDATE') {
          if (failUpdate) return { success: false, error: 'engine disconnected' };
          engineSettings = clone(message.params);
          return { success: true, ...status };
        }
        if (message.type === 'SET_TAB_MUTED') {
          sourceMuted = message.muted;
          return { success: true };
        }
        throw new Error(`Unexpected offscreen message ${message.type}`);
      }
    },
    storage: {
      onChanged,
      local: {
        get: async key => ({ [key]: clone(data[key]) }),
        set: async values => {
          for (const [key, value] of Object.entries(values)) {
            const oldValue = data[key];
            data[key] = clone(value);
            onChanged.emit({ [key]: { oldValue, newValue: clone(value) } }, 'local');
          }
        }
      }
    },
    offscreen: { createDocument: async () => { docExists = true; } },
    tabCapture: {
      getMediaStreamId: ({ targetTabId }, callback) => callback(`stream-${targetTabId}`)
    },
    tabs: {
      onActivated, onUpdated, onRemoved,
      get: async id => {
        if (!tabs.has(id)) throw new Error('Tab closed');
        return clone(tabs.get(id));
      },
      query: async () => [clone(tabs.get(activeTabId))],
      update: async () => { tabUpdates++; }
    }
  };

  await import('../background/service-worker.js?first');
  const request = message => new Promise(resolve => {
    const listener = onMessage.listeners.at(-1);
    assert.equal(listener(message, {}, resolve), true);
  });

  assert.equal((await request({ type: 'CAPTURE_ACTIVE_TAB' })).success, true);
  assert.equal(captureCount, 1);
  assert.equal(initFailures, 0, 'capture waits for the offscreen message listener');
  await request({ type: 'CAPTURE_ACTIVE_TAB' });
  assert.equal(captureCount, 1, 'duplicate capture must not start another stream');

  const updates = [
    { masterVolume: 12 }, { bassBoost: 44 }, { masterVolume: 83 },
    { balance: -32 }, { trebleBoost: 41 }, { equalizerBands: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
  ];
  const results = await Promise.all(updates.map(params => request({ type: 'AUDIO_PARAM_UPDATE', params })));
  assert.ok(results.every(result => result.success));
  assert.equal(engineSettings.masterVolume, 83);
  assert.equal(engineSettings.bassBoost, 44);
  assert.equal(engineSettings.balance, -32);
  assert.equal(engineSettings.trebleBoost, 41);
  assert.deepEqual(engineSettings.equalizerBands, updates.at(-1).equalizerBands);
  await Promise.all([
    request({ type: 'SAVE_CUSTOM_PRESET', name: 'Test', data: { bands: [1, 2] } }),
    request({ type: 'SAVE_DOMAIN_PROFILE', domain: 'example.com', data: { masterVolume: 30 } }),
    request({ type: 'AUDIO_PARAM_UPDATE', params: { masterVolume: 65 } })
  ]);
  assert.equal(engineSettings.masterVolume, 65);
  assert.ok(engineSettings.customPresets.Test);
  assert.equal(engineSettings.perWebsiteProfiles['example.com'].masterVolume, 30);
  const saved = clone(data.audio_master_settings_v1);
  onChanged.emit({ audio_master_settings_v1: { newValue: { ...saved, masterVolume: 12 } } }, 'local');
  await request({ type: 'AUDIO_PARAM_UPDATE', params: { bassBoost: 10 } });
  assert.equal(engineSettings.masterVolume, 65, 'delayed storage events cannot overwrite current settings');
  const reset = await request({ type: 'RESET_AUDIO_SETTINGS', section: 'boosters' });
  assert.equal(reset.success, true);
  assert.equal(engineSettings.masterVolume, 65);
  assert.equal(engineSettings.bassBoost, reset.settings.bassBoost);
  const resetAll = await request({ type: 'RESET_AUDIO_SETTINGS', section: 'all' });
  assert.equal(resetAll.success, true);
  assert.equal(engineSettings.masterVolume, resetAll.settings.masterVolume);
  assert.deepEqual(engineSettings.customPresets, {});

  // A new worker instance recovers the tab and session from the existing offscreen document.
  await import('../background/service-worker.js?restart');
  assert.equal((await request({ type: 'GET_AUDIO_STATUS' })).activeTabId, 1);
  assert.equal((await request({ type: 'AUDIO_PARAM_UPDATE', params: { masterVolume: 21 } })).success, true);
  assert.equal(engineSettings.masterVolume, 21);
  assert.equal((await request({ type: 'AUDIO_PARAM_UPDATE', params: { processingEnabled: false } })).success, true);
  assert.equal(status.isCapturing, false);
  assert.equal((await request({ type: 'STOP_CAPTURE' })).success, true);
  assert.equal(tabs.get(1).mutedInfo.muted, false);
  assert.equal(tabUpdates, 0, 'capture must not change Chrome tab mute state');

  activeTabId = 2;
  assert.equal((await request({ type: 'AUDIO_PARAM_UPDATE', params: { processingEnabled: true } })).success, true);
  assert.equal(sourceMuted, true);
  assert.equal(status.activeTabId, 2);
  onUpdated.listeners.at(-1)(2, { mutedInfo: { muted: false } }, tabs.get(2));
  await request({ type: 'GET_AUDIO_STATUS' });
  assert.equal(sourceMuted, false);
  onUpdated.listeners.at(-1)(2, { mutedInfo: { muted: true } }, tabs.get(2));
  await request({ type: 'GET_AUDIO_STATUS' });
  assert.equal(sourceMuted, true);
  await request({ type: 'AUDIO_PARAM_UPDATE', params: { processingEnabled: false } });
  assert.equal(tabs.get(2).mutedInfo.muted, true);
  assert.equal(tabUpdates, 0);

  const rapid = await Promise.all([
    request({ type: 'AUDIO_PARAM_UPDATE', params: { processingEnabled: true } }),
    request({ type: 'AUDIO_PARAM_UPDATE', params: { processingEnabled: false } }),
    request({ type: 'AUDIO_PARAM_UPDATE', params: { processingEnabled: true } }),
    request({ type: 'AUDIO_PARAM_UPDATE', params: { processingEnabled: false } })
  ]);
  assert.ok(rapid.every(result => result.success));
  assert.equal(status.isCapturing, false);

  failStart = true;
  const failed = await request({ type: 'AUDIO_PARAM_UPDATE', params: { processingEnabled: true } });
  assert.equal(failed.success, false);
  assert.match(failed.error, /capture failed/);
  assert.equal(status.isCapturing, false);
  failStart = false;
  await request({ type: 'CAPTURE_ACTIVE_TAB' });
  failUpdate = true;
  const failedUpdate = await request({ type: 'AUDIO_PARAM_UPDATE', params: { bassBoost: 9 } });
  assert.equal(failedUpdate.success, false);
  assert.match(failedUpdate.error, /engine disconnected/);
  assert.equal(status.isCapturing, false);
  failUpdate = false;

  await request({ type: 'CAPTURE_ACTIVE_TAB' });
  activeTabId = 1;
  tabs.get(1).active = true;
  tabs.get(2).active = false;
  onActivated.listeners.at(-1)({ tabId: 1 });
  await request({ type: 'GET_AUDIO_STATUS' });
  assert.equal(status.activeTabId, 1);
  activeTabId = 2;
  await request({ type: 'CAPTURE_ACTIVE_TAB' });
  onRemoved.listeners.at(-1)(2);
  await request({ type: 'GET_AUDIO_STATUS' });
  assert.equal(status.isCapturing, false);
  assert.ok(stopCount >= 4);
});
