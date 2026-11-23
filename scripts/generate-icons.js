import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Minimal PNG generator in pure Node without external binary dependencies
function createPNG(width, height, drawFn) {
  // RGBA buffer (width * height * 4)
  const buffer = Buffer.alloc(width * height * 4);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  // PNG filter type 0 (None) before each scanline
  const scanlineLength = width * 4 + 1;
  const filteredData = Buffer.alloc(height * scanlineLength);
  
  for (let y = 0; y < height; y++) {
    filteredData[y * scanlineLength] = 0; // Filter 0
    buffer.copy(filteredData, y * scanlineLength + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(filteredData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  
  const crcData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(crcData);
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 table & function
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Draw Audio Master Logo: glowing purple/cyan soundwave bars on rounded dark background
function drawLogo(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  
  // Background: dark midnight rounded rect
  const r = 0.2; // border radius
  const cx = Math.max(r, Math.min(1 - r, nx));
  const cy = Math.max(r, Math.min(1 - r, ny));
  const dist = Math.hypot(nx - cx, ny - cy);
  if (dist > r) return [0, 0, 0, 0]; // transparent outside rounded rect

  // Dark violet-navy bg
  let bgR = 15, bgG = 18, bgB = 35, bgA = 255;

  // Soundwave bars in center
  const bars = [0.35, 0.65, 0.95, 0.5, 0.8, 0.4];
  const barCount = bars.length;
  const barWidth = 0.09;
  const gap = (0.7 - barCount * barWidth) / (barCount - 1);
  const startX = 0.15;

  for (let i = 0; i < barCount; i++) {
    const bx = startX + i * (barWidth + gap);
    const bh = bars[i] * 0.7;
    const by1 = 0.5 - bh / 2;
    const by2 = 0.5 + bh / 2;

    if (nx >= bx && nx <= bx + barWidth && ny >= by1 && ny <= by2) {
      // Gradient from vibrant neon purple to electric cyan
      const t = i / (barCount - 1);
      const pr = Math.round(168 * (1 - t) + 0 * t);
      const pg = Math.round(85 * (1 - t) + 240 * t);
      const pb = Math.round(247 * (1 - t) + 255 * t);
      return [pr, pg, pb, 255];
    }
  }

  // Border glow
  if (dist > r - 0.05) {
    return [120, 60, 220, 180];
  }

  return [bgR, bgG, bgB, bgA];
}

const iconsDir = path.resolve('icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate PNG sizes
for (const size of [16, 32, 48, 128]) {
  const pngBuf = createPNG(size, size, drawLogo);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngBuf);
  console.log(`Generated icon${size}.png`);
}

// Also generate SVG for sharp vector scaling
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a855f7" />
      <stop offset="50%" stop-color="#7928ca" />
      <stop offset="100%" stop-color="#00f0ff" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="128" height="128" rx="28" fill="#0d1124" stroke="rgba(168, 85, 247, 0.3)" stroke-width="2"/>
  <g filter="url(#glow)">
    <rect x="22" y="44" width="10" height="40" rx="5" fill="url(#waveGrad)" />
    <rect x="38" y="26" width="10" height="76" rx="5" fill="url(#waveGrad)" />
    <rect x="54" y="14" width="10" height="100" rx="5" fill="url(#waveGrad)" />
    <rect x="70" y="32" width="10" height="64" rx="5" fill="url(#waveGrad)" />
    <rect x="86" y="20" width="10" height="88" rx="5" fill="url(#waveGrad)" />
    <rect x="102" y="40" width="10" height="48" rx="5" fill="url(#waveGrad)" />
  </g>
</svg>`;
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf-8');
console.log('Generated icon.svg');
