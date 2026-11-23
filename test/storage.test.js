import test from 'node:test';
import assert from 'node:assert/strict';
import { StorageManager } from '../storage/storage-manager.js';
import { DEFAULT_SETTINGS, BUILTIN_PRESETS, SPOTIFY_PROFILES } from '../storage/default-settings.js';

test('StorageManager: Initializes with valid default settings', async () => {
  const sm = new StorageManager();
  const settings = await sm.getSettings();

  assert.equal(settings.masterVolume, 75);
  assert.equal(settings.balance, 0);
  assert.equal(settings.volumeBooster, 120);
  assert.equal(settings.equalizerBands.length, 10);
  assert.equal(settings.selectedPreset, 'Default');
  assert.ok(settings.separationStudio);
  assert.ok(settings.spotifyMode);
  assert.equal(settings.spotifyMode.profile, 'studio');
});

test('StorageManager: Updates settings and notifies listeners', async () => {
  const sm = new StorageManager();
  let notified = null;
  const unsubscribe = sm.onChanged((updated) => {
    notified = updated;
  });

  const res = await sm.updateSettings({ masterVolume: 92, bassBoost: 80 });
  assert.equal(res.masterVolume, 92);
  assert.equal(res.bassBoost, 80);
  assert.equal(notified.masterVolume, 92);

  unsubscribe();
});

test('StorageManager: Custom preset save and delete', async () => {
  const sm = new StorageManager();
  const customEq = [2, 3, 4, 1, 0, 0, 1, 2, 3, 4];
  await sm.saveCustomPreset('My Rock EQ', { bands: customEq, bassBoost: 70 });

  let settings = await sm.getSettings();
  assert.ok(settings.customPresets['My Rock EQ']);
  assert.deepEqual(settings.customPresets['My Rock EQ'].bands, customEq);
  assert.equal(settings.selectedPreset, 'My Rock EQ');

  await sm.deleteCustomPreset('My Rock EQ');
  settings = await sm.getSettings();
  assert.equal(settings.customPresets['My Rock EQ'], undefined);
  assert.equal(settings.selectedPreset, 'Default');
});

test('StorageManager: Website profiles retrieval', async () => {
  const sm = new StorageManager();
  const ytProfile = await sm.getSettingsForDomain('youtube.com');
  assert.equal(ytProfile._hasProfile, true);
  assert.equal(ytProfile.preset, 'Vocal Boost');

  const genericProfile = await sm.getSettingsForDomain('unknown-site.org');
  assert.equal(genericProfile._hasProfile, false);
});

test('StorageManager: resetSection resets only the designated section', async () => {
  const sm = new StorageManager();
  // Modify multiple sections
  await sm.updateSettings({
    masterVolume: 99,
    bassBoost: 95,
    equalizerBands: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
  });

  // Reset only equalizer
  await sm.resetSection('equalizer');
  let settings = await sm.getSettings();

  assert.deepEqual(settings.equalizerBands, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  // Other sections must remain untouched
  assert.equal(settings.masterVolume, 99);
  assert.equal(settings.bassBoost, 95);

  // Reset only boosters
  await sm.resetSection('boosters');
  settings = await sm.getSettings();
  assert.equal(settings.bassBoost, 65); // Default bass boost
  assert.equal(settings.masterVolume, 99); // Master volume still untouched
});

test('StorageManager: partial nested updates preserve sibling settings', async () => {
  const sm = new StorageManager();
  await sm.updateSettings({
    separationStudio: {
      enabled: true,
      mode: 'vocals-only',
      vocalVolume: 90,
      musicVolume: 40,
      vocalEnabled: true,
      musicEnabled: false
    }
  });

  let settings = await sm.getSettings();
  assert.equal(settings.separationStudio.mode, 'vocals-only');
  assert.equal(settings.separationStudio.vocalVolume, 90);
  assert.equal(settings.separationStudio.musicVolume, 40);

  await sm.updateSettings({ masterVolume: 55 });
  settings = await sm.getSettings();
  assert.equal(settings.masterVolume, 55);
  assert.equal(settings.separationStudio.mode, 'vocals-only');
  assert.equal(settings.separationStudio.musicEnabled, false);
});
