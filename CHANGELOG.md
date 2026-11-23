# Changelog — Audio Master

All notable changes and architectural milestones for **Audio Master** are documented in this file.

---

## [1.1.0] — 2026-11-22

### UI/UX Refinement & Theme Consistency
- **Section-Specific Reset Functionality:**
  - Added dedicated Reset buttons to every section: Master & Balance, Acoustic Boosters, Spotify Mode, Equalizer (both Home & Subtab), Separation Studio, Audio Effects, Website Profiles, and General Preferences.
  - Implemented an in-app confirmation modal preventing accidental resets while avoiding blocking native alerts.
  - Added an animated floating toast notification (`#appToast`) providing instant feedback upon successful reset.
  - Engineered `storageManager.resetSection(sectionKey)` ensuring resetting one section never affects any other section.
  - Added individual item quick-reset buttons (`↺`) for Master Volume, Balance, Bass, Vocal, Treble, and Booster.

- **Global Master Audio Switch Enhancement:**
  - Prominent Master Power Switch added to the top Status Card (`#masterProcessingToggle`) and Header (`#masterPowerHeaderBtn`).
  - Added clear visual states (`● MASTER: ON` vs `○ MASTER: OFF`), glowing green active pulse, and frozen soundbars animation when turned off.
  - Synchronized with `AudioMasterPipeline`: turning Master Audio OFF immediately mutes/silences all output, while turning it ON seamlessly restores each individual control according to its exact configured setting without state conflict.

- **Voice & Music Controls Polish:**
  - Interactive click-to-mute speaker button directly on the Master Volume row.
  - Added **Vocal Track Mute/Solo** and **Music Track Mute/Solo** buttons directly on the Separation Studio slider faders.
  - Added an **Active Features Strip** displaying live chips for every audio feature (`Vol`, `Bal`, `Bass`, `Vocals`, `Treble`, `Boost`, `EQ`, `Spotify`, `Sep`).
  - Improved labels: "Vocal Boost (Speech & Clarity - 1.8kHz)" and "Bass Boost (Low-End Punch - 120Hz)".

- **Complete Light Mode Overhaul:**
  - Designed a dedicated light mode palette (`#f8fafc`, `#ffffff`, `#eef2f7`, with deep slate-900 `#0f172a` text and slate-600 `#475569` descriptions).
  - Eliminated all hardcoded dark background and white text conflicts across popup cards, dropdowns, badges, inputs, and modals.
  - Extended theme consistency to both the Mini Player (`mini-player.css`) and Options Page (`options.css`).

## [1.0.0] — 2026-11-22

### Phase 1: Project Foundation & Architecture
- Configured Manifest V3 with secure permissions (`tabCapture`, `storage`, `activeTab`, `offscreen`, `tabs`).
- Established modular ES6+ architecture keeping UI and Web Audio processing strictly decoupled.
- Created extension icon assets (PNG 16, 32, 48, 128 and scalable SVG).
- Implemented `StorageManager` with automatic schema self-healing, defaults merging, and cross-context event broadcasting.

### Phase 2: Home Dashboard & UI/UX Design System
- Pixel-faithful implementation of the dark neon glassmorphism aesthetic matching the visual reference (`#0a0d18` background, neon cyan/purple accents, glowing range thumbs, responsive pills).
- Implemented Master Volume (0–100%) with mute toggle.
- Implemented Stereo Balance (-100 to +100) with L/R markings and center reset.
- Implemented Bass Boost (0–100%) LowShelf filter.
- Implemented Vocal Boost (0–100%) peaking filter.
- Implemented Treble Boost (0–100%) HighShelf filter.
- Implemented Real Volume Booster (100%–200%) with soft-saturation hyperbolic tangent anti-clipping limiter.
- Implemented 10-Band Equalizer with vertical sliders (-12dB to +12dB) and 0dB reference guideline.
- Implemented built-in Presets (Default, Bass Boost, Vocal Boost, Treble Boost, Movie, Music) and custom preset modal.
- Added live animated soundwave visualization.

### Phase 3: Shared Audio Engine & Chrome MV3 Offscreen Pipeline
- Built unified `AudioMasterPipeline` orchestrating all Web Audio API nodes.
- Built `EqualizerProcessor` chaining 10 calibrated BiquadFilterNodes.
- Built `BoosterProcessor` combining GainNode with DynamicsCompressor brickwall limiter and tanh wave shaper.
- Built `BalanceProcessor` wrapping StereoPannerNode.
- Configured Chrome MV3 Offscreen document lifecycle (`offscreen.html` + `offscreen.js`) for uninterrupted audio playback.
- Configured Background Service Worker (`background/service-worker.js`) with stream ID resolution and routing.

### Phase 4: Advanced Settings & Website Profiles
- Implemented More Settings view with sub-navigation pills (Vocal & Music, Equalizer, Audio Effects, Per-Website, General).
- Built per-website sound profiling engine with automatic detection and switching for YouTube, Spotify, Netflix, etc.
- Added Audio Effects controls: Clipping Protection, Loudness Normalization, and Stereo Widener.
- Added full Equalizer Precision Manager for detailed frequency adjustments.

### Phase 5: Mini Player
- Built compact, floating pill mini-player (`mini-player/mini-player.html`) matching the reference mockup.
- Implemented instant two-way volume slider and mute synchronization with the shared audio engine.
- Added expand action to return to the full dashboard.

### Phase 6: AI Audio Separation Studio
- Conducted comprehensive feasibility evaluation of browser-side neural source separation (Demucs vs. Spleeter vs. ONNX Runtime Web).
- Built dual-engine architecture:
  1. Real-time Center-Channel Extraction & Phase Cancellation DSP Matrix for zero-latency, buffer-free tab audio streaming.
  2. Neural stem isolation pipeline architecture for chunked/offline extraction.
- Implemented 4 operational modes: Vocals Only, Music Only, Both, and Custom Mix.
- Added independent Vocal (0–200%) and Music (0–200%) volume controls.

### Spotify Mode / Premium Sound Engine
- Integrated dedicated Spotify Mode on the Home Dashboard and More Settings.
- Created 4 calibrated acoustic profiles: Studio Quality, Spotify Bass, Immersive (3D), and Clear Audio.
- Engineered transparent loudness normalization with DynamicsCompressorNode.
- Implemented Mid-Side spatial stereo field expansion without phase cancellation.

### Phase 7 & 8: Testing, Optimization & Packaging
- Automated Node test suite verifying EQ frequencies, Spotify profiles, storage persistence, and separation models.
- Automated release build script (`scripts/package-extension.js`) producing a verified Chrome Web Store ZIP package.
- Wrote complete documentation (`README.md`, `CHROME_STORE_LISTING.md`, `PRIVACY_POLICY.md`).
