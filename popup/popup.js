/**
 * Audio Master - Popup Controller
 * Manages UI interactions, state synchronization, audio engine dispatch,
 * 3-Tab Architecture (Audio Controls, Dedicated Spotify Player, More Settings),
 * Spotify remote Web Player bridge, section-specific & granular resets with in-app
 * confirmation modals, and pixel-consistent Dark/Light theme switching.
 */

import { storageManager } from '../storage/storage-manager.js';
import { BUILTIN_PRESETS, SPOTIFY_PROFILES } from '../storage/default-settings.js';

class PopupController {
  constructor() {
    this.state = null;
    this.activeTabInfo = null;
    this.dom = {};
    this.pendingResetAction = null;
    this.toastTimer = null;
    this.spotifyPollTimer = null;
    this.isSpotifyPlaying = false;
  }

  async init() {
    this.cacheDomElements();
    this.setupEventListeners();
    await this.loadActiveTab();
    await this.loadSettingsAndSyncUI(result.settings);
    this.checkEngineStatus(true);
  }

  cacheDomElements() {
    // Top Navigation Tabs & Panels
    this.dom.tabAudioControlsBtn = document.getElementById('tabAudioControlsBtn');
    this.dom.tabSpotifyPlayerBtn = document.getElementById('tabSpotifyPlayerBtn');
    this.dom.tabMoreSettingsBtn = document.getElementById('tabMoreSettingsBtn');

    this.dom.audioControlsView = document.getElementById('audioControlsView');
    this.dom.spotifyPlayerView = document.getElementById('spotifyPlayerView');
    this.dom.moreSettingsView = document.getElementById('moreSettingsView');

    this.dom.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.dom.closeBtn = document.getElementById('closeBtn');

    // Global Master Power Controls
    this.dom.masterPowerHeaderBtn = document.getElementById('masterPowerHeaderBtn');
    this.dom.masterPowerHeaderText = document.getElementById('masterPowerHeaderText');
    this.dom.masterProcessingToggle = document.getElementById('masterProcessingToggle');
    this.dom.masterPowerStateLabel = document.getElementById('masterPowerStateLabel');
    this.dom.statusActiveBadge = document.getElementById('statusActiveBadge');
    this.dom.statusMasterNote = document.getElementById('statusMasterNote');
    this.dom.soundBarsAnim = document.getElementById('soundBarsAnim');

    // Active Feature Chips Strip
    this.dom.chipMasterVol = document.getElementById('chipMasterVol');
    this.dom.chipBalance = document.getElementById('chipBalance');
    this.dom.chipBass = document.getElementById('chipBass');
    this.dom.chipVocal = document.getElementById('chipVocal');
    this.dom.chipTreble = document.getElementById('chipTreble');
    this.dom.chipBooster = document.getElementById('chipBooster');
    this.dom.chipEQ = document.getElementById('chipEQ');
    this.dom.chipSpotify = document.getElementById('chipSpotify');
    this.dom.chipSep = document.getElementById('chipSep');

    // Group 1: Master Audio & Balance
    this.dom.resetMasterSectionBtn = document.getElementById('resetMasterSectionBtn');
    this.dom.masterVolumeSlider = document.getElementById('masterVolumeSlider');
    this.dom.masterVolumeToggle = document.getElementById('masterVolumeToggle');
    this.dom.masterVolumeVal = document.getElementById('masterVolumeVal');
    this.dom.muteVolumeBtn = document.getElementById('muteVolumeBtn');
    this.dom.masterSpeakerIcon = document.getElementById('masterSpeakerIcon');
    this.dom.resetMasterVolBtn = document.getElementById('resetMasterVolBtn');

    this.dom.balanceSlider = document.getElementById('balanceSlider');
    this.dom.balanceToggle = document.getElementById('balanceToggle');
    this.dom.balanceVal = document.getElementById('balanceVal');
    this.dom.resetBalanceBtn = document.getElementById('resetBalanceBtn');

    // Group 2: Boosters & Amplification
    this.dom.resetBoostersSectionBtn = document.getElementById('resetBoostersSectionBtn');
    this.dom.bassBoostSlider = document.getElementById('bassBoostSlider');
    this.dom.bassBoostToggle = document.getElementById('bassBoostToggle');
    this.dom.bassBoostVal = document.getElementById('bassBoostVal');
    this.dom.resetBassBtn = document.getElementById('resetBassBtn');

    this.dom.vocalBoostSlider = document.getElementById('vocalBoostSlider');
    this.dom.vocalBoostToggle = document.getElementById('vocalBoostToggle');
    this.dom.vocalBoostVal = document.getElementById('vocalBoostVal');
    this.dom.resetVocalBtn = document.getElementById('resetVocalBtn');

    this.dom.trebleBoostSlider = document.getElementById('trebleBoostSlider');
    this.dom.trebleBoostToggle = document.getElementById('trebleBoostToggle');
    this.dom.trebleBoostVal = document.getElementById('trebleBoostVal');
    this.dom.resetTrebleBtn = document.getElementById('resetTrebleBtn');

    this.dom.volumeBoosterSlider = document.getElementById('volumeBoosterSlider');
    this.dom.volumeBoosterToggle = document.getElementById('volumeBoosterToggle');
    this.dom.volumeBoosterVal = document.getElementById('volumeBoosterVal');
    this.dom.resetBoosterBtn = document.getElementById('resetBoosterBtn');

    // Group 3: 10-Band Equalizer
    this.dom.equalizerToggle = document.getElementById('equalizerToggle');
    this.dom.openEqTabBtn = document.getElementById('openEqTabBtn');
    this.dom.resetEqCardBtn = document.getElementById('resetEqCardBtn');
    this.dom.resetEqSubtabBtn = document.getElementById('resetEqSubtabBtn');
    this.dom.eqVerticalSliders = document.querySelectorAll('.eq-slider-vertical');

    // Group 4: Listening Modes & Presets
    this.dom.quickModeSelect = document.getElementById('quickModeSelect');
    this.dom.presetSelectDropdown = document.getElementById('presetSelectDropdown');
    this.dom.resetAllBtn = document.getElementById('resetAllBtn');

    // --- Dedicated Spotify Music Player Elements ---
    this.dom.spotifyVolumeSlider = document.getElementById('spotifyVolumeSlider');
    this.dom.spotifyVolumeVal = document.getElementById('spotifyVolumeVal');
    this.dom.spotifyEngineToggle = document.getElementById('spotifyEngineToggle');
    this.dom.resetSpotifyPlayerProfilesBtn = document.getElementById('resetSpotifyPlayerProfilesBtn');
    this.dom.spProfileCards = document.querySelectorAll('.sp-profile-card');

    // More Settings - Subtabs
    this.dom.subNavBtns = document.querySelectorAll('.sub-nav-btn');
    this.dom.subtabContents = {
      'vocal-music': document.getElementById('subtabVocalMusic'),
      'equalizer': document.getElementById('subtabEqualizer'),
      'audio-effects': document.getElementById('subtabAudioEffects'),
      'per-website': document.getElementById('subtabPerWebsite'),
      'general': document.getElementById('subtabGeneral')
    };

    // Vocal & Music Separation Studio
    this.dom.resetStudioBtn = document.getElementById('resetStudioBtn');
    this.dom.separationStudioToggle = document.getElementById('separationStudioToggle');
    this.dom.sepModeCards = document.querySelectorAll('.mode-card');
    this.dom.vocalStudioSlider = document.getElementById('vocalStudioSlider');
    this.dom.vocalStudioVal = document.getElementById('vocalStudioVal');
    this.dom.toggleVocalTrackBtn = document.getElementById('toggleVocalTrackBtn');
    this.dom.vocalTrackStateBadge = document.getElementById('vocalTrackStateBadge');

    this.dom.musicStudioSlider = document.getElementById('musicStudioSlider');
    this.dom.musicStudioVal = document.getElementById('musicStudioVal');
    this.dom.toggleMusicTrackBtn = document.getElementById('toggleMusicTrackBtn');
    this.dom.musicTrackStateBadge = document.getElementById('musicTrackStateBadge');
    this.dom.aiStatusLabel = document.getElementById('aiStatusLabel');

    // Advanced Audio & Effects
    this.dom.advancedAudioToggle = document.getElementById('advancedAudioToggle');
    this.dom.resetAudioEffectsBtn = document.getElementById('resetAudioEffectsBtn');
    this.dom.peakProtectionToggle = document.getElementById('peakProtectionToggle');
    this.dom.loudnessNormToggle = document.getElementById('loudnessNormToggle');
    this.dom.stereoWidenerToggle = document.getElementById('stereoWidenerToggle');

    // Presets Management Modal
    this.dom.openSavePresetModalBtn = document.getElementById('openSavePresetModalBtn');
    this.dom.savePresetModal = document.getElementById('savePresetModal');
    this.dom.presetNameInput = document.getElementById('presetNameInput');
    this.dom.cancelPresetModalBtn = document.getElementById('cancelPresetModalBtn');
    this.dom.confirmSavePresetBtn = document.getElementById('confirmSavePresetBtn');

    // Reset Confirmation Modal & Toast
    this.dom.confirmResetModal = document.getElementById('confirmResetModal');
    this.dom.confirmModalTitle = document.getElementById('confirmModalTitle');
    this.dom.confirmModalDesc = document.getElementById('confirmModalDesc');
    this.dom.cancelResetModalBtn = document.getElementById('cancelResetModalBtn');
    this.dom.executeResetModalBtn = document.getElementById('executeResetModalBtn');
    this.dom.appToast = document.getElementById('appToast');
    this.dom.toastMsg = document.getElementById('toastMsg');

    // Subtab Resets & Websites
    this.dom.fullEqBandsList = document.getElementById('fullEqBandsList');
    this.dom.websiteProfilesList = document.getElementById('websiteProfilesList');
    this.dom.saveCurrentSiteBtn = document.getElementById('saveCurrentSiteBtn');
    this.dom.manageSitesBtn = document.getElementById('manageSitesBtn');
    this.dom.resetWebsitesBtn = document.getElementById('resetWebsitesBtn');

    // General Preferences
    this.dom.resetGeneralBtn = document.getElementById('resetGeneralBtn');
    this.dom.autoAttachToggle = document.getElementById('autoAttachToggle');
    this.dom.showLiveVisToggle = document.getElementById('showLiveVisToggle');
    this.dom.factoryResetBtn = document.getElementById('factoryResetBtn');
  }

