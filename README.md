# Audio Master — Take Control of Your Sound

**Audio Master** is a Chrome audio enhancement extension built with Manifest V3 and the Web Audio API. It provides equalization, volume amplification, stereo balancing, **Spotify Mode**, and heuristic Mid/Side vocal and music controls.

---

## 🎨 Visual Design & UI System

Audio Master is crafted with a dark glassmorphism aesthetic inspired by high-end digital audio workstations:
- **Base Background:** Deep midnight navy gradient (`#0a0d18` with subtle violet/cyan ambient glows)
- **Glassmorphism Panels:** Translucent surface cards (`rgba(18, 22, 42, 0.75)`) with backdrop blur and delicate cyan/purple borders
- **Interactive Sliders:** Neon cyan-to-purple progress tracks with glowing white thumb knobs (`box-shadow: 0 0 10px rgba(0, 240, 255, 0.8)`)
- **Status Indicators:** Emerald green active pill badges, animated equalizer bars, and live active tab domain badges

---

## ⚡ Core Features

### 1. Home Dashboard
- **Master Volume:** Smooth attenuation and amplification (0–100%) with instant mute toggle.
- **Stereo Balance:** Center-calibrated pan control (-100 to +100) with Left / Right indicator labels.
- **Bass Boost:** LowShelf acoustic enhancement centered at 120Hz (+0dB to +12dB).
- **Vocal Boost:** Peaking filter tuned to human speech formants at 1.8kHz (+0dB to +10dB).
- **Treble Boost:** HighShelf sparkle filter centered at 8kHz (+0dB to +12dB).
- **Real Volume Booster (Up to 200%):** Amplifies quiet media streams beyond 100% using a hyperbolic tangent (`tanh`) soft-clipping curve and dynamic limiter to prevent harsh digital distortion.
- **10-Band Equalizer:** 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz with &plusmn;12dB vertical sliders and 0dB reference guideline.
- **Audio Presets:** Built-in presets (*Default*, *Bass Boost*, *Vocal Boost*, *Treble Boost*, *Movie*, *Music*) plus support for saving and naming custom user presets.
- **Quick Modes:** Quick toggling between *Both*, *Vocal Mode*, and *Music Mode*.

### 2. Spotify Mode / Premium Sound Engine
A dedicated music-listening mode with 4 calibrated acoustic profiles:
- **Studio Quality:** Transparent linear response with soft harmonic warmth.
- **Spotify Bass:** Punchy sub-bass resonance without mid-bass mud.
- **Immersive (3D):** Broadened soundstage using Mid-Side phase-safe spatial expansion.
- **Clear Audio:** High-definition vocal clarity and crisp percussion sparkle.
- Includes transparent loudness normalization (`DynamicsCompressorNode`) and peak protection.

### 3. Audio Separation Studio
Provides approximate vocal and instrumental emphasis from a mixed stereo stream:
- **Vocals Only:** Emphasizes center-channel and vocal-frequency content.
- **Music Only:** Reduces some center-channel content and emphasizes other components.
- **Both:** Transparent original stereo playback.
- **Custom Mix:** Separate level controls for the heuristic paths.

These are Mid/Side DSP approximations, not neural stem separation. Instruments can remain in the vocal path and vocals can remain in the music path.

### 4. Website Profiles
Automatically saves and loads audio profiles tailored to individual websites (e.g. YouTube, Spotify Web Player, Netflix, Twitch).

### 5. Floating Mini Player
A compact pill widget featuring live volume adjustment, mute control, and one-click expansion to the full dashboard.

---

## 🏗️ Architecture & Chrome Manifest V3 Implementation

```
[ Active Chrome Tab Audio Stream ]
                │
                ▼ (chrome.tabCapture.getMediaStreamId)
[ Background Service Worker ]
                │
                ▼ (Inter-process Messaging)
[ Offscreen Document Audio Context (offscreen/offscreen.js) ]
                │
                ├── Input Gain Node
                ├── AI Separation Studio (Mid/Side Phase Matrix)
                ├── Spotify Mode Engine (Loudness Compressor + Spatial Widener)
                ├── 10-Band Equalizer (BiquadFilterNode Series)
                ├── Bass Boost Filter (LowShelf @ 120Hz)
                ├── Vocal Boost Filter (Peaking @ 1800Hz)
                ├── Treble Boost Filter (HighShelf @ 8000Hz)
                ├── Balance Node (StereoPannerNode)
                ├── Volume Booster & Soft-Limiter (tanh Waveshaper + DynamicsCompressor)
                ├── Master Gain Node
                ├── AnalyserNode (FFT Visualizer)
                │
                ▼
        [ audioContext.destination (Speakers / Headphones) ]
```

---

## 📁 Project Directory Structure

