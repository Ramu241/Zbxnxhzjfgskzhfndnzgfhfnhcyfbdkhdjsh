export function getNumberImageSrc(digit: string, isBig: boolean): string {
  const d = parseInt(digit, 10);
  
  // Determine standard Wingo color theme
  let mainColor = '#10b981'; // Green default
  let secondaryColor = '#059669';
  let isDualGradient = false;
  let dualColor = '#a855f7'; // Violet

  if (d === 0) {
    mainColor = '#ef4444'; // Red
    secondaryColor = '#be123c';
    dualColor = '#a855f7'; // Violet
    isDualGradient = true;
  } else if (d === 5) {
    mainColor = '#10b981'; // Green
    secondaryColor = '#047857';
    dualColor = '#a855f7'; // Violet
    isDualGradient = true;
  } else if ([2, 4, 6, 8].includes(d)) {
    mainColor = '#f43f5e'; // Red
    secondaryColor = '#be123c';
  } else {
    // 1, 3, 7, 9 -> Green
    mainColor = '#10b981';
    secondaryColor = '#047857';
  }

  const ringColor = isBig ? '#fbbf24' : '#00c8ff';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <defs>
      <filter id="glow-${d}" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="ballGrad-${d}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${mainColor}" />
        <stop offset="${isDualGradient ? '50%' : '100%'}" stop-color="${secondaryColor}" />
        ${isDualGradient ? `<stop offset="100%" stop-color="${dualColor}" />` : ''}
      </linearGradient>
      <radialGradient id="shine-${d}" cx="35%" cy="30%" r="60%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    
    <!-- Outer Glow Aura -->
    <circle cx="50" cy="50" r="42" fill="none" stroke="${ringColor}" stroke-width="2.5" opacity="0.8" filter="url(#glow-${d})"/>
    
    <!-- Main Colored Wingo Ball -->
    <circle cx="50" cy="50" r="38" fill="url(#ballGrad-${d})" stroke="#ffffff" stroke-width="2" />
    
    <!-- Shiny Highlight -->
    <circle cx="50" cy="50" r="38" fill="url(#shine-${d})" />
    
    <!-- Digit Text -->
    <text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="'Orbitron', sans-serif" font-weight="900" font-size="44" style="text-shadow: 0 0 10px rgba(0,0,0,0.8);">${digit}</text>
  </svg>`;
  
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
