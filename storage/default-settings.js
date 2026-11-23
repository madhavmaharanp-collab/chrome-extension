/**
 * Audio Master - Default Settings & Presets
 * Schema definition, baseline configuration values, and section-specific defaults.
 */

export const DEFAULT_EQ_BANDS = [
  { freq: 60, gain: 0, label: '60Hz', q: 1.4 },
  { freq: 170, gain: 0, label: '170Hz', q: 1.4 },
  { freq: 310, gain: 0, label: '310Hz', q: 1.4 },
  { freq: 600, gain: 0, label: '600Hz', q: 1.4 },
  { freq: 1000, gain: 0, label: '1kHz', q: 1.4 },
  { freq: 3000, gain: 0, label: '3kHz', q: 1.4 },
  { freq: 6000, gain: 0, label: '6kHz', q: 1.4 },
  { freq: 12000, gain: 0, label: '12kHz', q: 1.4 },
  { freq: 14000, gain: 0, label: '14kHz', q: 1.4 },
  { freq: 16000, gain: 0, label: '16kHz', q: 1.4 }
];

export const BUILTIN_PRESETS = {
  Default: {
    name: 'Default',
    description: 'Flat, transparent response without coloration',
    bassBoost: 0,
    vocalBoost: 0,
    trebleBoost: 0,
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  'Bass Boost': {
    name: 'Bass Boost',
    description: 'Punchy low-end emphasis for electronic, hip-hop, and rock',
    bassBoost: 75,
    vocalBoost: 20,
    trebleBoost: 30,
    bands: [8, 6, 4, 1, 0, 0, 1, 2, 3, 3]
  },
  'Vocal Boost': {
    name: 'Vocal Boost',
    description: 'Crisp speech and dialogue clarity for podcasts, calls, and lectures',
    bassBoost: 10,
    vocalBoost: 85,
    trebleBoost: 40,
    bands: [-2, -1, 0, 2, 6, 7, 4, 2, 1, 0]
  },
  'Treble Boost': {
    name: 'Treble Boost',
    description: 'Bright high-frequency sparkle for acoustic, classical, and details',
    bassBoost: 10,
    vocalBoost: 25,
    trebleBoost: 80,
    bands: [-2, -2, -1, 0, 1, 3, 5, 8, 9, 8]
  },
  Movie: {
    name: 'Movie',
    description: 'Cinematic profile with enhanced dialogues and dynamic low rumble',
    bassBoost: 60,
    vocalBoost: 65,
    trebleBoost: 50,
    bands: [6, 4, 1, 0, 3, 5, 4, 3, 2, 2]
  },
  Music: {
    name: 'Music',
    description: 'Rich, full-spectrum balanced tuning for broad musical enjoyment',
    bassBoost: 50,
    vocalBoost: 40,
    trebleBoost: 50,
    bands: [4, 3, 1, 0, 2, 3, 4, 4, 3, 3]
  }
};

export const SPOTIFY_PROFILES = {
  studio: {
    id: 'studio',
    name: 'Studio Quality',
    description: 'Linear reference response, subtle harmonic warmth, safe limiting',
    eqBands: [0.5, 0.25, 0, 0, 0.25, 0.5, 0.5, 0.25, 0, 0],
    bass: 20,
    vocal: 30,
    treble: 25,
    stereoWidth: 10,
    compThreshold: -18,
    compRatio: 2.5
  },
  bass: {
    id: 'bass',
    name: 'Spotify Bass',
    description: 'Tight sub-bass resonance without mid-bass mud or distortion',
    eqBands: [5, 4, 2, 0, 0, 0, 1, 1, 1, 1],
    bass: 75,
    vocal: 25,
    treble: 30,
    stereoWidth: 20,
    compThreshold: -15,
    compRatio: 3.0
  },
  immersive: {
    id: 'immersive',
    name: 'Immersive',
    description: 'Expanded 3D soundstage with ambient presence and depth',
    eqBands: [2, 1, 0, 0, 1, 2, 3, 4, 4, 3],
    bass: 45,
    vocal: 50,
    treble: 65,
    stereoWidth: 55,
    compThreshold: -20,
    compRatio: 3.5
  },
  clear: {
    id: 'clear',
    name: 'Clear Audio',
    description: 'High-definition presence emphasizing vocals and crisp percussion',
    eqBands: [-1, 0, 0, 1, 3, 4, 3, 2, 2, 2],
    bass: 25,
    vocal: 80,
    treble: 70,
    stereoWidth: 15,
    compThreshold: -16,
    compRatio: 2.5
  }
};

export const SECTION_DEFAULTS = {
  master: {
    masterVolume: 75,
    masterMuted: false,
    masterVolumeEnabled: true,
    balance: 0,
    balanceEnabled: true
  },
  boosters: {
    bassBoost: 65,
    bassBoostEnabled: true,
    vocalBoost: 70,
    vocalBoostEnabled: true,
    trebleBoost: 60,
    trebleBoostEnabled: true,
    volumeBooster: 120,
    volumeBoosterEnabled: true
  },
  equalizer: {
    equalizerEnabled: true,
    equalizerBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    selectedPreset: 'Default'
  },
  spotifyMode: {
    spotifyMode: {
      enabled: false,
      profile: 'studio',
      loudnessNormalization: true,
      peakProtection: true,
      stereoEnhancement: 50,
      bypassAll: false
    }
  },
  separationStudio: {
    separationStudio: {
      enabled: false,
      mode: 'both',
      vocalVolume: 75,
      vocalEnabled: true,
      musicVolume: 35,
      musicEnabled: true,
      aiModelReady: false,
      aiModelLoading: false
    }
  },
  advancedAudio: {
    advancedAudio: {
      enabled: true,
      noiseReduction: true,
      echoCancellation: true,
      dynamicCompression: true,
      peakLimiter: true,
      loudnessNormalizer: true,
      stereoEnhancer: true
    }
  },
  perWebsiteProfiles: {
    perWebsiteProfiles: {
      'youtube.com': {
        name: 'YouTube',
        masterVolume: 80,
        bassBoost: 50,
        vocalBoost: 75,
        trebleBoost: 55,
        volumeBooster: 110,
        preset: 'Vocal Boost'
      },
      'open.spotify.com': {
        name: 'Spotify Web Player',
        masterVolume: 85,
        bassBoost: 70,
        vocalBoost: 40,
        trebleBoost: 65,
        volumeBooster: 115,
        preset: 'Music'
      },
      'netflix.com': {
        name: 'Netflix',
        masterVolume: 90,
        bassBoost: 65,
        vocalBoost: 80,
        trebleBoost: 50,
        volumeBooster: 125,
        preset: 'Movie'
      }
    }
  },
  general: {
    general: {
      theme: 'dark',
      autoAttachTab: true,
      rememberLastTabSettings: true,
      startupPreset: 'Default',
      showLiveVisualizer: true
    }
  }
};

export const DEFAULT_SETTINGS = {
  // Global switch
  processingEnabled: true,

  // Master Volume (0-100)
  masterVolume: 75,
  masterMuted: false,
  masterVolumeEnabled: true,

  // Left/Right Audio Balance (-100 to +100, 0 = center)
  balance: 0,
  balanceEnabled: true,

  // Bass Boost (0-100)
  bassBoost: 65,
  bassBoostEnabled: true,

  // Vocal Boost (0-100)
  vocalBoost: 70,
  vocalBoostEnabled: true,

  // Treble Boost (0-100)
  trebleBoost: 60,
  trebleBoostEnabled: true,

  // Real Volume Booster (100% - 200%)
  volumeBooster: 120,
  volumeBoosterEnabled: true,

  // Equalizer
  equalizerEnabled: true,
  equalizerBands: DEFAULT_EQ_BANDS.map(b => b.gain),

  // Presets
  selectedPreset: 'Default',
  customPresets: {},

  // Quick Modes: 'both' | 'vocal' | 'music'
  quickMode: 'both',

  // Audio Separation Studio
  separationStudio: {
    enabled: false,
    mode: 'both', // 'vocals-only' | 'music-only' | 'both' | 'custom-mix'
    vocalVolume: 75, // 0 - 200%
    vocalEnabled: true,
    musicVolume: 35, // 0 - 200%
    musicEnabled: true,
    aiModelReady: false,
    aiModelLoading: false
  },

  // Spotify Mode / Premium Sound Engine
  spotifyMode: {
    enabled: false,
    profile: 'studio',
    loudnessNormalization: true,
    peakProtection: true,
    stereoEnhancement: 50,
    bypassAll: false
  },

  // Advanced Audio Processing
  advancedAudio: {
    enabled: true,
    noiseReduction: true,
    echoCancellation: true,
    dynamicCompression: true,
    peakLimiter: true,
    loudnessNormalizer: true,
    stereoEnhancer: true
  },

  // Per-website Profiles
  perWebsiteProfiles: {
    'youtube.com': {
      name: 'YouTube',
      masterVolume: 80,
      bassBoost: 50,
      vocalBoost: 75,
      trebleBoost: 55,
      volumeBooster: 110,
      preset: 'Vocal Boost'
    },
    'open.spotify.com': {
      name: 'Spotify Web Player',
      masterVolume: 85,
      bassBoost: 70,
      vocalBoost: 40,
      trebleBoost: 65,
      volumeBooster: 115,
      preset: 'Music'
    },
    'netflix.com': {
      name: 'Netflix',
      masterVolume: 90,
      bassBoost: 65,
      vocalBoost: 80,
      trebleBoost: 50,
      volumeBooster: 125,
      preset: 'Movie'
    }
  },

  // General Settings
  general: {
    theme: 'dark',
    autoAttachTab: true,
    rememberLastTabSettings: true,
    startupPreset: 'Default',
    showLiveVisualizer: true
  }
};
