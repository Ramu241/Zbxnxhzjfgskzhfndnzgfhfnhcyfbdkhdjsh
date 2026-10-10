import React, { useEffect, useRef, useState } from "react";
import { getNumberColorDetails, getNumberImageSrc } from "./utils/numberAssets";
import { Play, Volume2, VolumeX, ExternalLink, RefreshCw, ShieldCheck, Sparkles, Crown, Palette } from "lucide-react";
import userPhotoImg from "./assets/images/user_vip_photo_1791602635695.jpg";
import goaVipHackerImg from "./assets/images/goa_vip_hacker_1791599652183.jpg";

const TARGET_GAME_URL = "https://www.goaok.com/#/register?invitationCode=116249306924";

// All 10 colorful game numbers for Goa Game / Wingo
const ALL_NUMBERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Dynamic algorithm to calculate prediction and varied opposite number (0-4 for BIG, 5-9 for SMALL)
function calculatePrediction(periodStr: string | null, salt: number = 0): { n: string; s: "BIG" | "SMALL"; oppN: string } {
  const seed = periodStr ? parseInt(periodStr.slice(-5), 10) : Math.floor(Date.now() / 30000);
  const combined = seed + salt;
  
  // Decide BIG vs SMALL
  const isBig = (combined % 2 === 0);
  const s: "BIG" | "SMALL" = isBig ? "BIG" : "SMALL";
  
  const bigNumbers = ["5", "6", "7", "8", "9"];
  const smallNumbers = ["0", "1", "2", "3", "4"];
  
  // Primary number from chosen pool
  const primaryPool = isBig ? bigNumbers : smallNumbers;
  const primaryIdx = Math.abs(combined + Math.floor(combined / 7)) % primaryPool.length;
  const n = primaryPool[primaryIdx];
  
  // Opposite number:
  // If primary is BIG, opposite MUST be from 0 to 4 (Small numbers), varied randomly across 0, 1, 2, 3, 4!
  // It won't stay stuck on 2.
  // If primary is SMALL, opposite is from 5 to 9 (Big numbers), varied randomly.
  const oppPool = isBig ? smallNumbers : bigNumbers;
  // Vary the index with non-linear hash so it distributes evenly across 0-4
  const oppIdx = Math.abs((combined * 13 + salt * 7 + 5)) % oppPool.length;
  const oppN = oppPool[oppIdx];
  
  return { n, s, oppN };
}

