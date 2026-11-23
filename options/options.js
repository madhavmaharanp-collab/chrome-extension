import { storageManager } from '../storage/storage-manager.js';

const titles = {
  studio: {
    title: 'Vocal & Music Separation Studio',
    desc: 'Manage local Mid/Side DSP controls and separation limits.'
  },
  equalizer: {
    title: 'Equalizer Studio',
    desc: 'Configure 10-band mastering curves and save studio-grade acoustic presets.'
  },
  spotify: {
    title: 'Spotify Mode Engine',
    desc: 'Review optimized sound profiles, transparent loudness normalization, and peak protection.'
  },
  websites: {
    title: 'Per-Website Audio Profiles',
    desc: 'Manage site-specific sound configurations for YouTube, Spotify, Netflix, and custom domains.'
  },
  performance: {
    title: 'Audio Engine Performance & Telemetry',
    desc: 'Inspect real-time Web Audio API execution thread and latency metrics.'
  },
  about: {
    title: 'About Audio Master',
    desc: 'Extension specifications, privacy assurance, and version details.'
  }
};

class OptionsController {
  constructor() {
    this.navButtons = document.querySelectorAll('.nav-item');
    this.sections = document.querySelectorAll('.page-section');
    this.pageTitle = document.getElementById('pageTitle');
    this.pageDesc = document.getElementById('pageDesc');
  }

  async init() {
    const settings = await storageManager.getSettings();
    document.documentElement.setAttribute('data-theme', settings.general?.theme || 'dark');
    this.setupNav();
    this.loadWebsiteProfiles();
  }

  setupNav() {
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        this.navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this.sections.forEach(s => s.classList.remove('active'));
        const target = document.getElementById(`page-${page}`);
        if (target) target.classList.add('active');

        if (titles[page]) {
          this.pageTitle.textContent = titles[page].title;
          this.pageDesc.textContent = titles[page].desc;
        }
      });
    });
  }

  async loadWebsiteProfiles() {
    const listEl = document.getElementById('optionsWebsitesList');
    if (!listEl) return;
    const settings = await storageManager.getSettings();
    const profiles = settings.perWebsiteProfiles || {};

    listEl.innerHTML = '';
    Object.entries(profiles).forEach(([domain, conf]) => {
      const item = document.createElement('div');
      item.className = 'profile-card';
      item.style.marginBottom = '8px';
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4>${conf.name || domain}</h4>
          <span style="font-size:11px; color:#10b981;">Active Profile</span>
        </div>
        <p>Domain: <code>${domain}</code> &bull; Preset: <strong>${conf.preset || 'Default'}</strong> &bull; Volume: ${conf.masterVolume || 75}%</p>
      `;
      listEl.appendChild(item);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const options = new OptionsController();
  options.init();
});
