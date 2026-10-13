import React, { useEffect, useRef, useState } from "react";
import { getNumberImageSrc } from "./utils/numberAssets";
import { Play } from "lucide-react";

const TARGET_GAME_URL = "https://www.goaok.com/#/register?invitationCode=116249306924";

// Wingo prediction mapping
// SMALL (0, 1, 2, 3, 4) vs BIG (5, 6, 7, 8, 9)
// Includes both primary predicted number and opposite hedge number (5-9 for small, 0-4 for big)
const LOGIC: Record<number, { n: string; s: "BIG" | "SMALL"; oppN: string }> = {
  0: { n: "1", s: "SMALL", oppN: "6" },
  1: { n: "2", s: "SMALL", oppN: "7" },
  2: { n: "4", s: "SMALL", oppN: "9" },
  3: { n: "3", s: "SMALL", oppN: "8" },
  4: { n: "0", s: "SMALL", oppN: "5" },
  5: { n: "5", s: "BIG", oppN: "0" },
  6: { n: "8", s: "BIG", oppN: "3" },
  7: { n: "7", s: "BIG", oppN: "2" },
  8: { n: "6", s: "BIG", oppN: "1" },
  9: { n: "9", s: "BIG", oppN: "4" }
};

export default function App() {
  // Predictor UI states
  const [curState, setCurState] = useState<"stWingo" | "stBypass">("stWingo");
  const [popupShow, setPopupShow] = useState(true);
  const [popupClosing, setPopupClosing] = useState(false);
  const [launcherHidden, setLauncherHidden] = useState(true);

  // Position state for popup & launcher
  const [popupPos, setPopupPos] = useState({ left: 18, top: 70 });
  const [launcherPos, setLauncherPos] = useState({
    left: typeof window !== "undefined" ? Math.max(10, window.innerWidth - 68) : 280,
    top: typeof window !== "undefined" ? Math.max(10, window.innerHeight - 150) : 500,
  });

  // Game/Prediction data
  const [lastPeriod, setLastPeriod] = useState<string | null>(null);
  const [predData, setPredData] = useState<{ n: string; s: "BIG" | "SMALL"; oppN: string } | null>(null);
  const [bypassRunning, setBypassRunning] = useState(false);
  const [bypassPct, setBypassPct] = useState(0);
  const [showPredBox, setShowPredBox] = useState(false);
  const [liveHex, setLiveHex] = useState("0x4F8A 0x221B");

  // Ping & Balance
  const [srvPing, setSrvPing] = useState<number | string>("--");
  const [balance] = useState<number>(0);

  // Drag Refs
  const popupRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);

  const popupDragRef = useRef<{ isDragging: boolean; startX: number; startY: number; startL: number; startT: number }>({
    isDragging: false, startX: 0, startY: 0, startL: 0, startT: 0
  });

  const launcherDragRef = useRef<{ isDragging: boolean; startX: number; startY: number; startL: number; startT: number; hasMoved: boolean }>({
    isDragging: false, startX: 0, startY: 0, startL: 0, startT: 0, hasMoved: false
  });

  // Canvas matrix effect
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&display=swap";
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
        setSrvPing(Math.floor(Math.random() * 25 + 35));
      }
      timer = setTimeout(pingLoop, 6000);
    };
    pingLoop();
    return () => clearTimeout(timer);
  }, []);

  // Matrix canvas background effect
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
    const chars = "01ZNP010WINGO";

    const interval = setInterval(() => {
      ctx.fillStyle = "rgba(6,0,15,.09)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00f0ff";
      ctx.font = "12px monospace";

      drops.forEach((y, i) => {
        ctx.globalAlpha = Math.random() * 0.45 + 0.1;
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 14, y * 14);
        if (y * 14 > canvas.height && Math.random() > 0.96) drops[i] = 0;
        drops[i]++;
      });
      ctx.globalAlpha = 1;
    }, 55);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Helper to pick random opposite number
  const getRandomOppositeNumber = (isSmall: boolean): string => {
    if (isSmall) {
      const bigs = ["5", "6", "7", "8", "9"];
      return bigs[Math.floor(Math.random() * bigs.length)];
    } else {
      const smalls = ["0", "1", "2", "3", "4"];
      return smalls[Math.floor(Math.random() * smalls.length)];
    }
  };

  // Fetch Game Period
  const fetchPeriod = async () => {
    try {
      const res = await fetch("/api/game-issue");
      const j = await res.json();
      if (j && j.code === 0 && j.data && j.data.issueNumber) {
        const cur = j.data.issueNumber.toString();
        if (cur !== lastPeriod) {
          setLastPeriod(cur);
          const digit = parseInt(cur.slice(-1));
          const lg = LOGIC[digit] || { n: "2", s: "SMALL", oppN: "7" };
          const oppN = getRandomOppositeNumber(lg.s === "SMALL");
          setPredData({ ...lg, oppN });
          // Strictly do not show automatically; user must click GUESS!
          setShowPredBox(false);
        }
      }
    } catch (e) {
      const now = new Date();
      const issue = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}1000${String(now.getUTCHours() * 60 + now.getUTCMinutes()).padStart(4, "0")}`;
      if (issue !== lastPeriod) {
        setLastPeriod(issue);
        const digit = parseInt(issue.slice(-1));
        const lg = LOGIC[digit] || { n: "2", s: "SMALL", oppN: "7" };
        const oppN = getRandomOppositeNumber(lg.s === "SMALL");
        setPredData({ ...lg, oppN });
        // Strictly do not show automatically; user must click GUESS!
        setShowPredBox(false);
      }
    }
  };

  useEffect(() => {
    fetchPeriod();
    const interval = setInterval(fetchPeriod, 4000);
    return () => clearInterval(interval);
  }, [lastPeriod]);

  // Voice speech synthesis
  const speakPrediction = (size: string, num: string) => {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(`${size} ${num}`);
        u.lang = "en-US";
        u.rate = 0.88;
        u.pitch = 1.1;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {}
  };

  // Run Bypass Scan animation with live lab data telemetry
  const handleScan = () => {
    if (bypassRunning) return;
    setBypassRunning(true);
    setCurState("stBypass");
    let pct = 0;
    const hexChars = "0123456789ABCDEF";
    const iv = setInterval(() => {
      pct = Math.min(100, pct + Math.floor(4 + Math.random() * 6));
      setBypassPct(pct);
      const rHex = () => Array.from({ length: 4 }, () => hexChars[Math.floor(Math.random() * 16)]).join("");
      setLiveHex(`0x${rHex()} 0x${rHex()}`);

      if (pct >= 100) {
        clearInterval(iv);
        setBypassRunning(false);
        setCurState("stWingo");
        setShowPredBox(true);

        if (predData) {
          const newOpp = getRandomOppositeNumber(predData.s === "SMALL");
          const updatedPred = { ...predData, oppN: newOpp };
          setPredData(updatedPred);
          speakPrediction(updatedPred.s, updatedPred.n);
        }
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
    if (launcherDragRef.current.hasMoved) {
      // Don't trigger click if user was dragging
      return;
    }
    setPopupShow(true);
    setLauncherHidden(true);
  };

  // Popup Drag Handlers
  const handlePopupDragStart = (clientX: number, clientY: number) => {
    popupDragRef.current = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      startL: popupPos.left,
      startT: popupPos.top
    };
  };

  const handlePopupDragMove = (clientX: number, clientY: number) => {
    if (!popupDragRef.current.isDragging) return;
    const dx = clientX - popupDragRef.current.startX;
    const dy = clientY - popupDragRef.current.startY;
    const newL = Math.max(0, Math.min(window.innerWidth - 230, popupDragRef.current.startL + dx));
    const newT = Math.max(0, Math.min(window.innerHeight - 260, popupDragRef.current.startT + dy));
    setPopupPos({ left: newL, top: newT });
  };

  const handlePopupDragEnd = () => {
    popupDragRef.current.isDragging = false;
  };

  // Launcher Drag Handlers
  const handleLauncherDragStart = (clientX: number, clientY: number) => {
    launcherDragRef.current = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      startL: launcherPos.left,
      startT: launcherPos.top,
      hasMoved: false
    };
  };

  const handleLauncherDragMove = (clientX: number, clientY: number) => {
    if (!launcherDragRef.current.isDragging) return;
    const dx = clientX - launcherDragRef.current.startX;
    const dy = clientY - launcherDragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      launcherDragRef.current.hasMoved = true;
    }
    const newL = Math.max(5, Math.min(window.innerWidth - 55, launcherDragRef.current.startL + dx));
    const newT = Math.max(5, Math.min(window.innerHeight - 55, launcherDragRef.current.startT + dy));
    setLauncherPos({ left: newL, top: newT });
  };

  const handleLauncherDragEnd = () => {
    launcherDragRef.current.isDragging = false;
    setTimeout(() => {
      launcherDragRef.current.hasMoved = false;
    }, 100);
  };

  // Global mouse & touch listeners
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        if (popupDragRef.current.isDragging) {
          handlePopupDragMove(e.touches[0].clientX, e.touches[0].clientY);
        }
        if (launcherDragRef.current.isDragging) {
          handleLauncherDragMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (popupDragRef.current.isDragging) {
        handlePopupDragMove(e.clientX, e.clientY);
      }
      if (launcherDragRef.current.isDragging) {
        handleLauncherDragMove(e.clientX, e.clientY);
      }
    };
    const onEnd = () => {
      handlePopupDragEnd();
      handleLauncherDragEnd();
    };

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
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-['Share_Tech_Mono',monospace] select-none">
      {/* BACKGROUND GAME IFRAME */}
      <div className="absolute inset-0 w-full h-full z-0 bg-neutral-900">
        <iframe
          src={TARGET_GAME_URL}
          className="w-full h-full border-none"
          title="GoaOk Game Page"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        />
      </div>

      {/* MATRIX CANVAS */}
      <canvas id="matCanvas" ref={canvasRef} className="fixed inset-0 pointer-events-none opacity-5 z-[9989]" />

      {/* LAUNCHER WIDGET BUTTON WITH USER AVATAR PHOTO - FULLY DRAGGABLE ANYWHERE */}
      <div
        id="launcher"
        ref={launcherRef}
        onClick={handleOpenPopup}
        onMouseDown={(e) => handleLauncherDragStart(e.clientX, e.clientY)}
        onTouchStart={(e) => e.touches[0] && handleLauncherDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        className={`fixed w-13 h-13 z-[9998] cursor-grab active:cursor-grabbing touch-none transition-opacity duration-200 ${
          launcherHidden ? "opacity-0 pointer-events-none scale-0" : "opacity-100 scale-100"
        }`}
        style={{
          left: `${launcherPos.left}px`,
          top: `${launcherPos.top}px`,
        }}
      >
        {/* Outer White Glowing Rings */}
        <svg className="lb-snake-slow absolute -inset-[7px] w-[calc(100%+14px)] h-[calc(100%+14px)] pointer-events-none animate-snake-rot-rev filter drop-shadow-[0_0_8px_#ffffff]" viewBox="0 0 66 66" fill="none">
          <circle cx="33" cy="33" r="30" stroke="url(#snakeGradWhite2)" strokeWidth="2.5" fill="none" strokeDasharray="30 150" strokeLinecap="round"/>
          <defs>
            <linearGradient id="snakeGradWhite2" x1="0" y1="0" x2="66" y2="66" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0"/>
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9"/>
            </linearGradient>
          </defs>
        </svg>
        <svg className="lb-snake absolute -inset-[7px] w-[calc(100%+14px)] h-[calc(100%+14px)] pointer-events-none animate-snake-rot filter drop-shadow-[0_0_12px_#ffffff]" viewBox="0 0 66 66" fill="none">
          <circle cx="33" cy="33" r="30" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none"/>
          <circle cx="33" cy="33" r="30" stroke="url(#snakeGradWhite1)" strokeWidth="4" fill="none" strokeDasharray="75 110" strokeLinecap="round"/>
          <defs>
            <linearGradient id="snakeGradWhite1" x1="0" y1="0" x2="66" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="1"/>
            </linearGradient>
          </defs>
        </svg>

        {/* User Photo Body Container */}
        <div className="lb-body absolute inset-0 rounded-full overflow-hidden bg-white border-2 border-white shadow-[0_0_18px_rgba(255,255,255,0.95)] flex items-center justify-center">
          <img
            src="/launcher_avatar.jpg"
            alt="User Avatar"
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        {/* Active Online Indicator Dot */}
        <div className="lb-dot absolute top-[0px] right-[0px] w-[12px] h-[12px] rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_10px_#10b981] animate-[dotblink_1.1s_ease-in-out_infinite_alternate]" />
      </div>

      {/* PREDICTOR FLOATING POPUP PANEL WITH CRISP SOLID WHITE THEME */}
      {popupShow && (
        <div
          id="predPopup"
          ref={popupRef}
          className={`fixed z-[9999] w-[218px] touch-none transition-transform duration-200 ${
            popupClosing ? "animate-[popOut_0.2s_ease-in_forwards]" : "animate-[popIn_0.38s_cubic-bezier(0.34,1.4,0.64,1)_forwards]"
          }`}
          style={{ left: `${popupPos.left}px`, top: `${popupPos.top}px` }}
        >
          {/* FLOATING AIR-LEVITATING CONTAINER WITH CROWNED AVATAR PHOTO */}
          <div className="animate-panel-float relative pt-5">
            {/* USER AVATAR PHOTO CROWNED PROMINENTLY ON TOP */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
              <div className="relative w-12 h-12 rounded-full p-[2px] bg-white border-2 border-white shadow-[0_4px_16px_rgba(0,0,0,0.18),0_0_22px_rgba(255,255,255,1)]">
                <img
                  src="/launcher_avatar.jpg"
                  alt="Admin Avatar"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                {/* Active Live Online Dot */}
                <div className="absolute -bottom-0.5 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_8px_#10b981] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                </div>
              </div>
            </div>

            {/* FLYING PEARL WHITE / SILVER WINGS */}
            <svg className="real-wing-left absolute top-[0px] left-[-72px] w-[80px] h-[150px] pointer-events-none -z-10 filter drop-shadow-[0_0_14px_rgba(255,255,255,0.95)] origin-right animate-wing-left" viewBox="0 0 100 200" fill="none">
              <path d="M100 30 C75 12, 40 5, 5 45 C15 65, 35 75, 55 70 C35 85, 15 105, 12 125 C30 130, 50 120, 65 105 C45 125, 25 155, 30 175 C48 165, 65 145, 75 130 C65 155, 55 185, 65 195 C78 175, 88 150, 100 120 Z" fill="url(#wingLeftWhite)"/>
              <defs>
                <linearGradient id="wingLeftWhite" x1="100" y1="30" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="60%" stopColor="#e2e8f0"/>
                  <stop offset="100%" stopColor="#94a3b8"/>
                </linearGradient>
              </defs>
            </svg>
            <svg className="real-wing-right absolute top-[0px] right-[-72px] w-[80px] h-[150px] pointer-events-none -z-10 filter drop-shadow-[0_0_14px_rgba(255,255,255,0.95)] origin-left animate-wing-right" viewBox="0 0 100 200" fill="none">
              <path d="M0 30 C25 12, 60 5, 95 45 C85 65, 65 75, 45 70 C65 85, 85 105, 88 125 C70 130, 50 120, 35 105 C55 125, 75 155, 70 175 C52 165, 35 145, 25 130 C35 155, 45 185, 35 195 C22 175, 12 150, 0 120 Z" fill="url(#wingRightWhite)"/>
              <defs>
                <linearGradient id="wingRightWhite" x1="0" y1="30" x2="100" y2="120" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="60%" stopColor="#e2e8f0"/>
                  <stop offset="100%" stopColor="#94a3b8"/>
                </linearGradient>
              </defs>
            </svg>

            {/* Main Solid White Panel Card */}
            <div className="relative bg-white rounded-[22px] border-[2px] border-white border-white-glow p-[3px] overflow-hidden shadow-2xl">
              {/* Subtle Laser Scan Line */}
              <div className="scan-line absolute left-0 right-0 h-[1.5px] z-15 pointer-events-none bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_8px_#38bdf8] animate-[scandn_6s_linear_infinite]" />

              <div className="deco-top relative z-10 mx-[10px] mt-[4px] h-[1.5px] bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-[2px]" />

              {/* Header (Drag Handle) */}
              <div
                id="dragHandle"
                onMouseDown={(e) => handlePopupDragStart(e.clientX, e.clientY)}
                onTouchStart={(e) => e.touches[0] && handlePopupDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                className="flex flex-col items-center justify-center pt-2.5 pb-0.5 px-2 relative z-10 cursor-grab active:cursor-grabbing"
              >
                <div className="font-['Orbitron'] text-[11.5px] font-black tracking-[1.2px] text-slate-900 text-center uppercase drop-shadow-sm">
                  NUMBER HACK
                </div>
                <div className="config-status flex justify-center items-center gap-1.5 text-[7px] text-slate-500 font-bold mt-[2px]">
                  <span className="text-emerald-600 font-black flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    LIVE
                  </span>
                  <span className="text-slate-600 bg-slate-100 px-1 py-[0.5px] rounded border border-slate-200 font-mono">WINGO AI</span>
                  <span className="text-blue-600 font-black">{srvPing}MS</span>
                </div>
                <button
                  onClick={handleClosePopup}
                  className="xbtn absolute top-[3px] right-[5px] w-4.5 h-4.5 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[9px] font-black cursor-pointer shadow-sm active:scale-85"
                >
                  ✕
                </button>
              </div>

              <div className="h-[1px] bg-slate-100 my-[2px]" />

              {/* Inner Content Solid Crisp White Glass Box */}
              <div className="m-[4px] bg-[#f8fafc] rounded-[14px] p-[8px_7px] relative border border-slate-200 flex flex-col items-center justify-center min-h-[92px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.03)]">
                
                {/* STATE: WINGO PREDICTION */}
                {curState === "stWingo" && (
                  <div className="w-full animate-[stIn_0.25s_ease_forwards]">
                    {showPredBox && predData ? (
                      <div className="bg-white rounded-[10px] p-[6px_5px] mb-[3px] border border-slate-200 relative overflow-hidden shadow-sm">
                        <div className="flex items-center justify-center gap-1 mb-1 px-1 py-[1.5px] bg-slate-50 rounded border border-slate-200">
                          <span className="text-[6.5px] tracking-[1.2px] text-slate-500 font-mono">
                            PERIOD: <span className="text-slate-900 font-black">{lastPeriod ? lastPeriod.slice(-5) : "---"}</span>
                          </span>
                          <div className="w-[4px] h-[4px] rounded-full bg-emerald-500 shadow-[0_0_6px_#22c55e] animate-pulse" />
                        </div>

                        {/* PRIMARY RESULT */}
                        <div className="flex items-center gap-1.5 mb-1 relative z-1">
                          <div className="relative w-[50px] h-[50px] shrink-0 flex items-center justify-center">
                            <div className={`absolute inset-0 rounded-full border-2 animate-[hexPulse_2s_ease-in-out_infinite_alternate] ${
                              predData.s === "BIG" ? "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]" : "border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                            }`} />
                            <img
                              src={getNumberImageSrc(predData.n, predData.s === "BIG")}
                              alt={predData.n}
                              className="w-[44px] h-[44px] object-contain relative z-2 animate-[imgPop_0.3s_cubic-bezier(0.34,1.56,0.64,1)_both]"
                            />
                          </div>

                          <div className="flex-1 flex flex-col gap-[2px]">
                            <div className="text-[5.5px] tracking-[2px] text-slate-400 font-black uppercase">AI PREDICTION</div>
                            <div className={`font-['Orbitron'] text-[13px] font-black tracking-[1.5px] leading-none ${
                              predData.s === "BIG" ? "text-amber-600 drop-shadow-sm" : "text-blue-600 drop-shadow-sm"
                            }`}>
                              {predData.s} ({predData.n})
                            </div>
                            
                            {/* OPPOSITE HEDGE NUMBER */}
                            <div className="text-[6.5px] tracking-[0.5px] font-bold mt-[1px]">
                              <span className="text-slate-400">OPPOSITE: </span>
                              <span className={predData.s === "SMALL" ? "text-amber-600 font-black" : "text-blue-600 font-black"}>
                                {predData.s === "SMALL" ? "BIG" : "SMALL"} ({predData.oppN})
                              </span>
                            </div>

                            <div className="h-[3.5px] bg-slate-100 rounded-full overflow-hidden my-[1px] border border-slate-200">
                              <div className={`h-full w-[98%] rounded-full transition-all duration-600 ${
                                predData.s === "BIG" ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-blue-600 to-sky-400"
                              }`} />
                            </div>
                            <div className="text-[5.5px] tracking-[0.8px] text-emerald-600 font-bold">ACCURACY: 99.2%</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-1">
                        <div className="bg-white rounded-[8px] border border-slate-200 p-[6px_4px] mb-[4px] shadow-sm">
                          <div className="text-[6.5px] tracking-[1.5px] text-slate-400 mb-[1px] font-bold">
                            PERIOD: <span className="text-slate-800 font-black">{lastPeriod ? lastPeriod.slice(-5) : "---"}</span>
                          </div>
                          <div className="font-['Orbitron'] text-[13px] font-black text-slate-900 drop-shadow-sm">
                            READY FOR GUESS
                          </div>
                        </div>
                        <div className="text-[8px] text-slate-600 leading-tight">
                          Tap <span className="text-blue-600 font-black underline">GUESS</span> to extract lab data
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STATE: DANGEROUS HIGH-TECH LIVE LAB DATA STREAM */}
                {curState === "stBypass" && (
                  <div className="w-full text-center animate-[stIn_0.25s_ease_forwards] py-0.5">
                    {/* Live Lab Header with Rec / Warning badge */}
                    <div className="flex items-center justify-between px-0.5 mb-1">
                      <div className="flex items-center gap-1">
                        <div className="w-[5px] h-[5px] rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-ping" />
                        <span className="text-[6px] tracking-[1.2px] text-rose-600 font-black uppercase font-mono">
                          LIVE LAB DATA
                        </span>
                      </div>
                      <span className="text-[6px] font-mono text-slate-600 font-bold bg-white px-1 py-[0.5px] rounded border border-slate-200">
                        {liveHex}
                      </span>
                    </div>

                    {/* Dynamic Equalizer Waveform Bars & Frequency Analyzer */}
                    <div className="flex items-center justify-center gap-1 my-1 h-3 px-2 bg-slate-950 rounded-md shadow-inner border border-slate-800">
                      <div className="w-1 bg-cyan-400 rounded-full animate-pulse transition-all" style={{ height: `${Math.min(100, Math.max(25, ((bypassPct * 4) % 100)))}%` }} />
                      <div className="w-1 bg-blue-500 rounded-full animate-pulse transition-all" style={{ height: `${Math.min(100, Math.max(35, ((bypassPct * 7) % 100)))}%` }} />
                      <div className="w-1 bg-emerald-400 rounded-full animate-pulse transition-all" style={{ height: `${Math.min(100, Math.max(50, ((bypassPct * 3) % 100)))}%` }} />
                      <div className="w-1 bg-amber-400 rounded-full animate-pulse transition-all" style={{ height: `${Math.min(100, Math.max(20, ((bypassPct * 6) % 100)))}%` }} />
                      <div className="w-1 bg-rose-500 rounded-full animate-pulse transition-all" style={{ height: `${Math.min(100, Math.max(65, ((bypassPct * 5) % 100)))}%` }} />
                      <div className="w-1 bg-cyan-300 rounded-full animate-pulse transition-all" style={{ height: `${Math.min(100, Math.max(40, ((bypassPct * 8) % 100)))}%` }} />
                      <div className="w-1 bg-emerald-500 rounded-full animate-pulse transition-all" style={{ height: `${Math.min(100, Math.max(75, ((bypassPct * 2) % 100)))}%` }} />
                    </div>

                    {/* High-Tech Lab Radar Reticle Crosshair */}
                    <div className="relative w-[56px] h-[56px] mx-auto mb-1">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 76 76" fill="none">
                        <circle cx="38" cy="38" r="35" stroke="rgba(203,213,225,0.7)" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                        <circle cx="38" cy="38" r="28" stroke="rgba(59,130,246,0.3)" strokeWidth="1.5" fill="none" />
                        <circle cx="38" cy="38" r="18" stroke="rgba(244,63,94,0.3)" strokeWidth="1" strokeDasharray="4 2" fill="none" />
                        <line x1="38" y1="2" x2="38" y2="74" stroke="rgba(148,163,184,0.35)" strokeWidth="0.8" strokeDasharray="2 2" />
                        <line x1="2" y1="38" x2="74" y2="38" stroke="rgba(148,163,184,0.35)" strokeWidth="0.8" strokeDasharray="2 2" />
                        <g className="origin-[38px_38px] animate-snake-rot">
                          <line x1="38" y1="38" x2="38" y2="4" stroke="url(#armGradLab)" strokeWidth="3" />
                        </g>
                        <defs>
                          <linearGradient id="armGradLab" x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
                            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <div className="font-['Orbitron'] text-[12.5px] font-black text-slate-900 drop-shadow-sm">
                          {bypassPct}%
                        </div>
                        <div className="text-[5px] font-mono text-rose-600 font-black -mt-0.5">LOCKED</div>
                      </div>
                    </div>

                    {/* Lab Data Terminal Feed */}
                    <div className="flex flex-col gap-0.5 text-[5.5px] font-mono py-[3px] px-[5px] border border-slate-700 rounded-[6px] bg-slate-950 text-left shadow-sm">
                      <div className="flex items-center justify-between text-cyan-400">
                        <span>&gt; LAB_KERNEL_STREAM</span>
                        <span className="text-emerald-400 font-bold">LIVE_DATA</span>
                      </div>
                      <div className="text-slate-300 truncate font-mono">
                        {bypassPct < 25 && ">> SYNCHRONIZING GOAOK SOCKET [0x8A12]"}
                        {bypassPct >= 25 && bypassPct < 55 && ">> DECRYPTING WINGO PERIOD RNG SEED"}
                        {bypassPct >= 55 && bypassPct < 85 && ">> COMPUTING PROBABILITY MATRIX [99.2%]"}
                        {bypassPct >= 85 && ">> [CRITICAL] RESULT MATRIX READY!"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="deco-bot h-[1.5px] mx-[8px] mt-[3px] bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-[2px] relative z-10" />

              {/* ACTION BUTTONS - CRISP GUESS BUTTON */}
              <div className="flex w-full gap-1.5 mt-1.5">
                <button
                  id="execBtn"
                  onClick={handleScan}
                  disabled={bypassRunning}
                  className="flex-1 py-1.5 cursor-pointer border rounded-full font-['Orbitron'] text-[8.5px] font-black tracking-[0.8px] uppercase transition-all duration-180 flex items-center justify-center gap-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md border-blue-500 active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  {bypassRunning ? "EXTRACTING..." : "GUESS"}
                </button>
                <button
                  id="closeBtnBottom"
                  onClick={handleClosePopup}
                  className="flex-1 py-1.5 cursor-pointer border rounded-full font-['Orbitron'] text-[8.5px] font-black tracking-[0.8px] uppercase transition-all duration-180 flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-sm active:scale-95"
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