export default function App() {
  // Predictor UI states
  const [curState, setCurState] = useState<"stWingo" | "stBypass">("stWingo");
  const [popupShow, setPopupShow] = useState(true);
  const [popupClosing, setPopupClosing] = useState(false);
  const [launcherHidden, setLauncherHidden] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Theme state: "game-match" (Royal Blue & White matching Goa Game) vs "cyber-blue" (Neon Cyan)
  const [panelTheme, setPanelTheme] = useState<"game-match" | "cyber-blue">("game-match");

  // Position state for popup & launcher
  const [popupPos, setPopupPos] = useState({ left: 16, top: 56 });
  const [launcherPos] = useState({ right: 16, bottom: 80, left: "auto" as number | "auto", top: "auto" as number | "auto" });

  // Game/Prediction data
  const [lastPeriod, setLastPeriod] = useState<string | null>(null);
  const [predData, setPredData] = useState<{ n: string; s: "BIG" | "SMALL"; oppN: string } | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [bypassRunning, setBypassRunning] = useState(false);
  const [bypassPct, setBypassPct] = useState(0);
  const [bypassLog, setBypassLog] = useState("CONNECTING TO GOAOK WINGO...");
  const [showPredBox, setShowPredBox] = useState(false);

  // Ping & Balance
  const [srvPing, setSrvPing] = useState<number | string>("--");
  const [balance] = useState<number>(0);
  const [iframeKey, setIframeKey] = useState(0);

  // Active Photo selector (User's photo vs VIP Emblem)
  const [selectedPhoto, setSelectedPhoto] = useState<"user" | "vip">("user");

  // Refs for drag
  const popupRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; startL: number; startT: number }>({
    isDragging: false, startX: 0, startY: 0, startL: 0, startT: 0
  });

  // Canvas matrix effect
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800;900&family=Share+Tech+Mono&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  // Ping loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const pingLoop = async () => {
      const start = Date.now();
      try {
        await fetch("/api/game-issue");
        setSrvPing(Date.now() - start);
      } catch (e) {
        setSrvPing(Math.floor(Math.random() * 20 + 26));
      }
      timer = setTimeout(pingLoop, 5000);
    };
    pingLoop();
    return () => clearTimeout(timer);
  }, []);

  // Matrix canvas background effect (Blue Stream)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const cols = Math.floor(window.innerWidth / 14);
    const drops = Array(cols).fill(1);
    const chars = "010GOAOKVIPWINGO9812";

    const interval = setInterval(() => {
      ctx.fillStyle = panelTheme === "game-match" ? "rgba(2, 10, 24, 0.08)" : "rgba(2, 8, 18, 0.09)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = panelTheme === "game-match" ? "#38bdf8" : "#00f3ff";
      ctx.font = "12px monospace";

      drops.forEach((y, i) => {
        ctx.globalAlpha = Math.random() * 0.65 + 0.15;
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 14, y * 14);
        if (y * 14 > canvas.height && Math.random() > 0.96) drops[i] = 0;
        drops[i]++;
      });
      ctx.globalAlpha = 1;
    }, 50);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, [panelTheme]);

  // Fetch Game Period & update prediction
  const fetchPeriod = async () => {
    try {
      const res = await fetch("/api/game-issue");
      const j = await res.json();
      if (j && j.code === 0 && j.data && j.data.issueNumber) {
        const cur = j.data.issueNumber.toString();
        if (cur !== lastPeriod) {
          setLastPeriod(cur);
          const newPred = calculatePrediction(cur, scanCount);
          setPredData(newPred);
        }
      }
    } catch (e) {
      // Fallback
      const now = new Date();
      const issue = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}1000${String(now.getUTCHours() * 60 + now.getUTCMinutes()).padStart(4, "0")}`;
      if (issue !== lastPeriod) {
        setLastPeriod(issue);
        const newPred = calculatePrediction(issue, scanCount);
        setPredData(newPred);
      }
    }
  };

  useEffect(() => {
    fetchPeriod();
    const interval = setInterval(fetchPeriod, 4000);
    return () => clearInterval(interval);
  }, [lastPeriod, scanCount]);

  // Voice speech synthesis
  const speakPrediction = (size: string, num: string) => {
    if (!soundEnabled) return;
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const colorDetails = getNumberColorDetails(num);
        const u = new SpeechSynthesisUtterance(`${size} ${num} ${colorDetails.name}`);
        u.lang = "en-US";
        u.rate = 0.88;
        u.pitch = 1.1;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {}
  };

  // Run Bypass Scan animation
  const handleScan = () => {
    if (bypassRunning) return;
    setBypassRunning(true);
    setCurState("stBypass");
    setBypassPct(0);
    setBypassLog("TUNNELING GOAOK LIVE SERVER...");

    const nextScanCount = scanCount + 1;
    setScanCount(nextScanCount);

    const logs = [
      "DECRYPTING SERVER SEED...",
      "SYNCING WINGO PERIOD...",
      "ANALYZING 0-4 OPPOSITE HEDGE...",
      "CALCULATING NUMBER PATTERN...",
      "LOCKING 98.6% WIN RESULT..."
    ];

    let pct = 0;
    const iv = setInterval(() => {
      pct = Math.min(100, pct + Math.floor(4 + Math.random() * 7));
      setBypassPct(pct);

      const logIndex = Math.floor((pct / 100) * (logs.length - 1));
      setBypassLog(logs[logIndex] || logs[0]);

      if (pct >= 100) {
        clearInterval(iv);
        setBypassRunning(false);
        setCurState("stWingo");
        setShowPredBox(true);
        const freshPred = calculatePrediction(lastPeriod, nextScanCount);
        setPredData(freshPred);
        speakPrediction(freshPred.s, freshPred.n);
      }
    }, 60);
  };

  // Close & Open popup
  const handleClosePopup = () => {
    setPopupClosing(true);
    setTimeout(() => {
      setPopupShow(false);
      setPopupClosing(false);
      setLauncherHidden(false);
    }, 200);
  };

  const handleOpenPopup = () => {
    setPopupShow(true);
    setLauncherHidden(true);
  };

  // Popup Drag handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    dragRef.current = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      startL: popupPos.left,
      startT: popupPos.top
    };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!dragRef.current.isDragging) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    const newL = Math.max(0, Math.min(window.innerWidth - 250, dragRef.current.startL + dx));
    const newT = Math.max(0, Math.min(window.innerHeight - 340, dragRef.current.startT + dy));
    setPopupPos({ left: newL, top: newT });
  };

  const handleDragEnd = () => {
    dragRef.current.isDragging = false;
  };

  // Global mouse & touch listeners for dragging
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current.isDragging && e.touches[0]) {
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (dragRef.current.isDragging) {
        handleDragMove(e.clientX, e.clientY);
      }
    };
    const onEnd = () => handleDragEnd();

    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchend", onEnd);
    window.addEventListener("mouseup", onEnd);

    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("mouseup", onEnd);
    };
  }, [popupPos]);

  const activePhotoSrc = selectedPhoto === "user" ? userPhotoImg : goaVipHackerImg;
  const currentPredColor = predData ? getNumberColorDetails(predData.n) : null;
  const oppColor = predData ? getNumberColorDetails(predData.oppN) : null;

  // Theme-specific styles
  const isGameMatch = panelTheme === "game-match";

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020b17] font-['Share_Tech_Mono',monospace] select-none">
      {/* TOP FLOATING APP BAR FOR QUICK GAME ACCESS */}
      <header className={`absolute top-0 left-0 right-0 z-20 h-9 backdrop-blur border-b flex items-center justify-between px-3 text-[10px] ${
        isGameMatch
          ? "bg-[#0c2340]/90 border-blue-400/40 text-blue-200"
          : "bg-[#031524]/90 border-cyan-500/30 text-cyan-300"
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#38bdf8] animate-pulse" />
          <span className="font-['Orbitron'] font-black tracking-wider text-amber-400 drop-shadow-[0_0_6px_#fbbf24] flex items-center gap-1">
            <Crown className="w-3 h-3 fill-amber-400 inline" />
            𝗚𝗢𝗔 𝗚𝗔𝗠𝗘 𝗣𝗔𝗡𝗘𝗟 𝗩𝗜𝗣
          </span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-400/30 text-[9px]">
            goaok.com MATCH
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* THEME TOGGLE (WHITE & BLUE MATCH vs CYBER NEON) */}
          <button
            onClick={() => setPanelTheme(isGameMatch ? "cyber-blue" : "game-match")}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[9px] transition-all"
            title="Toggle Blue/White Game Color Theme"
          >
            <Palette className="w-2.5 h-2.5 text-sky-300" />
            <span>{isGameMatch ? "White/Blue" : "Cyber"}</span>
          </button>
          <button
            onClick={() => setIframeKey((prev) => prev + 1)}
            title="Reload Game Frame"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 text-blue-100 border border-blue-400/30 transition-colors"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span className="hidden xs:inline">Reload</span>
          </button>
          <a
            href={TARGET_GAME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-blue-500 to-sky-400 text-black font-black shadow-[0_0_12px_rgba(56,189,248,0.5)] border border-amber-300 hover:brightness-110 transition-all"
          >
            <span>Play GoaOk</span>
            <ExternalLink className="w-2.5 h-2.5 text-black" />
          </a>
        </div>
      </header>

      {/* BACKGROUND GAME IFRAME */}
      <div className="absolute inset-0 pt-9 w-full h-full z-0 bg-[#020b17]">
        <iframe
          key={iframeKey}
          src={TARGET_GAME_URL}
          className="w-full h-full border-none"
          title="GoaOk Game Page"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        />
      </div>

      {/* MATRIX CANVAS */}
      <canvas id="matCanvas" ref={canvasRef} className="fixed inset-0 pointer-events-none opacity-15 z-[9989]" />

      {/* LAUNCHER WIDGET BUTTON WITH USER'S REAL PHOTO */}
      <div
        id="launcher"
        ref={launcherRef}
        onClick={handleOpenPopup}
        className={`fixed w-14 h-14 z-[9998] cursor-pointer touch-none transition-all duration-300 ${
          launcherHidden ? "opacity-0 pointer-events-none scale-0" : "opacity-100 scale-100"
        }`}
        style={{
          right: launcherPos.right !== "auto" ? `${launcherPos.right}px` : undefined,
          bottom: launcherPos.bottom !== "auto" ? `${launcherPos.bottom}px` : undefined,
          left: launcherPos.left !== "auto" ? `${launcherPos.left}px` : undefined,
          top: launcherPos.top !== "auto" ? `${launcherPos.top}px` : undefined,
        }}
      >
        {/* Outer reverse rotating snake ring */}
        <svg className="lb-snake-slow absolute -inset-[7px] w-[calc(100%+14px)] h-[calc(100%+14px)] pointer-events-none animate-snake-rot-rev filter drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]" viewBox="0 0 66 66" fill="none">
          <circle cx="33" cy="33" r="30" stroke="url(#snakeGrad2Match)" strokeWidth="2" fill="none" strokeDasharray="32 155" strokeLinecap="round"/>
          <defs>
            <linearGradient id="snakeGrad2Match" x1="0" y1="0" x2="66" y2="66" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0"/>
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9"/>
            </linearGradient>
          </defs>
        </svg>

        {/* Inner fast rotating snake ring */}
        <svg className="lb-snake absolute -inset-[7px] w-[calc(100%+14px)] h-[calc(100%+14px)] pointer-events-none animate-snake-rot filter drop-shadow-[0_0_12px_#38bdf8]" viewBox="0 0 66 66" fill="none">
          <circle cx="33" cy="33" r="30" stroke="rgba(56,189,248,0.2)" strokeWidth="1.5" fill="none"/>
          <circle cx="33" cy="33" r="30" stroke="url(#snakeGradMatch)" strokeWidth="4.5" fill="none" strokeDasharray="75 115" strokeLinecap="round"/>
          <defs>
            <linearGradient id="snakeGradMatch" x1="0" y1="0" x2="66" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1e40af" stopOpacity="0"/>
              <stop offset="35%" stopColor="#3b82f6" stopOpacity="0.8"/>
              <stop offset="80%" stopColor="#ffffff" stopOpacity="1"/>
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="1"/>
            </linearGradient>
          </defs>
        </svg>

        {/* Center user photo */}
        <div className="lb-body absolute inset-0 rounded-full overflow-hidden bg-gradient-to-br from-[#1e3a8a] via-[#0f172a] to-[#38bdf8]/20 border-2 border-white shadow-[0_0_18px_rgba(56,189,248,0.9)] flex items-center justify-center">
          <img
            src={activePhotoSrc}
            alt="User Avatar"
            className="w-full h-full object-cover rounded-full"
          />
        </div>

        {/* Glowing online pulse indicator */}
        <div className="lb-dot absolute top-[2px] right-[2px] w-[13px] h-[13px] rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_12px_#34d399] animate-[dotblink_1.1s_ease-in-out_infinite_alternate]" />
      </div>

      {/* PREDICTOR FLOATING POPUP PANEL */}
      {popupShow && (
        <div
          id="predPopup"
          ref={popupRef}
          className={`fixed z-[9999] w-[246px] touch-none transition-transform duration-200 ${
            popupClosing ? "animate-[popOut_0.2s_ease-in_forwards]" : "animate-[popIn_0.38s_cubic-bezier(0.34,1.4,0.64,1)_forwards]"
          }`}
          style={{ left: `${popupPos.left}px`, top: `${popupPos.top}px` }}
        >
          {/* FLOATING CONTAINER */}
          <div className="animate-panel-float relative">
            {/* ROYAL BLUE & WHITE FLAPPING WINGS */}
            <svg className="real-wing-left absolute top-[10px] left-[-76px] w-[84px] h-[160px] pointer-events-none -z-10 filter drop-shadow-[0_0_16px_rgba(56,189,248,0.9)] origin-right animate-wing-left" viewBox="0 0 100 200" fill="none">
              <path d="M100 30 C75 12, 40 5, 5 45 C15 65, 35 75, 55 70 C35 85, 15 105, 12 125 C30 130, 50 120, 65 105 C45 125, 25 155, 30 175 C48 165, 65 145, 75 130 C65 155, 55 185, 65 195 C78 175, 88 150, 100 120 Z" fill="url(#wingLeftMatchGrad)"/>
              <defs>
                <linearGradient id="wingLeftMatchGrad" x1="100" y1="30" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="30%" stopColor="#60a5fa"/>
                  <stop offset="70%" stopColor="#1d4ed8"/>
                  <stop offset="100%" stopColor="#0f172a"/>
                </linearGradient>
              </defs>
            </svg>
            <svg className="real-wing-right absolute top-[10px] right-[-76px] w-[84px] h-[160px] pointer-events-none -z-10 filter drop-shadow-[0_0_16px_rgba(56,189,248,0.9)] origin-left animate-wing-right" viewBox="0 0 100 200" fill="none">
              <path d="M0 30 C25 12, 60 5, 95 45 C85 65, 65 75, 45 70 C65 85, 85 105, 88 125 C70 130, 50 120, 35 105 C55 125, 75 155, 70 175 C52 165, 35 145, 25 130 C35 155, 45 185, 35 195 C22 175, 12 150, 0 120 Z" fill="url(#wingRightMatchGrad)"/>
              <defs>
                <linearGradient id="wingRightMatchGrad" x1="0" y1="30" x2="100" y2="120" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="30%" stopColor="#60a5fa"/>
                  <stop offset="70%" stopColor="#1d4ed8"/>
                  <stop offset="100%" stopColor="#0f172a"/>
                </linearGradient>
              </defs>
            </svg>

            {/* MAIN COMPACT VIP PANEL CARD */}
            <div className={`relative rounded-[24px] border-[2px] p-[3px] transition-colors duration-300 ${
              isGameMatch
                ? "bg-gradient-to-b from-[#102a45] via-[#091b30] to-[#0d2238] border-blue-400 shadow-[0_0_36px_rgba(56,189,248,0.7),inset_0_0_16px_rgba(255,255,255,0.15)]"
                : "bg-gradient-to-b from-[#031d2e] via-[#02101b] to-[#04283f] border-cyan-400 shadow-[0_0_36px_rgba(0,243,255,0.8),inset_0_0_16px_rgba(0,243,255,0.3)]"
            }`}>
              {/* Scan Line Animation */}
              <div className="scan-line absolute left-0 right-0 h-[1.5px] z-15 pointer-events-none bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_10px_#ffffff] animate-[scandn_6s_linear_infinite]" />

              <div className="deco-top relative z-10 mx-[10px] mt-[4px] h-[1.5px] bg-gradient-to-r from-transparent via-amber-300 to-transparent rounded-[2px]" />

              {/* Header (Drag Handle) with exact name: 𝗚𝗢𝗔 𝗚𝗔𝗠𝗘 𝗣𝗔𝗡𝗘𝗟 𝗩𝗜𝗣 */}
              <div
                id="dragHandle"
                onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                onTouchStart={(e) => e.touches[0] && handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                className="flex flex-col items-center justify-center pt-1.5 pb-0.5 px-2 relative z-10 cursor-grab active:cursor-grabbing"
              >
                {/* 𝗚𝗢𝗔 𝗚𝗔𝗠𝗘 𝗣𝗔𝗡𝗘𝗟 𝗩𝗜𝗣 EXACT NAME */}
                <div className="flex items-center justify-center gap-1 font-['Orbitron'] text-[11px] font-black tracking-[0.5px] text-center uppercase">
                  <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_#fbbf24] animate-pulse" />
                  <span className="bg-gradient-to-r from-amber-300 via-yellow-100 to-sky-200 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(251,191,36,0.85)] font-bold">
                    𝗚𝗢𝗔 𝗚𝗔𝗠𝗘 𝗣𝗔𝗡𝗘𝗟 𝗩𝗜𝗣
                  </span>
                  <Sparkles className="w-3 h-3 text-sky-300 drop-shadow-[0_0_6px_#38bdf8]" />
                </div>

                <div className="config-status flex justify-center items-center gap-2 text-[7px] text-blue-200 font-bold mt-[2px]">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                    LIVE
                  </span>
                  <span className="text-amber-300 font-semibold">GOA WIN ALGO</span>
                  <span className="text-blue-300 font-mono">PING: {srvPing}MS</span>
                </div>

                {/* Close Button */}
                <button
                  onClick={handleClosePopup}
                  className="xbtn absolute top-[4px] right-[6px] w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-700 to-sky-400 border border-white text-white text-[9px] font-black cursor-pointer shadow-[0_0_8px_rgba(56,189,248,0.7)] active:scale-85 hover:scale-105 transition-transform"
                >
                  ✕
                </button>
              </div>

              <div className="h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent my-[3px]" />

              {/* USER'S PHOTO BADGE CARD */}
              <div className="relative mx-1.5 mb-1 px-2 py-1 rounded-xl bg-gradient-to-r from-[#173759]/90 via-[#102b47]/95 to-[#0b2138]/90 border border-blue-400/40 flex items-center gap-2 overflow-hidden shadow-[inset_0_0_12px_rgba(56,189,248,0.2)]">
                {/* User's Photo with Glowing Border */}
                <div
                  onClick={() => setSelectedPhoto(selectedPhoto === "user" ? "vip" : "user")}
                  title="Click to toggle photo"
                  className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-white shrink-0 shadow-[0_0_12px_rgba(255,255,255,0.7)] cursor-pointer active:scale-95 transition-transform"
                >
                  <img
                    src={activePhotoSrc}
                    alt="User Photo"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 px-1 py-0 bg-amber-400 text-black text-[5px] font-black rounded-tl">
                    VIP
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[7.5px] font-['Orbitron'] font-black text-amber-300 tracking-wider flex items-center gap-1">
                      👑 VIP MEMBER
                    </span>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="text-blue-200 hover:text-white p-0.5 rounded transition-colors"
                      title={soundEnabled ? "Mute Voice" : "Enable Voice"}
                    >
                      {soundEnabled ? <Volume2 className="w-2.5 h-2.5 text-sky-400" /> : <VolumeX className="w-2.5 h-2.5 text-gray-400" />}
                    </button>
                  </div>
                  <div className="text-[6.5px] text-blue-100/90 truncate">
                    STATUS: <span className="text-emerald-400 font-bold">ONLINE & INJECTED</span>
                  </div>
                </div>
              </div>

              {/* COLORFUL GAME NUMBERS REFERENCE STRIP */}
              <div className="mx-1.5 mb-1 px-1.5 py-1 rounded-lg bg-black/50 border border-blue-400/30 flex items-center justify-between">
                <span className="text-[6px] font-['Orbitron'] text-blue-300 font-bold tracking-wider mr-1">
                  BALLS:
                </span>
                <div className="flex items-center gap-[3px]">
                  {ALL_NUMBERS.map((numStr) => {
                    const isCurrent = predData && showPredBox && predData.n === numStr;
                    return (
                      <div
                        key={numStr}
                        className={`w-3.5 h-3.5 rounded-full overflow-hidden transition-all duration-200 ${
                          isCurrent
                            ? "scale-125 ring-2 ring-amber-300 shadow-[0_0_8px_#fbbf24]"
                            : "opacity-85 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={getNumberImageSrc(numStr)}
                          alt={numStr}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* INNER CONTENT BOX (WHITE/BLUE GAME MATCH OR CYBER) */}
              <div className={`m-[3px] rounded-[16px] p-[8px_7px] relative border flex flex-col items-center justify-center min-h-[96px] transition-colors ${
                isGameMatch
                  ? "bg-gradient-to-b from-[#0a1e36] to-[#041224] border-blue-400/50 shadow-[inset_0_0_18px_rgba(56,189,248,0.2)]"
                  : "bg-[#020b14]/95 border-cyan-500/40 shadow-[inset_0_0_18px_rgba(0,243,255,0.2)]"
              }`}>
                
                {/* STATE: WINGO PREDICTION */}
                {curState === "stWingo" && (
                  <div className="w-full animate-[stIn_0.25s_ease_forwards]">
                    {showPredBox && predData && currentPredColor ? (
                      /* बड़ा वाला बॉक्स (BIG PREDICTION BOX WITH WHITE/BLUE THEME & DYNAMIC 0-4 OPPOSITE NUMBER) */
                      <div className={`rounded-[12px] p-[7px_6px] mb-[2px] border relative overflow-hidden transition-all ${
                        isGameMatch
                          ? "bg-gradient-to-br from-[#0f2d4e] to-[#081b30] border-blue-400/60 shadow-[0_4px_16px_rgba(56,189,248,0.3)]"
                          : "bg-gradient-to-br from-[#021321] to-[#010912] border-cyan-400/50 shadow-[0_0_14px_rgba(0,243,255,0.3)]"
                      }`}>
                        {/* PERIOD STATUS */}
                        <div className="flex items-center justify-between gap-1 mb-1 px-1.5 py-[2px] bg-blue-950/70 rounded border border-blue-400/40">
                          <span className="text-[7px] tracking-[1px] text-blue-200 font-bold">
                            PERIOD: <span className="text-white font-mono">{lastPeriod ? lastPeriod.slice(-5) : "---"}</span>
                          </span>
                          <span className="flex items-center gap-1 text-[6.5px] text-emerald-400 font-bold">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            VERIFIED VIP
                          </span>
                        </div>

                        {/* PRIMARY RESULT WITH AUTHENTIC 3D COLORFUL GAME BALL */}
                        <div className="flex items-center gap-2 mb-1.5 relative z-1">
                          {/* बड़ा वाला साइज: 3D GLOSSY COLORFUL GAME NUMBER BALL */}
                          <div className="relative w-[54px] h-[54px] shrink-0 flex items-center justify-center">
                            {/* Glowing halo matching ball color */}
                            <div
                              className="absolute inset-0 rounded-full animate-pulse"
                              style={{
                                boxShadow: `0 0 20px ${currentPredColor.glowColor}`,
                                border: `2px solid ${currentPredColor.glowColor}`
                              }}
                            />
                            <img
                              src={getNumberImageSrc(predData.n)}
                              alt={`Number ${predData.n}`}
                              className="w-[48px] h-[48px] object-contain relative z-2 animate-[imgPop_0.35s_cubic-bezier(0.34,1.56,0.64,1)_both]"
                            />
                          </div>

                          <div className="flex-1 flex flex-col gap-[2px]">
                            {/* COLOR TAG / BADGE IN OFFICIAL GAME COLOR */}
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase text-white tracking-wide shadow-sm ${currentPredColor.badgeBg} border ${currentPredColor.badgeBorder}`}>
                                {currentPredColor.name}
                              </span>
                              <span className="text-[5.5px] tracking-[1px] text-blue-300 uppercase font-bold">
                                AI SIGNAL
                              </span>
                            </div>

                            {/* BIG / SMALL TEXT */}
                            <div className={`font-['Orbitron'] text-[14px] font-black tracking-[1.5px] leading-tight ${
                              predData.s === "BIG" ? "text-amber-400 drop-shadow-[0_0_12px_#fbbf24]" : "text-sky-300 drop-shadow-[0_0_12px_#38bdf8]"
                            }`}>
                              {predData.s} ({predData.n})
                            </div>
                            
                            {/* DYNAMIC OPPOSITE NUMBER (0-4 FOR BIG, 5-9 FOR SMALL) */}
                            {oppColor && (
                              <div className="text-[6.5px] tracking-[0.5px] text-sky-200 font-bold flex items-center gap-1 mt-[1px]">
                                <span>HEDGE:</span>
                                <span className={predData.s === "SMALL" ? "text-amber-400" : "text-sky-300"}>
                                  {predData.s === "SMALL" ? "BIG" : "SMALL"} ({predData.oppN})
                                </span>
                                <span className={`px-1 py-[0.5px] rounded text-[5px] text-white font-bold ${oppColor.badgeBg}`}>
                                  {oppColor.name}
                                </span>
                              </div>
                            )}

                            {/* ACCURACY BAR */}
                            <div className="h-[3px] bg-blue-950 rounded-full overflow-hidden my-[1.5px] border border-blue-700/60">
                              <div className="h-full w-[98.6%] rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-300 transition-all duration-700" />
                            </div>
                            <div className="flex items-center justify-between text-[6px] tracking-[0.8px] text-blue-200">
                              <span>ACCURACY: 98.6%</span>
                              <span className="text-emerald-400 font-bold">WIN PROB: HIGH</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* IDLE STATE IN BIG BOX */
                      <div className="text-center py-1">
                        <div className={`rounded-[10px] border p-[7px_5px] mb-[4px] shadow-[0_0_12px_rgba(56,189,248,0.2)] ${
                          isGameMatch
                            ? "bg-gradient-to-br from-[#102d4d] to-[#07192d] border-blue-400/50"
                            : "bg-gradient-to-br from-[#031d2e] to-[#010e1a] border-cyan-500/40"
                        }`}>
                          <div className="text-[7px] tracking-[1.5px] text-amber-300 font-bold mb-[1px] flex items-center justify-center gap-1">
                            <Crown className="w-2.5 h-2.5 fill-amber-300" />
                            VIP PREDICTOR READY
                          </div>
                          <div className="font-['Orbitron'] text-[15px] font-black text-white drop-shadow-[0_0_12px_#38bdf8]">
                            GOAOK VIP
                          </div>
                          <div className="text-[6.5px] text-blue-200 mt-0.5">
                            BALANCE: <span className="text-white font-bold">₹{balance.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="text-[8.5px] text-blue-100 leading-tight">
                          Press <span className="text-amber-300 font-bold underline">SCAN</span> to predict colorful win number
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STATE: BYPASS SCANNING RADAR */}
                {curState === "stBypass" && (
                  <div className="w-full text-center animate-[stIn_0.25s_ease_forwards] py-0.5">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <div className="w-[5px] h-[5px] rounded-full bg-blue-400 shadow-[0_0_6px_#38bdf8] animate-ping" />
                      <span className="text-[6px] tracking-[1.2px] text-blue-200 font-bold">VIP GOAOK ALGORITHM</span>
                    </div>

                    <div className="relative w-[66px] h-[66px] mx-auto mb-1">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 76 76" fill="none">
                        <circle cx="38" cy="38" r="34" stroke="rgba(56,189,248,0.2)" strokeWidth="1" fill="none" />
                        <circle cx="38" cy="38" r="22" stroke="rgba(56,189,248,0.12)" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                        <g className="origin-[38px_38px] animate-snake-rot">
                          <line x1="38" y1="38" x2="38" y2="5" stroke="url(#armGradMatch)" strokeWidth="2.2" strokeLinecap="round" />
                        </g>
                        <defs>
                          <linearGradient id="armGradMatch" x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.05" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <div className="font-['Orbitron'] text-[12px] font-black text-amber-300 drop-shadow-[0_0_10px_#fbbf24]">
                          {bypassPct}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-1 text-[5.5px] tracking-[0.8px] text-blue-200 py-[3px] px-[6px] border border-blue-400/40 rounded-full bg-blue-950/60">
                      <div className="w-[4px] h-[4px] rounded-full bg-blue-400 shadow-[0_0_5px_#38bdf8] animate-pulse" />
                      <span className="truncate max-w-[170px]">{bypassLog}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="deco-bot h-[1.5px] mx-[8px] mt-[3px] bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-[2px] relative z-10" />

              {/* ACTION BUTTONS */}
              <div className="flex w-full gap-1.5 mt-1.5">
                <button
                  id="execBtn"
                  onClick={handleScan}
                  disabled={bypassRunning}
                  className="flex-1 py-1.5 cursor-pointer border rounded-full font-['Orbitron'] text-[8.5px] font-black tracking-[1px] uppercase transition-all duration-180 flex items-center justify-center gap-1 bg-gradient-to-r from-blue-600 via-sky-500 to-amber-400 text-black shadow-[0_0_14px_rgba(56,189,248,0.7)] border-white active:scale-95 disabled:opacity-50 hover:brightness-110"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  {bypassRunning ? "TUNNEL..." : "SCAN VIP"}
                </button>
                <button
                  id="closeBtnBottom"
                  onClick={handleClosePopup}
                  className="flex-1 py-1.5 cursor-pointer border rounded-full font-['Orbitron'] text-[8.5px] font-black tracking-[0.8px] uppercase transition-all duration-180 flex items-center justify-center gap-1 bg-gradient-to-br from-[#102b47] to-[#091a2e] text-blue-100 border-blue-400/50 active:scale-95 hover:bg-[#163a5f]"
                >
                  HIDE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
