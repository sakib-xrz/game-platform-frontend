const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 960;
const HEIGHT = 640;

async function generateGreedyGameCard() {
  const assetsDir = path.join(__dirname, '../public/assets/greedy');

  // Helper to trim and resize cleanly
  async function loadTrimmed(filename, maxDim) {
    return sharp(path.join(assetsDir, filename))
      .trim()
      .resize(maxDim, maxDim, { fit: 'inside' })
      .toBuffer();
  }

  const feastBuf = await loadTrimmed('center-feast.png', 240);
  const steakBuf = await loadTrimmed('steak.png', 115);
  const kebabBuf = await loadTrimmed('kebab.png', 115);
  const hamBuf = await loadTrimmed('ham.png', 115);
  const hotdogBuf = await loadTrimmed('hot-dog.png', 120);
  const cornBuf = await loadTrimmed('corn.png', 115);
  const carrotBuf = await loadTrimmed('carrot.png', 110);
  const cabbageBuf = await loadTrimmed('cabbage.png', 115);
  const tomatoBuf = await loadTrimmed('tomato.png', 110);

  // Measure trimmed image dimensions
  const feastMeta = await sharp(feastBuf).metadata();
  const steakMeta = await sharp(steakBuf).metadata();
  const kebabMeta = await sharp(kebabBuf).metadata();
  const hamMeta = await sharp(hamBuf).metadata();
  const hotdogMeta = await sharp(hotdogBuf).metadata();
  const cornMeta = await sharp(cornBuf).metadata();
  const carrotMeta = await sharp(carrotBuf).metadata();
  const cabbageMeta = await sharp(cabbageBuf).metadata();
  const tomatoMeta = await sharp(tomatoBuf).metadata();

  // Wheel center & radius
  const cx = 680;
  const cy = 295;
  const rx = 250;
  const ry = 190;

  // 8 food pedestals arranged symmetrically with perspective
  const pedestals = [
    { code: 'HOTDOG', cx: 680, cy: 135, rx: 50, ry: 26, img: hotdogBuf, meta: hotdogMeta, name: 'Hot Dog' },
    { code: 'KEBAB', cx: 795, cy: 180, rx: 50, ry: 26, img: kebabBuf, meta: kebabMeta, name: 'Kebab' },
    { code: 'HAM', cx: 850, cy: 295, rx: 52, ry: 27, img: hamBuf, meta: hamMeta, name: 'Ham' },
    { code: 'STEAK', cx: 795, cy: 405, rx: 52, ry: 27, img: steakBuf, meta: steakMeta, name: 'Steak' },
    { code: 'CARROT', cx: 680, cy: 450, rx: 50, ry: 26, img: carrotBuf, meta: carrotMeta, name: 'Carrot' },
    { code: 'CORN', cx: 565, cy: 405, rx: 52, ry: 27, img: cornBuf, meta: cornMeta, name: 'Corn' },
    { code: 'CABBAGE', cx: 510, cy: 295, rx: 52, ry: 27, img: cabbageBuf, meta: cabbageMeta, name: 'Cabbage' },
    { code: 'TOMATO', cx: 565, cy: 180, rx: 50, ry: 26, img: tomatoBuf, meta: tomatoMeta, name: 'Tomato' },
  ];

  const bgSvg = `
  <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Background Gradients -->
      <radialGradient id="bgGlow" cx="72%" cy="45%" r="75%">
        <stop offset="0%" stop-color="#8a1232" stop-opacity="1"/>
        <stop offset="28%" stop-color="#560b1e" stop-opacity="1"/>
        <stop offset="60%" stop-color="#28030d" stop-opacity="1"/>
        <stop offset="90%" stop-color="#120106" stop-opacity="1"/>
        <stop offset="100%" stop-color="#080002" stop-opacity="1"/>
      </radialGradient>

      <!-- Volumetric Spotlights -->
      <linearGradient id="spotlight1" x1="45%" y1="0%" x2="68%" y2="85%">
        <stop offset="0%" stop-color="#fff2b3" stop-opacity="0.4"/>
        <stop offset="30%" stop-color="#ffb833" stop-opacity="0.18"/>
        <stop offset="70%" stop-color="#ff6600" stop-opacity="0.04"/>
        <stop offset="100%" stop-color="#ff3300" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="spotlight2" x1="88%" y1="0%" x2="74%" y2="80%">
        <stop offset="0%" stop-color="#ffe699" stop-opacity="0.32"/>
        <stop offset="35%" stop-color="#ffa011" stop-opacity="0.14"/>
        <stop offset="80%" stop-color="#ff4400" stop-opacity="0.02"/>
        <stop offset="100%" stop-color="#ff0000" stop-opacity="0"/>
      </linearGradient>

      <!-- Tournament Table Gradient -->
      <linearGradient id="tableGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#460718"/>
        <stop offset="15%" stop-color="#300411"/>
        <stop offset="55%" stop-color="#1a0208"/>
        <stop offset="100%" stop-color="#080002"/>
      </linearGradient>

      <!-- Metallic Gold Gradients -->
      <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="12%" stop-color="#ffe685"/>
        <stop offset="30%" stop-color="#f5b82e"/>
        <stop offset="52%" stop-color="#9e5d08"/>
        <stop offset="72%" stop-color="#ffda66"/>
        <stop offset="88%" stop-color="#e0991b"/>
        <stop offset="100%" stop-color="#fff8d9"/>
      </linearGradient>

      <linearGradient id="goldBevel" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#4d2400"/>
        <stop offset="20%" stop-color="#b87814"/>
        <stop offset="45%" stop-color="#ffec99"/>
        <stop offset="65%" stop-color="#e09e24"/>
        <stop offset="85%" stop-color="#fffae0"/>
        <stop offset="100%" stop-color="#3b1c00"/>
      </linearGradient>

      <linearGradient id="goldExtrude" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#c48312"/>
        <stop offset="50%" stop-color="#693d03"/>
        <stop offset="100%" stop-color="#2e1900"/>
      </linearGradient>

      <!-- Stage Glows -->
      <radialGradient id="stageBacklight" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ff9900" stop-opacity="0.4"/>
        <stop offset="40%" stop-color="#ff2255" stop-opacity="0.25"/>
        <stop offset="80%" stop-color="#800020" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>

      <radialGradient id="wheelCenterGlow" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stop-color="#ff2a5f" stop-opacity="0.55"/>
        <stop offset="35%" stop-color="#c20d36" stop-opacity="0.35"/>
        <stop offset="75%" stop-color="#3b0513" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#1a0107" stop-opacity="1"/>
      </radialGradient>

      <!-- Badges -->
      <linearGradient id="badgeGold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="25%" stop-color="#ffd557"/>
        <stop offset="65%" stop-color="#e0950b"/>
        <stop offset="100%" stop-color="#8a5300"/>
      </linearGradient>
      <linearGradient id="badgeRuby" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ff94a8"/>
        <stop offset="30%" stop-color="#ff1a4f"/>
        <stop offset="70%" stop-color="#ba0732"/>
        <stop offset="100%" stop-color="#5e0016"/>
      </linearGradient>
      <linearGradient id="badgePurple" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f3a6ff"/>
        <stop offset="30%" stop-color="#ba26e6"/>
        <stop offset="70%" stop-color="#7a0ea1"/>
        <stop offset="100%" stop-color="#3d0354"/>
      </linearGradient>
      <linearGradient id="badgeCyan" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#b8f9ff"/>
        <stop offset="30%" stop-color="#00d4eb"/>
        <stop offset="70%" stop-color="#0080a3"/>
        <stop offset="100%" stop-color="#003d52"/>
      </linearGradient>

      <!-- Filters -->
      <filter id="shadowHeavy" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.85"/>
      </filter>
      <filter id="shadowMedium" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.7"/>
      </filter>
      <filter id="glowGold" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
      <filter id="glowCyan" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
      <filter id="blurAtmosphere" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="40"/>
      </filter>
    </defs>

    <!-- Canvas Background -->
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGlow)"/>

    <!-- Atmosphere Orbs -->
    <circle cx="680" cy="295" r="330" fill="url(#stageBacklight)" filter="url(#blurAtmosphere)"/>
    <circle cx="780" cy="160" r="190" fill="#ff7700" opacity="0.16" filter="url(#blurAtmosphere)"/>
    <circle cx="520" cy="380" r="180" fill="#ff0055" opacity="0.2" filter="url(#blurAtmosphere)"/>

    <!-- Volumetric Spotlights -->
    <polygon points="420,0 580,0 790,580 530,580" fill="url(#spotlight1)"/>
    <polygon points="760,0 900,0 890,560 670,560" fill="url(#spotlight2)"/>

    <!-- Tournament Table Base Surface -->
    <path d="M 280,440 Q 640,390 960,430 L 960,640 L 280,640 Z" fill="url(#tableGradient)"/>
    <path d="M 280,440 Q 640,390 960,430" stroke="url(#goldRim)" stroke-width="6" fill="none" opacity="0.9"/>
    <path d="M 280,445 Q 640,395 960,435" stroke="#ffaa00" stroke-width="2" fill="none" opacity="0.65"/>
    <path d="M 280,448 Q 640,398 960,438" stroke="#3d0716" stroke-width="3" fill="none"/>

    <!-- ==================== 3D ARCADE WHEEL BASE ==================== -->
    <ellipse cx="${cx}" cy="${cy + 45}" rx="${rx + 10}" ry="${ry + 10}" fill="#000000" opacity="0.75" filter="url(#shadowHeavy)"/>
    
    <!-- 3D Extruded Cylinder Rim -->
    <ellipse cx="${cx}" cy="${cy + 24}" rx="${rx}" ry="${ry}" fill="url(#goldExtrude)"/>
    <ellipse cx="${cx}" cy="${cy + 16}" rx="${rx}" ry="${ry}" fill="url(#goldBevel)"/>
    
    <!-- Outer Heavy Beveled Gold Rim -->
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#goldRim)"/>
    
    <!-- Inner Stepped Gold Channel -->
    <ellipse cx="${cx}" cy="${cy + 2}" rx="${rx - 12}" ry="${ry - 10}" fill="#381502"/>
    <ellipse cx="${cx}" cy="${cy - 1}" rx="${rx - 14}" ry="${ry - 12}" fill="url(#goldRim)"/>

    <!-- 16 Glowing Casino Jewel Lights Around Perimeter -->
    <g>
      ${[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x = cx + Math.cos(rad) * (rx - 8);
        const y = cy + Math.sin(rad) * (ry - 7);
        const isGold = i % 2 === 0;
        const mainColor = isGold ? '#fff176' : '#ff3366';
        const glowColor = isGold ? '#ffaa00' : '#ff003c';
        return `
          <circle cx="${x}" cy="${y}" r="8.5" fill="${glowColor}" opacity="0.6" filter="url(#glowGold)"/>
          <circle cx="${x}" cy="${y}" r="5.5" fill="${mainColor}"/>
          <circle cx="${x - 1.5}" cy="${y - 1.5}" r="2" fill="#ffffff" opacity="0.95"/>
        `;
      }).join('')}
    </g>

    <!-- Wheel Interior Surface -->
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 28}" ry="${ry - 24}" fill="url(#wheelCenterGlow)"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 28}" ry="${ry - 24}" stroke="url(#goldRim)" stroke-width="4" fill="none"/>

    <!-- Neon Rings -->
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 36}" ry="${ry - 31}" stroke="#00f6ff" stroke-width="3" fill="none" opacity="0.9" filter="url(#glowCyan)"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 48}" ry="${ry - 42}" stroke="#ff0066" stroke-width="2" fill="none" opacity="0.75"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 60}" ry="${ry - 52}" stroke="url(#goldRim)" stroke-width="1.5" fill="none" opacity="0.6"/>

    <!-- 8 Spoke Divider Rays -->
    <g stroke="url(#goldRim)" stroke-width="3" opacity="0.8">
      <line x1="${cx}" y1="${cy - (ry - 28)}" x2="${cx}" y2="${cy + (ry - 28)}"/>
      <line x1="${cx - (rx - 28)}" y1="${cy}" x2="${cx + (rx - 28)}" y2="${cy}"/>
      <line x1="${cx - 157}" y1="${cy - 118}" x2="${cx + 157}" y2="${cy + 118}"/>
      <line x1="${cx - 157}" y1="${cy + 118}" x2="${cx + 157}" y2="${cy - 118}"/>
    </g>

    <!-- Multiplier Badges -->
    <!-- Top-Right: 45x -->
    <g transform="translate(805, 175)" filter="url(#shadowMedium)">
      <rect x="-28" y="-14" width="56" height="28" rx="14" fill="url(#badgeGold)" stroke="#ffffff" stroke-width="2"/>
      <text x="0" y="6" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="950" fill="#3d1e00" text-anchor="middle">45x</text>
    </g>
    <!-- Right: 25x -->
    <g transform="translate(865, 295)" filter="url(#shadowMedium)">
      <rect x="-26" y="-14" width="52" height="28" rx="14" fill="url(#badgeRuby)" stroke="#ffc0cb" stroke-width="2"/>
      <text x="0" y="6" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="950" fill="#ffffff" text-anchor="middle">25x</text>
    </g>
    <!-- Bottom-Right: 15x -->
    <g transform="translate(805, 415)" filter="url(#shadowMedium)">
      <rect x="-26" y="-14" width="52" height="28" rx="14" fill="url(#badgePurple)" stroke="#f5c2ff" stroke-width="2"/>
      <text x="0" y="6" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="950" fill="#ffffff" text-anchor="middle">15x</text>
    </g>
    <!-- Bottom-Left: 5x -->
    <g transform="translate(555, 415)" filter="url(#shadowMedium)">
      <rect x="-24" y="-14" width="48" height="28" rx="14" fill="url(#badgeCyan)" stroke="#c2f5ff" stroke-width="2"/>
      <text x="0" y="6" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="950" fill="#002d3d" text-anchor="middle">5x</text>
    </g>
    <!-- Top-Left: 10x -->
    <g transform="translate(555, 175)" filter="url(#shadowMedium)">
      <rect x="-26" y="-14" width="52" height="28" rx="14" fill="url(#badgeGold)" stroke="#ffffff" stroke-width="2"/>
      <text x="0" y="6" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="950" fill="#3d1e00" text-anchor="middle">10x</text>
    </g>

    <!-- ==================== 8 LUXURY FOOD PEDESTALS ==================== -->
    ${pedestals.map(p => `
      <g filter="url(#shadowMedium)">
        <ellipse cx="${p.cx}" cy="${p.cy + 8}" rx="${p.rx}" ry="${p.ry}" fill="#000000" opacity="0.55"/>
        <ellipse cx="${p.cx}" cy="${p.cy + 3}" rx="${p.rx}" ry="${p.ry}" fill="url(#goldBevel)"/>
        <ellipse cx="${p.cx}" cy="${p.cy}" rx="${p.rx - 2}" ry="${p.ry - 2}" fill="url(#goldRim)"/>
        <ellipse cx="${p.cx}" cy="${p.cy - 1}" rx="${p.rx - 7}" ry="${p.ry - 5}" fill="#fffef7"/>
        <ellipse cx="${p.cx}" cy="${p.cy - 1}" rx="${p.rx - 12}" ry="${p.ry - 8}" fill="#ffe899" opacity="0.5"/>
        <ellipse cx="${p.cx}" cy="${p.cy - 1}" rx="${p.rx - 18}" ry="${p.ry - 11}" fill="#ffffff" opacity="0.75"/>
      </g>
    `).join('')}

    <!-- ==================== CENTER FEAST GOLDEN TIER ==================== -->
    <g filter="url(#shadowHeavy)">
      <ellipse cx="${cx}" cy="${cy + 22}" rx="122" ry="92" fill="#000000" opacity="0.7"/>
      <ellipse cx="${cx}" cy="${cy + 10}" rx="118" ry="88" fill="url(#goldBevel)"/>
      <ellipse cx="${cx}" cy="${cy + 3}" rx="114" ry="84" fill="url(#goldRim)"/>
      <ellipse cx="${cx}" cy="${cy + 1}" rx="104" ry="76" fill="#fff9e6"/>
      <ellipse cx="${cx}" cy="${cy + 1}" rx="92" ry="66" fill="#ffb700" opacity="0.55" filter="url(#glowGold)"/>
      <ellipse cx="${cx}" cy="${cy + 1}" rx="78" ry="54" fill="#ffffff" opacity="0.6"/>
    </g>

    <!-- ==================== FOREGROUND CASINO CHIPS & COINS ==================== -->
    <!-- Left Chip Stack -->
    <g transform="translate(380, 520)" filter="url(#shadowHeavy)">
      <ellipse cx="0" cy="18" rx="40" ry="16" fill="#8f0e22"/>
      <ellipse cx="0" cy="12" rx="40" ry="16" fill="#d91a38"/>
      <ellipse cx="0" cy="12" rx="30" ry="12" fill="none" stroke="#ffffff" stroke-dasharray="10 7" stroke-width="4"/>
      <circle cx="0" cy="12" r="11" fill="#8f0e22"/>

      <ellipse cx="-6" cy="4" rx="40" ry="16" fill="#094380"/>
      <ellipse cx="-6" cy="-2" rx="40" ry="16" fill="#1877d2"/>
      <ellipse cx="-6" cy="-2" rx="30" ry="12" fill="none" stroke="#ffffff" stroke-dasharray="10 7" stroke-width="4"/>
      <circle cx="-6" cy="-2" r="11" fill="#094380"/>

      <ellipse cx="-4" cy="-14" rx="40" ry="16" fill="#8a5c00"/>
      <ellipse cx="-4" cy="-20" rx="40" ry="16" fill="url(#goldRim)"/>
      <ellipse cx="-4" cy="-20" rx="30" ry="12" fill="none" stroke="#ffffff" stroke-dasharray="10 7" stroke-width="4"/>
      <circle cx="-4" cy="-20" r="11" fill="#f5b300"/>
      <polygon points="-4,-24 -2,-21 1,-21 -1,-19 0,-16 -4,-18 -8,-16 -7,-19 -9,-21 -6,-21" fill="#ffffff"/>
    </g>

    <!-- Right Chip Stack -->
    <g transform="translate(900, 530)" filter="url(#shadowHeavy)">
      <ellipse cx="0" cy="10" rx="42" ry="17" fill="#0f542c"/>
      <ellipse cx="0" cy="4" rx="42" ry="17" fill="#1fad59"/>
      <ellipse cx="0" cy="4" rx="32" ry="13" fill="none" stroke="#ffffff" stroke-dasharray="10 7" stroke-width="4"/>
      <circle cx="0" cy="4" r="12" fill="#0f542c"/>

      <ellipse cx="8" cy="-10" rx="42" ry="17" fill="#660d44"/>
      <ellipse cx="8" cy="-16" rx="42" ry="17" fill="#c41b83"/>
      <ellipse cx="8" cy="-16" rx="32" ry="13" fill="none" stroke="#ffffff" stroke-dasharray="10 7" stroke-width="4"/>
      <circle cx="8" cy="-16" r="12" fill="#660d44"/>
    </g>

    <!-- Golden Coins on Table -->
    <g transform="translate(470, 555)" filter="url(#shadowMedium)">
      <ellipse cx="0" cy="3" rx="28" ry="13" fill="#6b3f00"/>
      <ellipse cx="0" cy="0" rx="28" ry="13" fill="url(#goldRim)"/>
      <ellipse cx="0" cy="0" rx="22" ry="10" stroke="#d4901e" stroke-width="1.8" fill="none"/>
      <polygon points="0,-5 2,-1 6,-1 3,2 4,6 0,3 -4,6 -3,2 -6,-1 -2,-1" fill="#ffffff" opacity="0.95"/>
    </g>
    <g transform="translate(520, 570)" filter="url(#shadowMedium)">
      <ellipse cx="0" cy="2" rx="23" ry="10" fill="#6b3f00"/>
      <ellipse cx="0" cy="0" rx="23" ry="10" fill="url(#goldRim)"/>
      <ellipse cx="0" cy="0" rx="17" ry="7" stroke="#d4901e" stroke-width="1.4" fill="none"/>
    </g>
    <g transform="translate(830, 565)" filter="url(#shadowMedium)">
      <ellipse cx="0" cy="3" rx="30" ry="14" fill="#6b3f00"/>
      <ellipse cx="0" cy="0" rx="30" ry="14" fill="url(#goldRim)"/>
      <ellipse cx="0" cy="0" rx="24" ry="11" stroke="#d4901e" stroke-width="1.8" fill="none"/>
      <polygon points="0,-5 2,-1 6,-1 3,2 4,6 0,3 -4,6 -3,2 -6,-1 -2,-1" fill="#ffffff" opacity="0.95"/>
    </g>

    <!-- Sparkles & Glints -->
    <g fill="#ffffff">
      <path d="M 880,130 Q 880,152 902,152 Q 880,152 880,174 Q 880,152 858,152 Q 880,152 880,130 Z" opacity="0.9" filter="url(#glowGold)"/>
      <path d="M 450,170 Q 450,188 468,188 Q 450,188 450,206 Q 450,188 432,188 Q 450,188 450,170 Z" opacity="0.8" filter="url(#glowGold)"/>
      <path d="M 760,490 Q 760,504 774,504 Q 760,504 760,518 Q 760,504 746,504 Q 760,504 760,490 Z" opacity="0.85"/>
      <path d="M 680,75 Q 680,85 690,85 Q 680,85 680,95 Q 680,85 670,85 Q 680,85 680,75 Z" opacity="0.9"/>
      
      <circle cx="830" cy="100" r="3.5" fill="#fff5cc" opacity="0.85"/>
      <circle cx="920" cy="230" r="3" fill="#ffffff" opacity="0.8"/>
      <circle cx="480" cy="120" r="3" fill="#ffe082" opacity="0.85"/>
      <circle cx="410" cy="370" r="3.5" fill="#ffffff" opacity="0.7"/>
      <circle cx="610" cy="80" r="4" fill="#ffd700" opacity="0.9"/>
      <circle cx="750" cy="65" r="3" fill="#fff" opacity="0.8"/>
    </g>

    <!-- Smooth Dark Ruby Left Vignette for Text Area -->
    <rect x="0" y="0" width="370" height="${HEIGHT}" fill="url(#leftFade)"/>
    <defs>
      <linearGradient id="leftFade" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#100105" stop-opacity="0.99"/>
        <stop offset="40%" stop-color="#1a0209" stop-opacity="0.88"/>
        <stop offset="70%" stop-color="#28030d" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#28030d" stop-opacity="0"/>
      </linearGradient>
    </defs>
  </svg>
  `;

  const bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  const composites = [];

  // Add 8 foods centered on their pedestals
  for (const p of pedestals) {
    const left = Math.round(p.cx - p.meta.width / 2);
    const top = Math.round(p.cy - p.meta.height / 2 - 8); // sit neatly on pedestal
    composites.push({ input: p.img, left, top });
  }

  // Add Center Feast centered on the central tier
  const feastLeft = Math.round(cx - feastMeta.width / 2);
  const feastTop = Math.round(cy - feastMeta.height / 2 - 6);
  composites.push({ input: feastBuf, left: feastLeft, top: feastTop });

  const finalImage = await sharp(bgBuffer)
    .composite(composites)
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(path.join(assetsDir, 'game-card.png'));

  console.log('Successfully generated refined public/assets/greedy/game-card.png', finalImage);
}

generateGreedyGameCard().catch(err => {
  console.error(err);
  process.exit(1);
});
