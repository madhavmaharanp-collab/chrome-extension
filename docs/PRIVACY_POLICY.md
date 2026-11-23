# Privacy Policy — Audio Master Chrome Extension

**Last Updated:** November 2026

Audio Master ("we", "our", or "the extension") is committed to respecting and protecting user privacy. This Privacy Policy details our data practices and guarantees complete user privacy.

---

### 1. Zero Audio Data Transmission
- Audio Master processes all sound strictly on your local machine using the browser's built-in **Web Audio API**.
- Audio streams captured from your browser tabs are **never** recorded, stored on any server, or transmitted over the internet.
- All filtering, amplification, equalization, and AI source separation are computed on-device in real-time.

---

### 2. No Personal Data Collection
- Audio Master does **not** collect, track, or share personal identification information such as names, email addresses, IP addresses, or browsing history.
- The extension does **not** inject tracking pixels, analytics cookies, or advertisements.

---

### 3. Local Storage Usage
The extension uses the Chrome Storage API (`chrome.storage.local`) exclusively to save your audio preferences, including:
- Equalizer frequency gains
- Master volume, bass, vocal, and treble boost levels
- Custom user-created presets
- Configured website profiles (e.g. YouTube, Spotify)
- UI theme preferences (dark/light)

This data is stored locally in your browser profile and is never sent to external servers.

---

### 4. Permissions Explanation
- `tabCapture`: Required solely to tap into the active tab's audio output and route it through the Web Audio enhancement graph.
- `offscreen`: Required in Chrome Extension Manifest V3 to host continuous, uninterrupted AudioContext playback without audio stuttering.
- `storage`: Required to remember your sound presets and custom website settings across browser sessions.
- `activeTab`: Used to display the active domain name (e.g., YouTube) in the footer status bar and load matching custom profiles.

---

### 5. Contact
If you have any questions or feedback regarding Audio Master, you can reach the developers via the GitHub repository issues tab or support channels.
