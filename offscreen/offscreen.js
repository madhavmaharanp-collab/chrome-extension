/**
 * Hosts the captured tab's Web Audio graph in an MV3 offscreen document.
 */
import { AudioMasterPipeline } from '../engine/audio-pipeline.js';

let audioContext = null;
let pipeline = null;
let initPromise = null;
let currentMediaStream = null;
let activeTabId = null;
let sessionId = null;
let generation = 0;
let resumePromise = null;
let stopPromise = null;

async function initAudioEngine() {
  if (pipeline && audioContext.state !== 'closed') return;
  if (!initPromise) {
    initPromise = Promise.resolve().then(() => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextClass({ latencyHint: 'interactive' });
      pipeline = new AudioMasterPipeline(audioContext);
    }).finally(() => { initPromise = null; });
  }
  await initPromise;
}

async function resumeContext() {
  if (audioContext.state === 'suspended') {
    if (!resumePromise) {
      resumePromise = audioContext.resume().finally(() => { resumePromise = null; });
    }
    await resumePromise;
  }
}

function stopCapture() {
  generation++;
  const stream = currentMediaStream;
  currentMediaStream = null;
  activeTabId = null;
  sessionId = null;
  if (pipeline) pipeline.detachStream();
  if (stream) {
    for (const track of stream.getTracks()) {
      track.onended = null;
      track.stop();
    }
  }
  if (!stopPromise) {
    stopPromise = (async () => {
      if (resumePromise) await resumePromise;
      if (audioContext && audioContext.state === 'running') await audioContext.suspend();
    })().finally(() => { stopPromise = null; });
  }
  return stopPromise;
}

async function captureTabAudio(message) {
  const token = ++generation;
  let stream;
  try {
    if (stopPromise) await stopPromise;
    if (token !== generation) throw new Error('Capture cancelled');
    if (currentMediaStream) throw new Error('An audio capture is already active');
    await initAudioEngine();
    if (token !== generation) throw new Error('Capture cancelled');
    pipeline.applyAllSettings(message.settings);
    pipeline.setSourceMuted(!!message.tabMuted);
    await resumeContext();
    if (token !== generation) throw new Error('Capture cancelled');
    if (audioContext.state !== 'running') throw new Error(`Audio context is ${audioContext.state}`);
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: message.streamId } },
      video: false
    });
    if (token !== generation) throw new Error('Capture cancelled');
    const track = stream.getAudioTracks()[0];
    if (!track || track.readyState !== 'live') throw new Error('Captured audio track is not live');
    pipeline.attachStream(stream);
    currentMediaStream = stream;
    activeTabId = message.tabId;
    sessionId = message.sessionId;
    track.onended = () => {
      if (currentMediaStream !== stream) return;
      const endedSessionId = sessionId;
      stopCapture().then(() => chrome.runtime.sendMessage({
        type: 'AUDIO_STREAM_ENDED', sessionId: endedSessionId
      })).catch(err => console.error('[Audio Master Offscreen] Stream cleanup failed:', err));
    };
    return { success: true };
  } catch (err) {
    if (stream && stream !== currentMediaStream) stream.getTracks().forEach(track => track.stop());
    if (token === generation && !currentMediaStream) await stopCapture();
    throw err;
  }
}

function getStatus() {
  const track = currentMediaStream && currentMediaStream.getAudioTracks()[0];
  return {
    isCapturing: !!track && track.readyState === 'live',
    activeTabId,
    sessionId,
    contextState: audioContext ? audioContext.state : 'uninitialized'
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return false;
  let operation;
  switch (message.type) {
    case 'OFFSCREEN_INIT':
      operation = initAudioEngine().then(() => ({ success: true, ...getStatus() }));
      break;
    case 'START_CAPTURE_STREAM':
      operation = captureTabAudio(message);
      break;
    case 'AUDIO_PARAM_UPDATE':
      operation = (async () => {
        if (currentMediaStream && audioContext.state === 'closed') {
          throw new Error('Audio context closed during capture');
        }
        await initAudioEngine();
        if (currentMediaStream) await resumeContext();
        if (currentMediaStream && audioContext.state !== 'running') {
          throw new Error(`Audio context is ${audioContext.state}`);
        }
        pipeline.applyAllSettings(message.params);
        return { success: true, ...getStatus() };
      })();
      break;
    case 'SET_TAB_MUTED':
      operation = (async () => {
        if (currentMediaStream && message.tabId === activeTabId) {
          pipeline.setSourceMuted(!!message.muted);
        }
        return { success: true };
      })();
      break;
    case 'GET_ENGINE_STATUS':
      sendResponse({ success: true, ...getStatus() });
      return true;
    case 'STOP_CAPTURE':
      operation = stopCapture().then(() => ({ success: true, ...getStatus() }));
      break;
    default:
      return false;
  }
  operation.then(sendResponse, err => {
    console.error('[Audio Master Offscreen]', message.type, err);
    sendResponse({ success: false, error: err.message });
  });
  return true;
});
