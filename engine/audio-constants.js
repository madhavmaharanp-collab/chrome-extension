/**
 * Audio Master - Audio Engine Constants & Specifications
 */

export const EQ_FREQUENCIES = [
  { freq: 60, type: 'lowshelf', q: 0.9, label: '60Hz' },
  { freq: 170, type: 'peaking', q: 1.4, label: '170Hz' },
  { freq: 310, type: 'peaking', q: 1.4, label: '310Hz' },
  { freq: 600, type: 'peaking', q: 1.4, label: '600Hz' },
  { freq: 1000, type: 'peaking', q: 1.4, label: '1kHz' },
  { freq: 3000, type: 'peaking', q: 1.4, label: '3kHz' },
  { freq: 6000, type: 'peaking', q: 1.4, label: '6kHz' },
  { freq: 12000, type: 'peaking', q: 1.4, label: '12kHz' },
  { freq: 14000, type: 'peaking', q: 1.4, label: '14kHz' },
  { freq: 16000, type: 'highshelf', q: 0.9, label: '16kHz' }
];

export const AUDIO_CONSTRAINTS = {
  MIN_GAIN_DB: -12,
  MAX_GAIN_DB: 12,
  MIN_VOLUME: 0,
  MAX_VOLUME: 100,
  MIN_BOOST_PCT: 100,
  MAX_BOOST_PCT: 200,
  MIN_BALANCE: -100,
  MAX_BALANCE: 100,
  FFT_SIZE: 128
};
