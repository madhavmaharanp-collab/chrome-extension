/**
 * Audio Master - In-Page Content Script & Spotify Web Player Bridge
 * Monitors media playback and provides two-way control bridge on open.spotify.com
 */

(function() {
  const isSpotify = window.location.hostname.includes('spotify.com');

  // Generic Media Playback Detector
  function notifyActiveMedia() {
    const mediaElements = Array.from(document.querySelectorAll('audio, video'));
    const isPlaying = mediaElements.some(el => !el.paused && !el.ended && el.readyState > 2);

    if (isPlaying) {
      chrome.runtime.sendMessage({
        type: 'MEDIA_PLAYBACK_DETECTED',
        hostname: window.location.hostname
      }).catch(() => {});
    }
  }

  document.addEventListener('play', notifyActiveMedia, true);
  document.addEventListener('pause', notifyActiveMedia, true);
  setTimeout(notifyActiveMedia, 1500);

  // -------------------------------------------------------------------------
  // SPOTIFY WEB PLAYER INTEGRATION BRIDGE
  // -------------------------------------------------------------------------
  if (isSpotify) {
    function getSpotifyState() {
      try {
        // Query track title
        const titleEl = document.querySelector('[data-testid="context-item-info-title"] a') ||
                        document.querySelector('[data-testid="context-item-info-title"]') ||
                        document.querySelector('[data-testid="context-item-link"]');
        const title = titleEl ? titleEl.textContent.trim() : (navigator.mediaSession?.metadata?.title || 'Unknown Track');

        // Query artist
        const artistEl = document.querySelector('[data-testid="context-item-info-artist"] a') ||
                         document.querySelector('[data-testid="context-item-info-artist"]') ||
                         document.querySelector('[data-testid="context-item-info-subtitles"]');
        const artist = artistEl ? artistEl.textContent.trim() : (navigator.mediaSession?.metadata?.artist || 'Spotify Artist');

        // Query cover art
        const imgEl = document.querySelector('[data-testid="cover-art-image"]') ||
                      document.querySelector('img[data-testid="context-item-image"]') ||
                      document.querySelector('.now-playing img');
        const coverArt = imgEl ? imgEl.src : (navigator.mediaSession?.metadata?.artwork?.[0]?.src || '');

        // Query play/pause state
        const playBtn = document.querySelector('[data-testid="control-button-playpause"]');
        const ariaLabel = playBtn ? playBtn.getAttribute('aria-label') : '';
        const isPlaying = ariaLabel ? (ariaLabel.toLowerCase().includes('pause')) : false;

        // Query playback progress
        const posEl = document.querySelector('[data-testid="playback-position"]');
        const durEl = document.querySelector('[data-testid="playback-duration"]');
        const currentTimeStr = posEl ? posEl.textContent.trim() : '0:00';
        const durationStr = durEl ? durEl.textContent.trim() : '0:00';

        return {
          available: true,
          title,
          artist,
          album: navigator.mediaSession?.metadata?.album || 'Spotify Music',
          coverArt,
          isPlaying,
          currentTimeStr,
          durationStr
        };
      } catch (err) {
        return { available: false, error: err.message };
      }
    }

    // Broadcast state updates on change
    function broadcastSpotifyState() {
      const state = getSpotifyState();
      if (state.available) {
        chrome.runtime.sendMessage({
          type: 'SPOTIFY_STATE_UPDATE',
          state
        }).catch(() => {});
      }
    }

    // Observe Spotify player widget mutations for real-time progress & track changes
    const observer = new MutationObserver(() => {
      broadcastSpotifyState();
    });

    function setupObserver() {
      const target = document.querySelector('[data-testid="now-playing-widget"]') ||
                     document.querySelector('.now-playing-bar') ||
                     document.body;
      if (target) {
        observer.observe(target, { childList: true, subtree: true, characterData: true });
        broadcastSpotifyState();
      } else {
        setTimeout(setupObserver, 2000);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupObserver);
    } else {
      setupObserver();
    }

    // Periodically poll to keep track timer smooth
    setInterval(broadcastSpotifyState, 2500);

    // Message listener for Spotify remote control commands
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.target !== 'spotify_content') return;

      switch (message.type) {
        case 'GET_SPOTIFY_STATE':
          sendResponse(getSpotifyState());
          break;

        case 'SPOTIFY_PLAY_PAUSE': {
          const btn = document.querySelector('[data-testid="control-button-playpause"]');
          if (btn) btn.click();
          setTimeout(() => sendResponse(getSpotifyState()), 200);
          return true;
        }

        case 'SPOTIFY_NEXT': {
          const btn = document.querySelector('[data-testid="control-button-skip-forward"]');
          if (btn) btn.click();
          setTimeout(() => sendResponse(getSpotifyState()), 300);
          return true;
        }

        case 'SPOTIFY_PREV': {
          const btn = document.querySelector('[data-testid="control-button-skip-back"]');
          if (btn) btn.click();
          setTimeout(() => sendResponse(getSpotifyState()), 300);
          return true;
        }

        case 'SPOTIFY_SHUFFLE': {
          const btn = document.querySelector('[data-testid="control-button-shuffle"]');
          if (btn) btn.click();
          setTimeout(() => sendResponse(getSpotifyState()), 200);
          return true;
        }

        case 'SPOTIFY_REPEAT': {
          const btn = document.querySelector('[data-testid="control-button-repeat"]');
          if (btn) btn.click();
          setTimeout(() => sendResponse(getSpotifyState()), 200);
          return true;
        }
      }
    });
  }
})();
