/**
 * Audio Master - Background Service Worker (Manifest V3)
 * Coordinates Offscreen document lifecycle, tab audio capture, website profiles,
 * and the Spotify Web Player remote control bridge.
 */

import { storageManager } from '../storage/storage-manager.js';
const OFFSCREEN_DOCUMENT_PATH = 'offscreen/offscreen.html';

let captureOperationQueue = Promise.resolve();
let offscreenCreation = null;

function enqueueCaptureOperation(operation) {
  const queued = captureOperationQueue.then(operation, operation);
  captureOperationQueue = queued.catch(() => {});
  return queued;
}

async function stopCaptureLifecycle() {
  if (await hasOffscreenDocument()) await sendOffscreen('STOP_CAPTURE');
}
let lastKnownSpotifyState = null;
let lastSpotifyTabId = null;

/**
 * Ensure the offscreen document is open
 */
async function ensureOffscreenDocument() {
  if (!offscreenCreation) {
    offscreenCreation = (async () => {
      if (await hasOffscreenDocument()) return;
      try {
        await chrome.offscreen.createDocument({
          url: OFFSCREEN_DOCUMENT_PATH,
          reasons: ['USER_MEDIA', 'AUDIO_PLAYBACK'],
          justification: 'Real-time Web Audio API signal processing for browser audio enhancement'
        });
      } catch (err) {
        if (!(await hasOffscreenDocument())) throw err;
      }
    })().finally(() => { offscreenCreation = null; });
  }
  await offscreenCreation;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await sendOffscreen('OFFSCREEN_INIT');
      return;
    } catch (err) {
      if (attempt === 39) throw new Error(`Audio engine not ready: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

async function hasOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
  });
  return contexts.length > 0;
}

async function sendOffscreen(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ target: 'offscreen', type, ...payload });
  if (!response || !response.success) {
    throw new Error(response?.error || `No response from audio engine for ${type}`);
  }
  return response;
}

async function getAudioStatus() {
  if (!(await hasOffscreenDocument())) {
    return { isCapturing: false, activeTabId: null, contextState: 'uninitialized' };
  }
  return sendOffscreen('GET_ENGINE_STATUS');
}

/**
 * Capture tab audio stream and pass stream ID to offscreen document
 */
async function captureTab(tabId) {
  const settings = await storageManager.refreshSettings();
  if (settings.processingEnabled === false) throw new Error('Audio Master is OFF');
  await ensureOffscreenDocument();
  const status = await getAudioStatus();
  if (status.isCapturing && status.activeTabId === tabId && status.contextState === 'running') {
    return status;
  }
  if (status.isCapturing || status.activeTabId !== null) await stopCaptureLifecycle();
  const tab = await chrome.tabs.get(tabId);
  const streamId = await new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, id => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (!id) reject(new Error('Chrome did not provide a capture stream'));
      else resolve(id);
    });
  });
  try {
    await sendOffscreen('START_CAPTURE_STREAM', {
      streamId, tabId, sessionId: crypto.randomUUID(), settings,
      tabMuted: !!tab.mutedInfo?.muted
    });
    const started = await getAudioStatus();
    if (!started.isCapturing || started.activeTabId !== tabId || started.contextState !== 'running') {
      throw new Error('Captured audio pipeline is not running');
    }
    return started;
  } catch (err) {
    try { await stopCaptureLifecycle(); } catch (cleanupErr) {
      console.error('[Audio Master Worker] Capture cleanup failed:', cleanupErr);
    }
    throw err;
  }
}

/**
 * Check and apply per-website profile when switching tabs
 */
async function checkWebsiteProfile(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url || !/^https?:/.test(tab.url)) return;
  const domain = new URL(tab.url).hostname.replace(/^www\./, '');
  const profile = await storageManager.getSettingsForDomain(domain);
  const status = await getAudioStatus();
  if (profile._hasProfile && status.isCapturing && status.activeTabId === tabId) {
    await sendOffscreen('AUDIO_PARAM_UPDATE', { params: profile });
  }
}

chrome.tabs.onActivated.addListener(activeInfo => {
  enqueueCaptureOperation(async () => {
    const settings = await storageManager.refreshSettings();
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (settings.processingEnabled !== false && settings.general?.autoAttachTab && tab.audible) {
      await captureTab(activeInfo.tabId);
    }
    await checkWebsiteProfile(activeInfo.tabId);
  }).catch(err => console.error('[Audio Master Worker] Tab activation failed:', err));
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.mutedInfo) {
    enqueueCaptureOperation(async () => {
      const status = await getAudioStatus();
      if (status.isCapturing && status.activeTabId === tabId) {
        await sendOffscreen('SET_TAB_MUTED', { tabId, muted: changeInfo.mutedInfo.muted });
      }
    }).catch(err => console.error('[Audio Master Worker] Tab mute update failed:', err));
  }
  if (changeInfo.audible === true && tab.active) {
    enqueueCaptureOperation(async () => {
    const settings = await storageManager.refreshSettings();
    if (settings.processingEnabled !== false && settings.general?.autoAttachTab) {
      await captureTab(tabId);
    }
    }).catch(err => console.error('[Audio Master Worker] Automatic capture failed:', err));
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  enqueueCaptureOperation(async () => {
    const status = await getAudioStatus();
    if (status.activeTabId === tabId) await stopCaptureLifecycle();
  }).catch(err => console.error('[Audio Master Worker] Closed tab cleanup failed:', err));
  if (lastSpotifyTabId === tabId) {
    lastSpotifyTabId = null;
    lastKnownSpotifyState = null;
  }
});

async function applySettingsUpdate(params, resetSection) {
  const previous = await storageManager.refreshSettings();
  const settings = resetSection === 'all'
    ? await storageManager.resetToDefaults()
    : resetSection
      ? await storageManager.resetSection(resetSection)
      : await storageManager.updateSettings(params);

  if (settings.processingEnabled === false) {
    await stopCaptureLifecycle();
  } else {
    if (await hasOffscreenDocument()) {
      try {
        await sendOffscreen('AUDIO_PARAM_UPDATE', { params: settings });
      } catch (err) {
        try { await stopCaptureLifecycle(); } catch (cleanupErr) {
          console.error('[Audio Master Worker] Cleanup after update failed:', cleanupErr);
        }
        throw err;
      }
    }
    if (previous.processingEnabled === false && settings.processingEnabled !== false) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('No active tab to capture');
      await captureTab(tab.id);
    }
  }
  return { success: true, settings, ...(await getAudioStatus()) };
}

// Helper: Query Spotify tab
async function findSpotifyTab() {
  const tabs = await chrome.tabs.query({ url: '*://*.spotify.com/*' });
  return tabs && tabs.length > 0 ? tabs[0] : null;
}

// Extension messaging router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'offscreen') {
    return false;
  }

  switch (message.type) {
    case 'SPOTIFY_STATE_UPDATE':
      lastKnownSpotifyState = message.state;
      if (sender.tab) lastSpotifyTabId = sender.tab.id;
      sendResponse({ received: true });
      return true;

    case 'GET_SPOTIFY_PLAYER_STATE':
      findSpotifyTab().then(tab => {
        if (!tab) {
          return sendResponse({ available: false, lastKnown: lastKnownSpotifyState });
        }
        chrome.tabs.sendMessage(tab.id, {
          target: 'spotify_content',
          type: 'GET_SPOTIFY_STATE'
        }, (res) => {
          if (chrome.runtime.lastError || !res) {
            sendResponse({ available: false, tabFound: true, lastKnown: lastKnownSpotifyState });
          } else {
            lastKnownSpotifyState = res;
            lastSpotifyTabId = tab.id;
            sendResponse({ available: true, state: res, tabId: tab.id });
          }
        });
      });
      return true;

    case 'SPOTIFY_REMOTE_ACTION':
      findSpotifyTab().then(tab => {
        if (!tab) {
          return sendResponse({ success: false, error: 'No Spotify tab found' });
        }
        chrome.tabs.sendMessage(tab.id, {
          target: 'spotify_content',
          type: message.action
        }, (res) => {
          sendResponse(res || { success: true });
        });
      });
      return true;

    case 'OPEN_SPOTIFY_TAB':
      chrome.tabs.create({ url: 'https://open.spotify.com' }).then(tab => {
        sendResponse({ success: true, tabId: tab.id });
      });
      return true;

    case 'GET_AUDIO_STATUS':
      enqueueCaptureOperation(async () => ({ success: true, ...(await getAudioStatus()) }))
        .then(sendResponse, err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'AUDIO_STREAM_ENDED':
      console.warn('[Audio Master Worker] Captured audio ended:', message.sessionId);
      sendResponse({ received: true });
      return true;

    case 'CAPTURE_ACTIVE_TAB':
      enqueueCaptureOperation(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('No active tab');
        return { success: true, ...(await captureTab(tab.id)) };
      }).then(sendResponse, err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'AUDIO_PARAM_UPDATE':
    case 'RESET_AUDIO_SETTINGS':
      enqueueCaptureOperation(() => applySettingsUpdate(message.params, message.section))
        .then(sendResponse, err => {
          console.error('[Audio Master Worker] Settings update failed:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true;

    case 'SAVE_CUSTOM_PRESET':
    case 'SAVE_DOMAIN_PROFILE':
      enqueueCaptureOperation(async () => {
        const settings = message.type === 'SAVE_CUSTOM_PRESET'
          ? await storageManager.saveCustomPreset(message.name, message.data)
          : await storageManager.saveDomainProfile(message.domain, message.data);
        return { success: true, settings };
      }).then(sendResponse, err => {
        console.error('[Audio Master Worker] Save failed:', err);
        sendResponse({ success: false, error: err.message });
      });
      return true;

    case 'STOP_CAPTURE':
      enqueueCaptureOperation(async () => {
        await stopCaptureLifecycle();
        return { success: true };
      }).then(sendResponse, err => sendResponse({ success: false, error: err.message }));
      return true;
  }
});