```
g:/audio_extenation/
├── manifest.json              # Chrome Manifest V3 definition
├── package.json               # Node test & build configuration
├── README.md                  # Complete technical documentation
├── CHANGELOG.md               # Version history and feature release logs
├── icons/                     # Generated extension icons (16, 32, 48, 128, SVG)
├── popup/                     # Home Dashboard & More Settings UI
│   ├── popup.html             # Main popup DOM structure
│   ├── popup.css              # Dark neon glassmorphism stylesheet
│   └── popup.js               # UI interaction and bidirectional sync
├── mini-player/               # Compact floating mini-player
│   ├── mini-player.html
│   ├── mini-player.css
│   └── mini-player.js
├── options/                   # Fullscreen options & diagnostics dashboard
│   ├── options.html
│   ├── options.css
│   └── options.js
├── background/                # Chrome MV3 Service Worker
│   └── service-worker.js
├── offscreen/                 # Web Audio API Offscreen host
│   ├── offscreen.html
│   └── offscreen.js
├── content/                   # In-page media detection script
│   └── content-script.js
├── engine/                    # Modular Web Audio API processing engine
│   ├── audio-constants.js     # Calibrated frequencies and filter specs
│   ├── equalizer-node.js      # 10-band BiquadFilter series
│   ├── booster-node.js        # 200% gain + tanh anti-clipping limiter
│   ├── balance-node.js        # Stereo panner processor
│   ├── spotify-engine.js      # Spotify mode loudness & spatial processor
│   ├── ai-separation-engine.js# Vocal & instrumental separation matrix
│   └── audio-pipeline.js      # Master Web Audio graph orchestrator
├── storage/                   # State management & persistence
│   ├── default-settings.js    # Schema definition and baseline presets
│   └── storage-manager.js     # Self-healing chrome.storage manager
├── docs/                      # Store listing & privacy policy
│   ├── CHROME_STORE_LISTING.md
│   └── PRIVACY_POLICY.md
├── scripts/                   # Build and packaging utilities
│   ├── generate-icons.js      # Pure JS icon generator
│   └── package-extension.js   # Production ZIP packaging script
├── test/                      # Automated test suite
│   ├── storage.test.js        # Persistence and schema unit tests
│   └── audio-pipeline.test.js # Audio engine node calculation tests
└── dist/                      # Production ZIP archive
    └── audio-master-v1.0.0.zip
```

---

## 🚀 Installation & Developer Guide

### How to Install in Google Chrome
1. In Chrome 116 or newer, navigate to:
   ```
   chrome://extensions/
   ```
2. Enable **Developer mode** in the top right corner.
3. Click the **Load unpacked** button in the top left.
4. Select the directory:
   ```
   g:\audio_extenation
   ```
5. The **Audio Master** extension icon will appear in your Chrome toolbar. Pin it for quick access!

---

## 🧪 Running Tests & Building

### Run Automated Tests
```bash
npm test
```
The tests exercise storage, audio-node parameters, and mocked worker/offscreen capture lifecycles. They do not prove audible behavior in Chrome.

### Capture behavior and manual verification

Chrome diverts captured tab audio away from normal tab playback; the offscreen audio graph sends it to the output device. Audio Master does not change the tab's mute setting. Turning the master switch off stops capture tracks and suspends the processing context so Chrome can resume normal tab playback. A user-muted tab remains muted. If an older version left a tab muted and its original state was lost, check that tab's mute setting manually.

Chrome may deny capture when the extension lacks authorization for a tab, and protected playback or site/browser restrictions can prevent capturing usable audio. A live track and an active status do not prove that YouTube or Spotify audio is audible or being processed. Capture errors are displayed in the popup; if no capture is active, reopening the popup can retry for the active tab when automatic attachment is enabled.

After loading the unpacked extension, verify with audible media:

1. Play YouTube, enable Audio Master, adjust master volume, bass, treble, balance, EQ and separation controls repeatedly; confirm audible changes.
2. Turn the master switch off and confirm normal audio returns without reloading. Turn it on again and repeat. Repeat with a tab that was already muted and confirm it stays muted.
3. Rapidly toggle on/off, close and reopen the popup, switch between playing tabs, reload and close a captured tab; check for silence, duplicate audio and error messages.
4. Stop the extension's service worker from `chrome://extensions`, reopen the popup, and verify controls still affect the active capture and OFF restores audio.
5. Test Spotify playback with all four profiles and Spotify mode on/off. Verify both audibility and profile changes; report any capture, protection or permission errors.
6. Inspect the popup, service worker and offscreen document consoles for errors during these checks.

### Package for Chrome Web Store
```bash
npm run package
```
Generates a verified, distribution-ready ZIP file in `dist/audio-master-v1.0.0.zip`.

---

## 🔒 Security & Privacy Guarantee
- **100% Local Execution:** Audio processing occurs strictly within the local Web Audio API context.
- **Zero Cloud Recording:** No audio data or browsing habits are ever uploaded or transmitted.
- **Manifest V3 Compliant:** Strict Content Security Policy, zero external unvetted scripts.