  setupEventListeners() {
    // 3 Primary Navigation Tabs
    if (this.dom.tabAudioControlsBtn) {
      this.dom.tabAudioControlsBtn.addEventListener('click', () => this.switchMainView('audio-controls'));
    }
    if (this.dom.tabSpotifyPlayerBtn) {
      this.dom.tabSpotifyPlayerBtn.addEventListener('click', () => this.switchMainView('spotify'));
    }
    if (this.dom.tabMoreSettingsBtn) {
      this.dom.tabMoreSettingsBtn.addEventListener('click', () => this.switchMainView('settings'));
    }

    if (this.dom.openEqTabBtn) {
      this.dom.openEqTabBtn.addEventListener('click', () => {
        this.switchMainView('settings');
        this.switchSubTab('equalizer');
      });
    }

    // Sub navigation in settings
    this.dom.subNavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.subtab;
        this.switchSubTab(tab);
      });
    });

    if (this.dom.autoAttachToggle) {
      this.dom.autoAttachToggle.addEventListener('change', (e) => {
          this.state.general.autoAttachTab = e.target.checked;
          this.dispatchAudioUpdate({ general: this.state.general });
      });
    }

    if (this.dom.showLiveVisToggle) {
      this.dom.showLiveVisToggle.addEventListener('change', (e) => {
          this.state.general.showLiveVisualizer = e.target.checked;
          if (this.dom.soundBarsAnim) {
            this.dom.soundBarsAnim.classList.toggle('paused', !e.target.checked);
          }
          this.dispatchAudioUpdate({ general: this.state.general });
      });
    }

    // Theme toggle
    if (this.dom.themeToggleBtn) {
      this.dom.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }
    if (this.dom.closeBtn) {
      this.dom.closeBtn.addEventListener('click', () => window.close());
    }

    // --- Global Master Power Control ---
    if (this.dom.masterProcessingToggle) {
      this.dom.masterProcessingToggle.addEventListener('change', (e) => {
        this.toggleMasterAudio(e.target.checked);
      });
    }
    if (this.dom.masterPowerHeaderBtn) {
      this.dom.masterPowerHeaderBtn.addEventListener('click', () => {
        const nextState = !this.state.processingEnabled;
        this.toggleMasterAudio(nextState);
      });
    }

    // --- Master Volume & Mute ---
    if (this.dom.masterVolumeSlider) {
      this.dom.masterVolumeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.state.masterVolume = val;
        this.state.masterMuted = false;
        this.dom.masterVolumeVal.textContent = `${val}%`;
        this.updateSliderTrack(this.dom.masterVolumeSlider, val, 0, 100);
        this.updateMuteStateVisuals(false);
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ masterVolume: val, masterMuted: false });
      });
    }

    if (this.dom.masterVolumeToggle) {
      this.dom.masterVolumeToggle.addEventListener('change', (e) => {
        this.state.masterVolumeEnabled = e.target.checked;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ masterVolumeEnabled: e.target.checked });
      });
    }

    if (this.dom.muteVolumeBtn) {
      this.dom.muteVolumeBtn.addEventListener('click', () => {
        const nextMute = !this.state.masterMuted;
        this.state.masterMuted = nextMute;
        this.updateMuteStateVisuals(nextMute);
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ masterMuted: nextMute });
      });
    }

    // Balance
    if (this.dom.balanceSlider) {
      this.dom.balanceSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.state.balance = val;
        this.dom.balanceVal.textContent = val === 0 ? '0%' : val > 0 ? `+${val} R` : `${val} L`;
        this.updateSliderTrack(this.dom.balanceSlider, val + 100, 0, 200);
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ balance: val });
      });
    }
    if (this.dom.balanceToggle) {
      this.dom.balanceToggle.addEventListener('change', (e) => {
        this.state.balanceEnabled = e.target.checked;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ balanceEnabled: e.target.checked });
      });
    }

    // Bass Boost
    if (this.dom.bassBoostSlider) {
      this.dom.bassBoostSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.state.bassBoost = val;
        this.dom.bassBoostVal.textContent = `${val}%`;
        this.updateSliderTrack(this.dom.bassBoostSlider, val, 0, 100);
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ bassBoost: val });
      });
    }
    if (this.dom.bassBoostToggle) {
      this.dom.bassBoostToggle.addEventListener('change', (e) => {
        this.state.bassBoostEnabled = e.target.checked;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ bassBoostEnabled: e.target.checked });
      });
    }

    // Vocal Boost
    if (this.dom.vocalBoostSlider) {
      this.dom.vocalBoostSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.state.vocalBoost = val;
        this.dom.vocalBoostVal.textContent = `${val}%`;
        this.updateSliderTrack(this.dom.vocalBoostSlider, val, 0, 100);
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ vocalBoost: val });
      });
    }
    if (this.dom.vocalBoostToggle) {
      this.dom.vocalBoostToggle.addEventListener('change', (e) => {
        this.state.vocalBoostEnabled = e.target.checked;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ vocalBoostEnabled: e.target.checked });
      });
    }

    // Treble Boost
    if (this.dom.trebleBoostSlider) {
      this.dom.trebleBoostSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.state.trebleBoost = val;
        this.dom.trebleBoostVal.textContent = `${val}%`;
        this.updateSliderTrack(this.dom.trebleBoostSlider, val, 0, 100);
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ trebleBoost: val });
      });
    }
    if (this.dom.trebleBoostToggle) {
      this.dom.trebleBoostToggle.addEventListener('change', (e) => {
        this.state.trebleBoostEnabled = e.target.checked;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ trebleBoostEnabled: e.target.checked });
      });
    }

    // Real Volume Booster (100-200%)
    if (this.dom.volumeBoosterSlider) {
      this.dom.volumeBoosterSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.state.volumeBooster = val;
        this.dom.volumeBoosterVal.textContent = `${val}%`;
        this.updateSliderTrack(this.dom.volumeBoosterSlider, val - 100, 0, 100);
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ volumeBooster: val });
      });
    }
    if (this.dom.volumeBoosterToggle) {
      this.dom.volumeBoosterToggle.addEventListener('change', (e) => {
        this.state.volumeBoosterEnabled = e.target.checked;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ volumeBoosterEnabled: e.target.checked });
      });
    }

    // Equalizer Toggle
    if (this.dom.equalizerToggle) {
      this.dom.equalizerToggle.addEventListener('change', (e) => {
        this.state.equalizerEnabled = e.target.checked;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ equalizerEnabled: e.target.checked });
      });
    }

    // Equalizer Vertical Sliders
    this.dom.eqVerticalSliders.forEach((slider, idx) => {
      slider.addEventListener('input', (e) => {
        const gain = parseFloat(e.target.value);
        this.updateBandGain(idx, gain);
      });
    });

    // Quick Mode Selector
    if (this.dom.quickModeSelect) {
      this.dom.quickModeSelect.addEventListener('change', (e) => {
        this.applyQuickMode(e.target.value);
      });
    }

    // Preset Selector
    if (this.dom.presetSelectDropdown) {
      this.dom.presetSelectDropdown.addEventListener('change', (e) => {
        this.applyPreset(e.target.value);
      });
    }

    if (this.dom.spotifyVolumeSlider) {
      this.dom.spotifyVolumeSlider.addEventListener('input', (e) => {
        const vol = parseInt(e.target.value, 10);
        this.dom.spotifyVolumeVal.textContent = `${vol}%`;
        this.updateSliderTrack(this.dom.spotifyVolumeSlider, vol, 0, 100);
        this.state.masterVolume = vol;
        this.state.masterMuted = false;
        if (this.dom.masterVolumeSlider) {
          this.dom.masterVolumeSlider.value = vol;
          this.updateSliderTrack(this.dom.masterVolumeSlider, vol, 0, 100);
        }
        this.updateMuteStateVisuals(false);
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ masterVolume: vol, masterMuted: false });
      });
    }

    if (this.dom.spotifyEngineToggle) {
      this.dom.spotifyEngineToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        this.state.spotifyMode.enabled = enabled;
        this.applySpotifyProfile(this.state.spotifyMode.profile || 'studio', enabled);
      });
    }

    this.dom.spProfileCards.forEach(card => {
      card.addEventListener('click', () => {
        const profile = card.dataset.spProf;
        this.dom.spProfileCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.applySpotifyProfile(profile, true);
      });
    });

    if (this.dom.resetSpotifyPlayerProfilesBtn) {
      this.dom.resetSpotifyPlayerProfilesBtn.addEventListener('click', () => {
        this.promptSectionReset('spotifyMode', 'Spotify Sound Engine');
      });
    }

    // Separation Studio Toggle
    if (this.dom.separationStudioToggle) {
      this.dom.separationStudioToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        this.state.separationStudio.enabled = enabled;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ separationStudio: this.state.separationStudio });
      });
    }

    // Separation Studio Mode Cards
    this.dom.sepModeCards.forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.dataset.sepMode;
        this.dom.sepModeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.state.separationStudio.mode = mode;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ separationStudio: this.state.separationStudio });
      });
    });

    // Vocal Control Studio Slider & Solo/Mute
    if (this.dom.vocalStudioSlider) {
      this.dom.vocalStudioSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.dom.vocalStudioVal.textContent = `${val}%`;
        this.updateSliderTrack(this.dom.vocalStudioSlider, val, 0, 200);
        this.state.separationStudio.vocalVolume = val;
        this.dispatchAudioUpdate({ separationStudio: this.state.separationStudio });
      });
    }

    if (this.dom.toggleVocalTrackBtn) {
      this.dom.toggleVocalTrackBtn.addEventListener('click', () => {
        const active = !this.state.separationStudio.vocalEnabled;
        this.state.separationStudio.vocalEnabled = active;
        this.dom.toggleVocalTrackBtn.classList.toggle('active', active);
        this.dom.toggleVocalTrackBtn.classList.toggle('muted', !active);
        this.dom.vocalTrackStateBadge.textContent = active ? '● Active' : '✕ Muted';
        this.dispatchAudioUpdate({ separationStudio: this.state.separationStudio });
      });
    }

    // Music Control Studio Slider & Solo/Mute
    if (this.dom.musicStudioSlider) {
      this.dom.musicStudioSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.dom.musicStudioVal.textContent = `${val}%`;
        this.updateSliderTrack(this.dom.musicStudioSlider, val, 0, 200);
        this.state.separationStudio.musicVolume = val;
        this.dispatchAudioUpdate({ separationStudio: this.state.separationStudio });
      });
    }

    if (this.dom.toggleMusicTrackBtn) {
      this.dom.toggleMusicTrackBtn.addEventListener('click', () => {
        const active = !this.state.separationStudio.musicEnabled;
        this.state.separationStudio.musicEnabled = active;
        this.dom.toggleMusicTrackBtn.classList.toggle('active', active);
        this.dom.toggleMusicTrackBtn.classList.toggle('muted', !active);
        this.dom.musicTrackStateBadge.textContent = active ? '● Active' : '✕ Muted';
        this.dispatchAudioUpdate({ separationStudio: this.state.separationStudio });
      });
    }

    // Advanced Audio Toggle
    if (this.dom.advancedAudioToggle) {
      this.dom.advancedAudioToggle.addEventListener('change', (e) => {
        this.state.advancedAudio.enabled = e.target.checked;
        this.dispatchAudioUpdate({ advancedAudio: this.state.advancedAudio });
      });
    }

    // Dynamics and Spatial Effects Toggles
    if (this.dom.peakProtectionToggle) {
      this.dom.peakProtectionToggle.addEventListener('change', (e) => {
        this.state.advancedAudio.peakLimiter = e.target.checked;
        this.dispatchAudioUpdate({ advancedAudio: this.state.advancedAudio });
      });
    }
    if (this.dom.loudnessNormToggle) {
      this.dom.loudnessNormToggle.addEventListener('change', (e) => {
        this.state.advancedAudio.loudnessNormalizer = e.target.checked;
        this.dispatchAudioUpdate({ advancedAudio: this.state.advancedAudio });
      });
    }
    if (this.dom.stereoWidenerToggle) {
      this.dom.stereoWidenerToggle.addEventListener('change', (e) => {
        this.state.advancedAudio.stereoEnhancer = e.target.checked;
        this.dispatchAudioUpdate({ advancedAudio: this.state.advancedAudio });
      });
    }

    // Custom Preset Modal
    if (this.dom.openSavePresetModalBtn) {
      this.dom.openSavePresetModalBtn.addEventListener('click', () => {
        this.dom.savePresetModal.classList.add('active');
        this.dom.presetNameInput.value = '';
        this.dom.presetNameInput.focus();
      });
    }
    if (this.dom.cancelPresetModalBtn) {
      this.dom.cancelPresetModalBtn.addEventListener('click', () => {
        this.dom.savePresetModal.classList.remove('active');
      });
    }
    if (this.dom.confirmSavePresetBtn) {
      this.dom.confirmSavePresetBtn.addEventListener('click', () => this.saveCurrentAsCustomPreset());
    }

    // Website Profiles
    if (this.dom.saveCurrentSiteBtn) {
      this.dom.saveCurrentSiteBtn.addEventListener('click', () => this.saveCurrentSiteProfile());
    }
    if (this.dom.manageSitesBtn) {
      this.dom.manageSitesBtn.addEventListener('click', () => {
        this.switchMainView('settings');
        this.switchSubTab('per-website');
      });
    }

    // --- Section-Specific Resets with In-App Confirmation Modal ---
    if (this.dom.resetMasterSectionBtn) {
      this.dom.resetMasterSectionBtn.addEventListener('click', () => {
        this.promptSectionReset('master', 'Master Volume & Balance');
      });
    }
    if (this.dom.resetBoostersSectionBtn) {
      this.dom.resetBoostersSectionBtn.addEventListener('click', () => {
        this.promptSectionReset('boosters', 'Acoustic Boosters');
      });
    }
    if (this.dom.resetEqCardBtn) {
      this.dom.resetEqCardBtn.addEventListener('click', () => {
        this.promptSectionReset('equalizer', 'Equalizer Bands');
      });
    }
    if (this.dom.resetEqSubtabBtn) {
      this.dom.resetEqSubtabBtn.addEventListener('click', () => {
        this.promptSectionReset('equalizer', 'Equalizer Bands');
      });
    }
    if (this.dom.resetStudioBtn) {
      this.dom.resetStudioBtn.addEventListener('click', () => {
        this.promptSectionReset('separationStudio', 'Separation Studio');
      });
    }
    if (this.dom.resetAudioEffectsBtn) {
      this.dom.resetAudioEffectsBtn.addEventListener('click', () => {
        this.promptSectionReset('advancedAudio', 'Audio Effects');
      });
    }
    if (this.dom.resetWebsitesBtn) {
      this.dom.resetWebsitesBtn.addEventListener('click', () => {
        this.promptSectionReset('perWebsiteProfiles', 'Website Profiles');
      });
    }
    if (this.dom.resetGeneralBtn) {
      this.dom.resetGeneralBtn.addEventListener('click', () => {
        this.promptSectionReset('general', 'General Preferences');
      });
    }
    if (this.dom.resetAllBtn) {
      this.dom.resetAllBtn.addEventListener('click', () => {
        this.promptSectionReset('all', 'All Audio Master Settings');
      });
    }
    if (this.dom.factoryResetBtn) {
      this.dom.factoryResetBtn.addEventListener('click', () => {
        this.promptSectionReset('all', 'All Audio Master Settings');
      });
    }

    // Individual Item Quick Resets (without full modal dialog)
    if (this.dom.resetMasterVolBtn) {
      this.dom.resetMasterVolBtn.addEventListener('click', () => {
        this.dom.masterVolumeSlider.value = 75;
        this.dom.masterVolumeVal.textContent = '75%';
        this.updateSliderTrack(this.dom.masterVolumeSlider, 75, 0, 100);
        this.state.masterVolume = 75;
        this.state.masterMuted = false;
        this.updateMuteStateVisuals(false);
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ masterVolume: 75, masterMuted: false });
        this.showToast('Volume restored to 75%');
      });
    }

    if (this.dom.resetBalanceBtn) {
      this.dom.resetBalanceBtn.addEventListener('click', () => {
        this.dom.balanceSlider.value = 0;
        this.dom.balanceVal.textContent = '0%';
        this.updateSliderTrack(this.dom.balanceSlider, 100, 0, 200);
        this.state.balance = 0;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ balance: 0 });
        this.showToast('Balance centered to 0%');
      });
    }

    if (this.dom.resetBassBtn) {
      this.dom.resetBassBtn.addEventListener('click', () => {
        this.dom.bassBoostSlider.value = 65;
        this.dom.bassBoostVal.textContent = '65%';
        this.updateSliderTrack(this.dom.bassBoostSlider, 65, 0, 100);
        this.state.bassBoost = 65;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ bassBoost: 65 });
        this.showToast('Bass Boost restored to 65%');
      });
    }

    if (this.dom.resetVocalBtn) {
      this.dom.resetVocalBtn.addEventListener('click', () => {
        this.dom.vocalBoostSlider.value = 70;
        this.dom.vocalBoostVal.textContent = '70%';
        this.updateSliderTrack(this.dom.vocalBoostSlider, 70, 0, 100);
        this.state.vocalBoost = 70;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ vocalBoost: 70 });
        this.showToast('Vocal Boost restored to 70%');
      });
    }

    if (this.dom.resetTrebleBtn) {
      this.dom.resetTrebleBtn.addEventListener('click', () => {
        this.dom.trebleBoostSlider.value = 60;
        this.dom.trebleBoostVal.textContent = '60%';
        this.updateSliderTrack(this.dom.trebleBoostSlider, 60, 0, 100);
        this.state.trebleBoost = 60;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ trebleBoost: 60 });
        this.showToast('Treble Boost restored to 60%');
      });
    }

    if (this.dom.resetBoosterBtn) {
      this.dom.resetBoosterBtn.addEventListener('click', () => {
        this.dom.volumeBoosterSlider.value = 120;
        this.dom.volumeBoosterVal.textContent = '120%';
        this.updateSliderTrack(this.dom.volumeBoosterSlider, 20, 0, 100);
        this.state.volumeBooster = 120;
        this.updateActiveFeaturesChips();
        this.dispatchAudioUpdate({ volumeBooster: 120 });
        this.showToast('Volume Booster restored to 120%');
      });
    }

    // Confirmation Modal Actions
    if (this.dom.cancelResetModalBtn) {
      this.dom.cancelResetModalBtn.addEventListener('click', () => {
        this.dom.confirmResetModal.classList.remove('active');
        this.pendingResetAction = null;
      });
    }

    if (this.dom.executeResetModalBtn) {
      this.dom.executeResetModalBtn.addEventListener('click', async () => {
        if (this.pendingResetAction) {
          try {
            await this.pendingResetAction();
            this.dom.confirmResetModal.classList.remove('active');
            this.pendingResetAction = null;
          } catch (err) {
            console.error('[Audio Master] Reset failed:', err);
            this.showToast(`Reset failed: ${err.message}`);
          }
        }
      });
    }
  }

  // --- View Switching Among 3 Primary Navigation Panels ---
  switchMainView(viewName) {
    const tabs = {
      'audio-controls': { btn: this.dom.tabAudioControlsBtn, view: this.dom.audioControlsView },
      'spotify': { btn: this.dom.tabSpotifyPlayerBtn, view: this.dom.spotifyPlayerView },
      'settings': { btn: this.dom.tabMoreSettingsBtn, view: this.dom.moreSettingsView }
    };

    Object.entries(tabs).forEach(([key, item]) => {
      if (item.btn) {
        item.btn.classList.toggle('active', key === viewName);
        item.btn.setAttribute('aria-selected', key === viewName ? 'true' : 'false');
      }
      if (item.view) {
        item.view.classList.toggle('active', key === viewName);
      }
    });

  }

  switchSubTab(tabId) {
    this.dom.subNavBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subtab === tabId);
    });

    Object.entries(this.dom.subtabContents).forEach(([id, el]) => {
      if (el) el.style.display = id === tabId ? 'block' : 'none';
    });
  }

  // --- Master Power Audio Logic ---
  toggleMasterAudio(enabled) {
    this.state.processingEnabled = enabled;
    if (this.dom.masterProcessingToggle) this.dom.masterProcessingToggle.checked = enabled;

    // Header Power Button
    if (this.dom.masterPowerHeaderBtn) {
      this.dom.masterPowerHeaderBtn.classList.toggle('active', enabled);
      this.dom.masterPowerHeaderBtn.classList.toggle('bypassed', !enabled);
    }
    if (this.dom.masterPowerHeaderText) {
      this.dom.masterPowerHeaderText.textContent = enabled ? 'ON' : 'OFF';
    }

    // Status Banner Badge & Soundbars
    if (this.dom.statusActiveBadge) {
      this.dom.statusActiveBadge.classList.toggle('inactive', !enabled);
      this.dom.statusActiveBadge.textContent = enabled ? 'Connecting' : 'Off';
    }
    if (this.dom.soundBarsAnim) {
      this.dom.soundBarsAnim.classList.toggle('paused', !enabled);
    }

    if (this.dom.statusMasterNote) {
      this.dom.statusMasterNote.textContent = enabled
        ? 'Your Personal Audio Control Center'
        : 'Stopping audio capture...';
    }

    this.updateActiveFeaturesChips();
    this.dispatchAudioUpdate({ processingEnabled: enabled });
  }

  updateMuteStateVisuals(isMuted) {
    if (!this.dom.muteVolumeBtn) return;
    this.dom.muteVolumeBtn.style.color = isMuted ? 'var(--accent-red)' : 'var(--accent-cyan)';
    this.dom.masterVolumeVal.textContent = isMuted ? 'MUTED' : `${this.state.masterVolume}%`;
    this.dom.masterVolumeVal.style.color = isMuted ? 'var(--accent-red)' : '';
  }

  promptSectionReset(sectionKey, displayName) {
    this.dom.confirmModalTitle.textContent = `Reset ${displayName}?`;
    this.dom.confirmModalDesc.textContent = sectionKey === 'all'
      ? 'Are you sure you want to restore all Audio Master parameters to factory default? Custom presets and website profiles will be reset.'
      : `Are you sure you want to restore ${displayName} to default settings? Other sections will remain unaffected.`;

    this.pendingResetAction = async () => {
      const result = await chrome.runtime.sendMessage({ type: 'RESET_AUDIO_SETTINGS', section: sectionKey });
      if (!result || !result.success) throw new Error(result?.error || 'Reset failed');
      await this.loadSettingsAndSyncUI();
      this.updateCaptureStatus(result);
      this.showToast(`${displayName} restored to defaults.`);
    };

    this.dom.confirmResetModal.classList.add('active');
  }

  showToast(message) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (!this.dom.appToast || !this.dom.toastMsg) return;

    this.dom.toastMsg.textContent = message;
    this.dom.appToast.classList.add('active');

    this.toastTimer = setTimeout(() => {
      this.dom.appToast.classList.remove('active');
    }, 2400);
  }

  updateActiveFeaturesChips() {
    if (!this.state) return;
    const isGlobalOff = this.state.processingEnabled === false;

    // Master Vol
    if (this.dom.chipMasterVol) {
      const isVolMuted = isGlobalOff || this.state.masterMuted || this.state.masterVolumeEnabled === false;
      this.dom.chipMasterVol.textContent = isVolMuted ? 'Vol: Muted' : `Vol: ${this.state.masterVolume}%`;
      this.dom.chipMasterVol.classList.toggle('active', !isVolMuted);
    }

    // Balance
    if (this.dom.chipBalance) {
      const bal = this.state.balance || 0;
      this.dom.chipBalance.textContent = bal === 0 ? 'Bal: Center' : bal > 0 ? `Bal: +${bal}R` : `Bal: ${bal}L`;
      this.dom.chipBalance.classList.toggle('active', bal !== 0);
    }

    // Bass
    if (this.dom.chipBass) {
      const bassOn = !isGlobalOff && this.state.bassBoostEnabled !== false && this.state.bassBoost > 0;
      this.dom.chipBass.textContent = bassOn ? `Bass: ${this.state.bassBoost}%` : 'Bass: Off';
      this.dom.chipBass.classList.toggle('active', bassOn);
    }

    // Vocal
    if (this.dom.chipVocal) {
      const vocalOn = !isGlobalOff && this.state.vocalBoostEnabled !== false && this.state.vocalBoost > 0;
      this.dom.chipVocal.textContent = vocalOn ? `Vocals: ${this.state.vocalBoost}%` : 'Vocals: Off';
      this.dom.chipVocal.classList.toggle('active', vocalOn);
    }

    // Treble
    if (this.dom.chipTreble) {
      const trebleOn = !isGlobalOff && this.state.trebleBoostEnabled !== false && this.state.trebleBoost > 0;
      this.dom.chipTreble.textContent = trebleOn ? `Treble: ${this.state.trebleBoost}%` : 'Treble: Off';
      this.dom.chipTreble.classList.toggle('active', trebleOn);
    }

    // Booster
    if (this.dom.chipBooster) {
      const boostOn = !isGlobalOff && this.state.volumeBoosterEnabled !== false && this.state.volumeBooster > 100;
      this.dom.chipBooster.textContent = boostOn ? `Boost: ${this.state.volumeBooster}%` : 'Boost: 100%';
      this.dom.chipBooster.classList.toggle('active', boostOn);
    }

    // EQ
    if (this.dom.chipEQ) {
      const eqFlat = !this.state.equalizerBands || this.state.equalizerBands.every(g => g === 0);
      const eqOn = !isGlobalOff && this.state.equalizerEnabled !== false && !eqFlat;
      this.dom.chipEQ.textContent = eqOn ? 'EQ: Active' : 'EQ: Flat';
      this.dom.chipEQ.classList.toggle('active', eqOn);
    }

    // Spotify
    if (this.dom.chipSpotify) {
      const spotOn = !isGlobalOff && this.state.spotifyMode && this.state.spotifyMode.enabled;
      this.dom.chipSpotify.textContent = spotOn ? `Spotify: ${this.state.spotifyMode.profile}` : 'Spotify: Off';
      this.dom.chipSpotify.classList.toggle('active', spotOn);
    }

    // Separation
    if (this.dom.chipSep) {
      const sepOn = !isGlobalOff && this.state.separationStudio && this.state.separationStudio.enabled;
      this.dom.chipSep.textContent = sepOn ? `Sep: ${this.state.separationStudio.mode}` : 'Sep: Off';
      this.dom.chipSep.classList.toggle('active', sepOn);
    }
  }

  async loadActiveTab() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs[0]) {
          this.activeTabInfo = tabs[0];
        }
      } catch (err) {
        console.warn('Could not query active tab:', err);
      }
    }
  }

  updateSliderTrack(slider, value, min, max) {
    if (!slider) return;
    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    slider.style.setProperty('--fill-pct', `${pct}%`);
  }

  async loadSettingsAndSyncUI(settings = null) {
    this.state = settings || await storageManager.refreshSettings();

    // Theme (Light / Dark)
    const currentTheme = this.state.general?.theme || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);

    // Global Master Power
    const isMasterOn = this.state.processingEnabled !== false;
    if (this.dom.masterProcessingToggle) this.dom.masterProcessingToggle.checked = isMasterOn;
    if (this.dom.masterPowerHeaderBtn) {
      this.dom.masterPowerHeaderBtn.classList.toggle('active', isMasterOn);
      this.dom.masterPowerHeaderBtn.classList.toggle('bypassed', !isMasterOn);
    }
    if (this.dom.masterPowerHeaderText) {
      this.dom.masterPowerHeaderText.textContent = isMasterOn ? 'ON' : 'OFF';
    }
    if (this.dom.statusActiveBadge) {
      this.dom.statusActiveBadge.classList.toggle('inactive', !isMasterOn);
      this.dom.statusActiveBadge.textContent = isMasterOn ? 'Ready' : 'Off';
    }
    if (this.dom.soundBarsAnim) {
      this.dom.soundBarsAnim.classList.toggle('paused', !isMasterOn);
    }

    // Master Volume
    if (this.dom.masterVolumeSlider) {
      this.dom.masterVolumeSlider.value = this.state.masterVolume;
      this.dom.masterVolumeVal.textContent = this.state.masterMuted ? 'MUTED' : `${this.state.masterVolume}%`;
      this.updateSliderTrack(this.dom.masterVolumeSlider, this.state.masterVolume, 0, 100);
    }
    if (this.dom.masterVolumeToggle) {
      this.dom.masterVolumeToggle.checked = this.state.masterVolumeEnabled !== false;
    }
    this.updateMuteStateVisuals(!!this.state.masterMuted);

    // Balance
    if (this.dom.balanceSlider) {
      this.dom.balanceSlider.value = this.state.balance;
      const bal = this.state.balance;
      this.dom.balanceVal.textContent = bal === 0 ? '0%' : bal > 0 ? `+${bal} R` : `${bal} L`;
      this.updateSliderTrack(this.dom.balanceSlider, bal + 100, 0, 200);
    }
    if (this.dom.balanceToggle) {
      this.dom.balanceToggle.checked = this.state.balanceEnabled !== false;
    }

    // Bass Boost
    if (this.dom.bassBoostSlider) {
      this.dom.bassBoostSlider.value = this.state.bassBoost;
      this.dom.bassBoostVal.textContent = `${this.state.bassBoost}%`;
      this.updateSliderTrack(this.dom.bassBoostSlider, this.state.bassBoost, 0, 100);
    }
    if (this.dom.bassBoostToggle) {
      this.dom.bassBoostToggle.checked = this.state.bassBoostEnabled !== false;
    }

    // Vocal Boost
    if (this.dom.vocalBoostSlider) {
      this.dom.vocalBoostSlider.value = this.state.vocalBoost;
      this.dom.vocalBoostVal.textContent = `${this.state.vocalBoost}%`;
      this.updateSliderTrack(this.dom.vocalBoostSlider, this.state.vocalBoost, 0, 100);
    }
    if (this.dom.vocalBoostToggle) {
      this.dom.vocalBoostToggle.checked = this.state.vocalBoostEnabled !== false;
    }

    // Treble Boost
    if (this.dom.trebleBoostSlider) {
      this.dom.trebleBoostSlider.value = this.state.trebleBoost;
      this.dom.trebleBoostVal.textContent = `${this.state.trebleBoost}%`;
      this.updateSliderTrack(this.dom.trebleBoostSlider, this.state.trebleBoost, 0, 100);
    }
    if (this.dom.trebleBoostToggle) {
      this.dom.trebleBoostToggle.checked = this.state.trebleBoostEnabled !== false;
    }

    // Volume Booster
    if (this.dom.volumeBoosterSlider) {
      this.dom.volumeBoosterSlider.value = this.state.volumeBooster;
      this.dom.volumeBoosterVal.textContent = `${this.state.volumeBooster}%`;
      this.updateSliderTrack(this.dom.volumeBoosterSlider, this.state.volumeBooster - 100, 0, 100);
    }
    if (this.dom.volumeBoosterToggle) {
      this.dom.volumeBoosterToggle.checked = this.state.volumeBoosterEnabled !== false;
    }

    // Equalizer
    if (this.dom.equalizerToggle) {
      this.dom.equalizerToggle.checked = this.state.equalizerEnabled !== false;
    }
    this.state.equalizerBands.forEach((gain, idx) => {
      if (this.dom.eqVerticalSliders[idx]) {
        this.dom.eqVerticalSliders[idx].value = gain;
      }
    });
    this.renderDetailedEqBands();

    // Spotify Mode & Profile
    if (this.state.spotifyMode) {
      if (this.dom.spotifyEngineToggle) {
        this.dom.spotifyEngineToggle.checked = !!this.state.spotifyMode.enabled;
      }
      const currentProfile = this.state.spotifyMode.profile || 'studio';
      this.dom.spProfileCards.forEach(card => {
        card.classList.toggle('active', card.dataset.spProf === currentProfile);
      });
    }

    // Spotify Dedicated Volume
    if (this.dom.spotifyVolumeSlider) {
      const vol = this.state.masterVolume ?? 75;
      this.dom.spotifyVolumeSlider.value = vol;
      this.dom.spotifyVolumeVal.textContent = `${vol}%`;
      this.updateSliderTrack(this.dom.spotifyVolumeSlider, vol, 0, 100);
    }

    // Separation Studio
    if (this.state.separationStudio) {
      if (this.dom.separationStudioToggle) {
        this.dom.separationStudioToggle.checked = !!this.state.separationStudio.enabled;
      }
      this.dom.sepModeCards.forEach(card => {
        card.classList.toggle('active', card.dataset.sepMode === this.state.separationStudio.mode);
      });

      if (this.dom.vocalStudioSlider) {
        this.dom.vocalStudioSlider.value = this.state.separationStudio.vocalVolume;
        this.dom.vocalStudioVal.textContent = `${this.state.separationStudio.vocalVolume}%`;
        this.updateSliderTrack(this.dom.vocalStudioSlider, this.state.separationStudio.vocalVolume, 0, 200);
      }

      if (this.dom.toggleVocalTrackBtn) {
        const vActive = this.state.separationStudio.vocalEnabled !== false;
        this.dom.toggleVocalTrackBtn.classList.toggle('active', vActive);
        this.dom.toggleVocalTrackBtn.classList.toggle('muted', !vActive);
        this.dom.vocalTrackStateBadge.textContent = vActive ? '● Active' : '✕ Muted';
      }

      if (this.dom.musicStudioSlider) {
        this.dom.musicStudioSlider.value = this.state.separationStudio.musicVolume;
        this.dom.musicStudioVal.textContent = `${this.state.separationStudio.musicVolume}%`;
        this.updateSliderTrack(this.dom.musicStudioSlider, this.state.separationStudio.musicVolume, 0, 200);
      }

      if (this.dom.toggleMusicTrackBtn) {
        const mActive = this.state.separationStudio.musicEnabled !== false;
        this.dom.toggleMusicTrackBtn.classList.toggle('active', mActive);
        this.dom.toggleMusicTrackBtn.classList.toggle('muted', !mActive);
        this.dom.musicTrackStateBadge.textContent = mActive ? '● Active' : '✕ Muted';
      }
    }

    // Advanced Audio & Effects
    if (this.state.advancedAudio) {
      if (this.dom.advancedAudioToggle) {
        this.dom.advancedAudioToggle.checked = !!this.state.advancedAudio.enabled;
      }
      if (this.dom.peakProtectionToggle) {
        this.dom.peakProtectionToggle.checked = this.state.advancedAudio.peakLimiter !== false;
      }
      if (this.dom.loudnessNormToggle) {
        this.dom.loudnessNormToggle.checked = this.state.advancedAudio.loudnessNormalizer !== false;
      }
      if (this.dom.stereoWidenerToggle) {
        this.dom.stereoWidenerToggle.checked = this.state.advancedAudio.stereoEnhancer !== false;
      }
    }

    if (this.state.general) {
      if (this.dom.autoAttachToggle) {
        this.dom.autoAttachToggle.checked = this.state.general.autoAttachTab !== false;
      }
      if (this.dom.showLiveVisToggle) {
        this.dom.showLiveVisToggle.checked = this.state.general.showLiveVisualizer !== false;
        if (this.dom.soundBarsAnim) {
          this.dom.soundBarsAnim.classList.toggle('paused', this.state.general.showLiveVisualizer === false);
        }
      }
    }

    if (this.dom.quickModeSelect) {
      this.dom.quickModeSelect.value = this.state.quickMode || 'both';
    }

    // Presets dropdown
    this.updatePresetsDropdown();

    // Website Profiles
    this.renderWebsiteProfiles();

    // Active Feature Chips Strip
    this.updateActiveFeaturesChips();
  }

  // --- 10-Band Equalizer Detail Rendering ---
  renderDetailedEqBands() {
    if (!this.dom.fullEqBandsList) return;
    const bandLabels = ['60Hz', '170Hz', '310Hz', '600Hz', '1kHz', '3kHz', '6kHz', '12kHz', '14kHz', '16kHz'];
    this.dom.fullEqBandsList.innerHTML = '';

    bandLabels.forEach((label, idx) => {
      const gain = this.state.equalizerBands[idx] || 0;
      const row = document.createElement('div');
      row.className = 'control-row';
      row.innerHTML = `
        <span class="control-title">${label}</span>
        <div class="slider-container" style="grid-column: 2 / 4;">
          <input type="range" class="modern-range eq-detail-range" data-band-idx="${idx}" min="-12" max="12" step="0.5" value="${gain}">
        </div>
        <div class="badge-reset-grp">
          <span class="val-badge">${gain > 0 ? `+${gain}` : gain}dB</span>
          <button class="btn-item-reset" title="Reset ${label} to 0dB">↺</button>
        </div>
      `;

      const rangeInput = row.querySelector('.eq-detail-range');
      const valBadge = row.querySelector('.val-badge');
      const resetBtn = row.querySelector('.btn-item-reset');
      this.updateSliderTrack(rangeInput, gain + 12, 0, 24);

      rangeInput.addEventListener('input', (e) => {
        const newGain = parseFloat(e.target.value);
        valBadge.textContent = `${newGain > 0 ? `+${newGain}` : newGain}dB`;
        this.updateSliderTrack(rangeInput, newGain + 12, 0, 24);
        this.updateBandGain(idx, newGain);
      });

      resetBtn.addEventListener('click', () => {
        rangeInput.value = 0;
        valBadge.textContent = '0dB';
        this.updateSliderTrack(rangeInput, 12, 0, 24);
        this.updateBandGain(idx, 0);
      });

      this.dom.fullEqBandsList.appendChild(row);
    });
  }

  updateBandGain(idx, gain) {
    this.state.equalizerBands[idx] = gain;
    if (this.dom.eqVerticalSliders[idx]) {
      this.dom.eqVerticalSliders[idx].value = gain;
    }
    this.updateActiveFeaturesChips();
    this.dispatchAudioUpdate({ equalizerBands: this.state.equalizerBands });
  }

  // --- Presets & Listening Modes ---
  updatePresetsDropdown() {
    if (!this.dom.presetSelectDropdown) return;
    this.dom.presetSelectDropdown.innerHTML = '';

    // Builtin presets
    Object.keys(BUILTIN_PRESETS).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `⭐ ${name}`;
      if (this.state.selectedPreset === name) opt.selected = true;
      this.dom.presetSelectDropdown.appendChild(opt);
    });

    // Custom presets
    if (this.state.customPresets) {
      Object.keys(this.state.customPresets).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = `💾 ${name} (Custom)`;
        if (this.state.selectedPreset === name) opt.selected = true;
        this.dom.presetSelectDropdown.appendChild(opt);
      });
    }
  }

  applyPreset(presetName) {
    const builtin = BUILTIN_PRESETS[presetName];
    const custom = this.state.customPresets ? this.state.customPresets[presetName] : null;
    const preset = builtin || custom;

    if (!preset) return;

    this.state.selectedPreset = presetName;
    if (preset.bands) {
      this.state.equalizerBands = [...preset.bands];
      this.state.equalizerBands.forEach((gain, idx) => {
        if (this.dom.eqVerticalSliders[idx]) this.dom.eqVerticalSliders[idx].value = gain;
      });
      this.renderDetailedEqBands();
    }
    if (typeof preset.bassBoost === 'number') {
      this.state.bassBoost = preset.bassBoost;
      if (this.dom.bassBoostSlider) {
        this.dom.bassBoostSlider.value = preset.bassBoost;
        this.dom.bassBoostVal.textContent = `${preset.bassBoost}%`;
        this.updateSliderTrack(this.dom.bassBoostSlider, preset.bassBoost, 0, 100);
      }
    }
    if (typeof preset.vocalBoost === 'number') {
      this.state.vocalBoost = preset.vocalBoost;
      if (this.dom.vocalBoostSlider) {
        this.dom.vocalBoostSlider.value = preset.vocalBoost;
        this.dom.vocalBoostVal.textContent = `${preset.vocalBoost}%`;
        this.updateSliderTrack(this.dom.vocalBoostSlider, preset.vocalBoost, 0, 100);
      }
    }
    if (typeof preset.trebleBoost === 'number') {
      this.state.trebleBoost = preset.trebleBoost;
      if (this.dom.trebleBoostSlider) {
        this.dom.trebleBoostSlider.value = preset.trebleBoost;
        this.dom.trebleBoostVal.textContent = `${preset.trebleBoost}%`;
        this.updateSliderTrack(this.dom.trebleBoostSlider, preset.trebleBoost, 0, 100);
      }
    }

    this.updateActiveFeaturesChips();
    this.dispatchAudioUpdate({
      selectedPreset: presetName,
      equalizerBands: this.state.equalizerBands,
      bassBoost: this.state.bassBoost,
      vocalBoost: this.state.vocalBoost,
      trebleBoost: this.state.trebleBoost
    });
    this.showToast(`Applied preset: ${presetName}`);
  }

  applySpotifyProfile(profileKey, enableMode = true) {
    const prof = SPOTIFY_PROFILES[profileKey];
    if (!prof) return;

    this.state.spotifyMode.enabled = enableMode;
    this.state.spotifyMode.profile = profileKey;
    if (this.dom.spotifyEngineToggle) this.dom.spotifyEngineToggle.checked = enableMode;

    this.dom.spProfileCards.forEach(card => {
      card.classList.toggle('active', card.dataset.spProf === profileKey);
    });

    if (enableMode) {
      this.state.equalizerBands = [...prof.eqBands];
      this.state.bassBoost = prof.bass;
      this.state.vocalBoost = prof.vocal;
      this.state.trebleBoost = prof.treble;

      // Update UI faders
      if (this.dom.bassBoostSlider) {
        this.dom.bassBoostSlider.value = prof.bass;
        this.dom.bassBoostVal.textContent = `${prof.bass}%`;
        this.updateSliderTrack(this.dom.bassBoostSlider, prof.bass, 0, 100);
      }

      if (this.dom.vocalBoostSlider) {
        this.dom.vocalBoostSlider.value = prof.vocal;
        this.dom.vocalBoostVal.textContent = `${prof.vocal}%`;
        this.updateSliderTrack(this.dom.vocalBoostSlider, prof.vocal, 0, 100);
      }

      if (this.dom.trebleBoostSlider) {
        this.dom.trebleBoostSlider.value = prof.treble;
        this.dom.trebleBoostVal.textContent = `${prof.treble}%`;
        this.updateSliderTrack(this.dom.trebleBoostSlider, prof.treble, 0, 100);
      }

      this.state.equalizerBands.forEach((gain, idx) => {
        if (this.dom.eqVerticalSliders[idx]) this.dom.eqVerticalSliders[idx].value = gain;
      });
      this.renderDetailedEqBands();
    }

    this.updateActiveFeaturesChips();
    this.dispatchAudioUpdate({
      spotifyMode: this.state.spotifyMode,
      equalizerBands: this.state.equalizerBands,
      bassBoost: this.state.bassBoost,
      vocalBoost: this.state.vocalBoost,
      trebleBoost: this.state.trebleBoost
    });
    this.showToast(`Spotify Sound Profile: ${prof.name}`);
  }

  applyQuickMode(mode) {
    this.state.quickMode = mode;
    const modeMap = {
      vocal: 'vocals-only',
      music: 'music-only',
      both: 'both'
    };
    this.state.separationStudio.enabled = mode !== 'both';
    this.state.separationStudio.mode = modeMap[mode] || 'both';
    this.updateActiveFeaturesChips();
    this.dispatchAudioUpdate({
      quickMode: mode,
      separationStudio: this.state.separationStudio
    });
    this.showToast(
      mode === 'both'
        ? 'Listening mode: Vocal + Music'
        : `Listening mode: ${mode === 'vocal' ? 'Vocal Only' : 'Music Only'}`
    );
  }

  async saveCurrentAsCustomPreset() {
    const name = this.dom.presetNameInput.value.trim();
    if (!name) {
      alert('Please enter a name for the custom preset.');
      return;
    }

    const presetData = {
      name,
      bands: [...this.state.equalizerBands],
      bassBoost: this.state.bassBoost,
      vocalBoost: this.state.vocalBoost,
      trebleBoost: this.state.trebleBoost
    };

    try {
      let settings;
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const response = await chrome.runtime.sendMessage({ type: 'SAVE_CUSTOM_PRESET', name, data: presetData });
        if (!response?.success) throw new Error(response?.error || 'No response from service worker');
        settings = response.settings;
      } else {
        settings = await storageManager.saveCustomPreset(name, presetData);
      }
      this.dom.savePresetModal.classList.remove('active');
      await this.loadSettingsAndSyncUI(settings);
      this.showToast(`Saved custom preset: ${name}`);
    } catch (err) {
      console.error('[Audio Master] Preset save failed:', err);
      this.showToast(`Preset save failed: ${err.message}`);
    }
  }

  // --- Per-Website Management ---
  renderWebsiteProfiles() {
    if (!this.dom.websiteProfilesList) return;
    this.dom.websiteProfilesList.innerHTML = '';
    const profiles = this.state.perWebsiteProfiles || {};

    Object.entries(profiles).forEach(([domain, conf]) => {
      const row = document.createElement('div');
      row.className = 'control-row';
      row.style.gridTemplateColumns = '1fr auto';
      row.innerHTML = `
        <div>
          <span class="control-title">${conf.name || domain}</span>
          <p class="control-desc">${domain} &bull; Vol: ${conf.masterVolume || 75}% &bull; Preset: ${conf.preset || 'Default'}</p>
        </div>
        <button class="btn-secondary" style="font-size:10px; padding:3px 8px;">Apply</button>
      `;

      row.querySelector('button').addEventListener('click', () => {
        this.applyPreset(conf.preset || 'Default');
        if (conf.masterVolume) {
          this.dom.masterVolumeSlider.value = conf.masterVolume;
          this.dom.masterVolumeVal.textContent = `${conf.masterVolume}%`;
          this.updateSliderTrack(this.dom.masterVolumeSlider, conf.masterVolume, 0, 100);
          this.dispatchAudioUpdate({ masterVolume: conf.masterVolume });
        }
        this.showToast(`Applied ${conf.name || domain} profile`);
      });

      this.dom.websiteProfilesList.appendChild(row);
    });
  }

  async saveCurrentSiteProfile() {
    if (!this.activeTabInfo || !this.activeTabInfo.url) {
      alert('No active website found to save.');
      return;
    }
    const url = new URL(this.activeTabInfo.url);
    const domain = url.hostname.replace(/^www\./, '');

    const profileData = {
      name: this.activeTabInfo.title ? this.activeTabInfo.title.substring(0, 20) : domain,
      masterVolume: parseInt(this.dom.masterVolumeSlider.value, 10),
      bassBoost: parseInt(this.dom.bassBoostSlider.value, 10),
      vocalBoost: parseInt(this.dom.vocalBoostSlider.value, 10),
      trebleBoost: parseInt(this.dom.trebleBoostSlider.value, 10),
      volumeBooster: parseInt(this.dom.volumeBoosterSlider.value, 10),
      preset: this.state.selectedPreset
    };

    try {
      let settings;
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const response = await chrome.runtime.sendMessage({ type: 'SAVE_DOMAIN_PROFILE', domain, data: profileData });
        if (!response?.success) throw new Error(response?.error || 'No response from service worker');
        settings = response.settings;
      } else {
        settings = await storageManager.saveDomainProfile(domain, profileData);
      }
      await this.loadSettingsAndSyncUI(settings);
      this.showToast(`Saved profile for ${domain}`);
    } catch (err) {
      console.error('[Audio Master] Website profile save failed:', err);
      this.showToast(`Website profile save failed: ${err.message}`);
    }
  }

  // --- Theme Toggle ---
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    this.state.general.theme = next;
    this.dispatchAudioUpdate({ general: this.state.general });
    this.showToast(`Switched to ${next} theme`);
  }

  updateCaptureStatus(status) {
    const active = status.isCapturing && status.contextState === 'running';
    const enabled = this.state.processingEnabled !== false;
    if (this.dom.statusActiveBadge) {
      this.dom.statusActiveBadge.classList.toggle('inactive', !active);
      this.dom.statusActiveBadge.textContent = !enabled ? 'Off' : active ? 'Active' : 'Not capturing';
    }
    if (this.dom.statusMasterNote) {
      this.dom.statusMasterNote.textContent = !enabled
        ? 'Audio processing off'
        : active ? 'Audio processing active' : 'No active audio capture';
    }
  }

  checkEngineStatus(tryAutoCapture = false) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'GET_AUDIO_STATUS' }, (res) => {
        if (chrome.runtime.lastError || !res || !res.success) {
          const error = chrome.runtime.lastError?.message || res?.error || 'Audio status unavailable';
          console.error('[Audio Master] Status failed:', error);
          this.showToast(`Audio status failed: ${error}`);
          return;
        }
        this.updateCaptureStatus(res);
        if (tryAutoCapture && !res.isCapturing && this.state.processingEnabled !== false &&
            this.state.general?.autoAttachTab !== false) {
          chrome.runtime.sendMessage({ type: 'CAPTURE_ACTIVE_TAB' }, capture => {
            if (chrome.runtime.lastError || !capture?.success) {
              const error = chrome.runtime.lastError?.message || capture?.error || 'No response from audio engine';
              console.error('[Audio Master] Capture failed:', error);
              this.showToast(`Capture failed: ${error}`);
              this.checkEngineStatus();
              return;
            }
            this.updateCaptureStatus(capture);
          });
        }
      });
    }
  }

  dispatchAudioUpdate(updates) {
    if (updates.masterVolume !== undefined && this.dom.spotifyVolumeSlider) {
      this.dom.spotifyVolumeSlider.value = updates.masterVolume;
      this.dom.spotifyVolumeVal.textContent = `${updates.masterVolume}%`;
      this.updateSliderTrack(this.dom.spotifyVolumeSlider, updates.masterVolume, 0, 100);
    }
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'AUDIO_PARAM_UPDATE',
        params: updates
      }, (res) => {
        if (chrome.runtime.lastError || !res || !res.success) {
          const error = chrome.runtime.lastError?.message || res?.error || 'No response from audio engine';
          console.error('[Audio Master] Audio update failed:', error);
          this.showToast(`Audio update failed: ${error}`);
          this.checkEngineStatus();
          return;
        }
        this.updateCaptureStatus(res);
      });
    } else {
      storageManager.updateSettings(updates).catch(err => {
        console.error('[Audio Master] Settings save failed:', err);
        this.showToast(`Settings save failed: ${err.message}`);
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupController();
  popup.init();
});
