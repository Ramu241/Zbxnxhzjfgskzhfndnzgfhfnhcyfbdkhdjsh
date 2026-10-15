export interface NumberColorInfo {
  type: 'green' | 'red' | 'red-violet' | 'green-violet';
  name: string;
  badgeBg: string;
  badgeBorder: string;
  glowColor: string;
  isBig: boolean;
  textColor: string;
}

export function getNumberColorDetails(digit: string): NumberColorInfo {
  const d = parseInt(digit, 10);
  const isBig = !isNaN(d) && d >= 5;

  if (digit === '0') {
    return {
      type: 'red-violet',
      name: 'RED + VIOLET',
      badgeBg: 'bg-gradient-to-r from-red-600 via-rose-600 to-purple-600',
      badgeBorder: 'border-rose-400',
      glowColor: 'rgba(244,63,94,0.6)',
      isBig: false,
      textColor: 'text-rose-300'
    };
  }

  if (digit === '5') {
    return {
      type: 'green-violet',
      name: 'GREEN + VIOLET',
      badgeBg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600',
      badgeBorder: 'border-emerald-400',
      glowColor: 'rgba(16,185,129,0.6)',
      isBig: true,
      textColor: 'text-emerald-300'
    };
  }

  // Green numbers: 1, 3, 7, 9
  if (d === 1 || d === 3 || d === 7 || d === 9) {
    return {
      type: 'green',
      name: 'GREEN',
      badgeBg: 'bg-gradient-to-r from-emerald-600 to-green-500',
      badgeBorder: 'border-emerald-400',
      glowColor: 'rgba(16,185,129,0.7)',
      isBig,
      textColor: 'text-emerald-400'
    };
  }

  // Red numbers: 2, 4, 6, 8 (or default)
  return {
    type: 'red',
    name: 'RED',
    badgeBg: 'bg-gradient-to-r from-red-600 to-rose-500',
    badgeBorder: 'border-rose-400',
    glowColor: 'rgba(239,68,68,0.7)',
    isBig,
    textColor: 'text-rose-400'
  };
}

export function getNumberImageSrc(digit: string, _isBigIgnored?: boolean): string {
  const num = digit.toString();
  
  if (num === '0') {
    // Red & Violet half-and-half glossy game sphere
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <defs>
        <radialGradient id="redGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#ff7b90"/>
          <stop offset="45%" stop-color="#e11d48"/>
          <stop offset="100%" stop-color="#880522"/>
        </radialGradient>
        <radialGradient id="violetGrad" cx="65%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#d8b4fe"/>
          <stop offset="45%" stop-color="#9333ea"/>
          <stop offset="100%" stop-color="#581c87"/>
        </radialGradient>
        <linearGradient id="splitClip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#ffffff"/>
        </linearGradient>
        <filter id="shadow0" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#e11d48" flood-opacity="0.45"/>
        </filter>
        <linearGradient id="glassShine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
          <stop offset="35%" stop-color="#ffffff" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill="#1e1b4b" filter="url(#shadow0)"/>
      <g clip-path="url(#ballClip0)">
        <clipPath id="ballClip0">
          <circle cx="60" cy="60" r="54"/>
        </clipPath>
        <!-- Left half red -->
        <rect x="0" y="0" width="60" height="120" fill="url(#redGrad)"/>
        <!-- Right half violet -->
        <rect x="60" y="0" width="60" height="120" fill="url(#violetGrad)"/>
        <!-- Glass shine crescent -->
        <ellipse cx="60" cy="24" rx="38" ry="16" fill="url(#glassShine)"/>
        <path d="M 60 6 L 60 114" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
      </g>
      <!-- Outer metallic rim -->
      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
      <!-- Number text -->
      <text x="60" y="74" text-anchor="middle" font-family="'Orbitron', sans-serif" font-weight="900" font-size="46" fill="#ffffff" filter="drop-shadow(0px 3px 4px rgba(0,0,0,0.8))">0</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  if (num === '5') {
    // Green & Violet half-and-half glossy game sphere
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <defs>
        <radialGradient id="greenGrad5" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#6ee7b7"/>
          <stop offset="45%" stop-color="#059669"/>
          <stop offset="100%" stop-color="#064e3b"/>
        </radialGradient>
        <radialGradient id="violetGrad5" cx="65%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#d8b4fe"/>
          <stop offset="45%" stop-color="#9333ea"/>
          <stop offset="100%" stop-color="#581c87"/>
        </radialGradient>
        <filter id="shadow5" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#10b981" flood-opacity="0.45"/>
        </filter>
        <linearGradient id="glassShine5" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
          <stop offset="35%" stop-color="#ffffff" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill="#064e3b" filter="url(#shadow5)"/>
      <g clip-path="url(#ballClip5)">
        <clipPath id="ballClip5">
          <circle cx="60" cy="60" r="54"/>
        </clipPath>
        <!-- Left half green -->
        <rect x="0" y="0" width="60" height="120" fill="url(#greenGrad5)"/>
        <!-- Right half violet -->
        <rect x="60" y="0" width="60" height="120" fill="url(#violetGrad5)"/>
        <!-- Glass shine crescent -->
        <ellipse cx="60" cy="24" rx="38" ry="16" fill="url(#glassShine5)"/>
        <path d="M 60 6 L 60 114" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
      </g>
      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
      <text x="60" y="74" text-anchor="middle" font-family="'Orbitron', sans-serif" font-weight="900" font-size="46" fill="#ffffff" filter="drop-shadow(0px 3px 4px rgba(0,0,0,0.8))">5</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  const d = parseInt(num, 10);
  const isGreen = d === 1 || d === 3 || d === 7 || d === 9;

  if (isGreen) {
    // Rich Green Glossy Game Ball
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <defs>
        <radialGradient id="greenBallGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#a7f3d0"/>
          <stop offset="25%" stop-color="#34d399"/>
          <stop offset="60%" stop-color="#059669"/>
          <stop offset="100%" stop-color="#064e3b"/>
        </radialGradient>
        <filter id="shadowGreen" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#10b981" flood-opacity="0.6"/>
        </filter>
        <linearGradient id="glassShineG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
          <stop offset="35%" stop-color="#ffffff" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill="url(#greenBallGrad)" filter="url(#shadowGreen)"/>
      <ellipse cx="60" cy="24" rx="38" ry="16" fill="url(#glassShineG)"/>
      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
      <text x="60" y="74" text-anchor="middle" font-family="'Orbitron', sans-serif" font-weight="900" font-size="48" fill="#ffffff" filter="drop-shadow(0px 3px 4px rgba(0,0,0,0.85))">${num}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // Rich Red Glossy Game Ball (2, 4, 6, 8)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <defs>
      <radialGradient id="redBallGrad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#fecdd3"/>
        <stop offset="25%" stop-color="#f43f5e"/>
        <stop offset="60%" stop-color="#e11d48"/>
        <stop offset="100%" stop-color="#881337"/>
      </radialGradient>
      <filter id="shadowRed" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#ef4444" flood-opacity="0.6"/>
      </filter>
      <linearGradient id="glassShineR" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
        <stop offset="35%" stop-color="#ffffff" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="54" fill="url(#redBallGrad)" filter="url(#shadowRed)"/>
    <ellipse cx="60" cy="24" rx="38" ry="16" fill="url(#glassShineR)"/>
    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
    <text x="60" y="74" text-anchor="middle" font-family="'Orbitron', sans-serif" font-weight="900" font-size="48" fill="#ffffff" filter="drop-shadow(0px 3px 4px rgba(0,0,0,0.85))">${num}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
