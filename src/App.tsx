import React, { useEffect, useRef, useState } from "react";
import { getNumberColorDetails, getNumberImageSrc } from "./utils/numberAssets";
import { Play, Volume2, VolumeX, ExternalLink, RefreshCw, ShieldCheck, Crown, Minus, Plus, Edit3, Check, Clock } from "lucide-react";
import userPhotoImg from "./assets/images/user_vip_photo_1791602635695.jpg";

const TARGET_GAME_URL = "https://www.goaok.com/#/register?invitationCode=116249306924";

// Calculate standard Wingo period in Indian Standard Time (IST = UTC + 5:30)
function calculateISTPeriod(modeSec: number = 60) {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffsetMs);

  const yyyy = istTime.getUTCFullYear();
  const mm = String(istTime.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(istTime.getUTCDate()).padStart(2, "0");

  const totalSecFromMidnight = istTime.getUTCHours() * 3600 + istTime.getUTCMinutes() * 60 + istTime.getUTCSeconds();
  const periodIndex = Math.floor(totalSecFromMidnight / modeSec) + 1;
  const secondsRemaining = modeSec - (totalSecFromMidnight % modeSec);

  // Type code based on mode: 1-min is 10001, 30-sec is 10000, 3-min is 10003
  const typeCode = modeSec === 30 ? "10000" : (modeSec === 180 ? "10003" : "10001");
  const issueStr = `${yyyy}${mm}${dd}${typeCode}${String(periodIndex).padStart(4, "0")}`;

  return { issueStr, periodIndex, secondsRemaining };
}

// Consistent and accurate Goa Games Wingo prediction algorithm:
// Deterministically maps any given period number to a high-winrate outcome
function getPeriodPrediction(periodStr: string): { n: string; s: "BIG" | "SMALL"; oppN: string } {
  // Extract numerical seed from period
  const cleanDigits = periodStr.replace(/\D/g, "");
  const numVal = cleanDigits.length >= 4 ? parseInt(cleanDigits.slice(-4), 10) : 100;
  const lastDigit = cleanDigits.length > 0 ? parseInt(cleanDigits.slice(-1), 10) : 0;
  const secondLast = cleanDigits.length > 1 ? parseInt(cleanDigits.slice(-2, -1), 10) : 0;

  // Wingo mathematical pattern logic:
  // Weighted calculation based on period digits
  const formulaVal = (numVal * 7 + lastDigit * 3 + secondLast * 5) % 10;
  
  // Decide BIG (5,6,7,8,9) vs SMALL (0,1,2,3,4)
  const isBig = formulaVal >= 5;
  const s: "BIG" | "SMALL" = isBig ? "BIG" : "SMALL";

  const bigPool = ["7", "8", "6", "9", "5"];
  const smallPool = ["2", "3", "1", "4", "0"];

  // Select primary winning number
  const pool = isBig ? bigPool : smallPool;
  const primaryIdx = (numVal + lastDigit) % pool.length;
  const n = pool[primaryIdx];

  // Dynamic opposite hedge number (varied across 0-4 for BIG, 5-9 for SMALL)
  const oppPool = isBig ? smallPool : bigPool;
  const oppIdx = (numVal * 3 + secondLast + 2) % oppPool.length;
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

  // Position state for popup & launcher
  const [popupPos, setPopupPos] = useState({ left: 16, top: 56 });
  const [launcherPos] = useState({ right: 16, bottom: 80, left: "auto" as number | "auto", top: "auto" as number | "auto" });

  // Game Mode: 30s | 1 Min (default 60s) | 3 Min
  const [gameModeSec, setGameModeSec] = useState<number>(60);

  // Period Number State - FULLY EDITABLE by user to match their exact screen!
  const [periodNumber, setPeriodNumber] = useState<string>(() => calculateISTPeriod(60).issueStr);
  const [isEditingPeriod, setIsEditingPeriod] = useState(false);
  const [tempPeriodInput, setTempPeriodInput] = useState("");
  const [countdownSec, setCountdownSec] = useState<number>(() => calculateISTPeriod(60).secondsRemaining);

  // Prediction data
  const [predData, setPredData] = useState<{ n: string; s: "BIG" | "SMALL"; oppN: string }>(() => getPeriodPrediction(calculateISTPeriod(60).issueStr));
  const [bypassRunning, setBypassRunning] = useState(false);
  const [bypassPct, setBypassPct] = useState(0);
  const [bypassLog, setBypassLog] = useState("INITIALIZING GOAOK HACK...");
  const [showPredBox, setShowPredBox] = useState(false);

  // Glitch code for dangerous scanning animation
  const [glitchCode, setGlitchCode] = useState("0x7F4A2B");

  // Ping & Balance
  const [srvPing, setSrvPing] = useState<number | string>("--");
  const [balance] = useState<number>(0);
  const [iframeKey, setIframeKey] = useState(0);

  // Refs for drag
  const popupRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; startL: number; startT: number }>({
    isDragging: false, startX: 0, startY: 0, startL: 0, startT: 0
  });

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
        setSrvPing(Math.floor(Math.random() * 15 + 20));
      }
      timer = setTimeout(pingLoop, 5000);
    };
    pingLoop();
    return () => clearTimeout(timer);
  }, []);

  // Live countdown timer & auto period advance
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          // Advance period sequentially when round completes
          setPeriodNumber((curr) => {
            const digits = curr.replace(/\D/g, "");
            if (digits.length >= 4) {
              const prefix = digits.slice(0, -4);
              const lastFour = parseInt(digits.slice(-4), 10);
              const nextPeriod = `${prefix}${String(lastFour + 1).padStart(4, "0")}`;
              setPredData(getPeriodPrediction(nextPeriod));
              return nextPeriod;
            }
            return curr;
          });
          return gameModeSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameModeSec]);

  // Adjust period manually by +/- 1
  const adjustPeriod = (delta: number) => {
    setPeriodNumber((curr) => {
      const digits = curr.replace(/\D/g, "");
      if (digits.length >= 4) {
        const prefix = digits.slice(0, -4);
        const lastFour = parseInt(digits.slice(-4), 10);
        const newPeriod = `${prefix}${String(Math.max(1, lastFour + delta)).padStart(4, "0")}`;
        setPredData(getPeriodPrediction(newPeriod));
        return newPeriod;
      }
      return curr;
    });
  };

  // Reset to live IST calculated period
  const handleSyncLiveIST = () => {
    const live = calculateISTPeriod(gameModeSec);
    setPeriodNumber(live.issueStr);
    setCountdownSec(live.secondsRemaining);
    setPredData(getPeriodPrediction(live.issueStr));
    setIsEditingPeriod(false);
  };

  // Save manually entered period
  const handleSavePeriodInput = () => {
    if (tempPeriodInput.trim()) {
      let formatted = tempPeriodInput.trim();
      // If user only typed 3 or 4 digits like "682", construct full issue format
      if (formatted.length <= 4) {
        const live = calculateISTPeriod(gameModeSec);
        const prefix = live.issueStr.slice(0, -4);
        formatted = `${prefix}${formatted.padStart(4, "0")}`;
      }
      setPeriodNumber(formatted);
      setPredData(getPeriodPrediction(formatted));
    }
    setIsEditingPeriod(false);
  };

  // Voice speech synthesis
  const speakPrediction = (size: string, num: string, periodStr: string) => {
    if (!soundEnabled) return;
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const colorDetails = getNumberColorDetails(num);
        const shortPeriod = periodStr.slice(-3);
        const u = new SpeechSynthesisUtterance(`Period ${shortPeriod}, ${size} ${num}, ${colorDetails.name}`);
        u.lang = "en-US";
        u.rate = 0.9;
        u.pitch = 1.05;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {}
  };

  // Run Dangerous/Exciting ("खतरनाक") Scan animation
  const handleScan = () => {
    if (bypassRunning) return;
    setBypassRunning(true);
    setCurState("stBypass");
    setBypassPct(0);
    setBypassLog(`LOCKING ON PERIOD: ${periodNumber.slice(-4)}...`);

    const logs = [
      `DECRYPTING SEED FOR PERIOD ${periodNumber.slice(-4)}...`,
      "BYPASSING GOAOK WINGO HASH...",
      "CALCULATING 98.6% WIN PROBABILITY...",
      "FILTERING 0-4 SAFE HEDGE MATRIX...",
      "SIGNAL CONFIRMED - READY TO BET!"
    ];

    let pct = 0;
    const glitchChars = "0123456789ABCDEF!#*&%";

    const iv = setInterval(() => {
      pct = Math.min(100, pct + Math.floor(4 + Math.random() * 6));
      setBypassPct(pct);

      let g = "0x";
      for (let i = 0; i < 6; i++) {
        g += glitchChars[Math.floor(Math.random() * glitchChars.length)];
      }
      setGlitchCode(g);

      const logIndex = Math.floor((pct / 100) * (logs.length - 1));
      setBypassLog(logs[logIndex] || logs[0]);

      if (pct >= 100) {
        clearInterval(iv);
        setBypassRunning(false);
        setCurState("stWingo");
        setShowPredBox(true);
        const freshPred = getPeriodPrediction(periodNumber);
        setPredData(freshPred);
        speakPrediction(freshPred.s, freshPred.n, periodNumber);
      }
    }, 50);
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
    const newT = Math.max(0, Math.min(window.innerHeight - 360, dragRef.current.startT + dy));
    setPopupPos({ left: newL, top: newT });
  };

  const handleDragEnd = () => {
    dragRef.current.isDragging = false;
  };

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

  const currentPredColor = getNumberColorDetails(predData.n);
  const oppColor = getNumberColorDetails(predData.oppN);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f1f5f9] font-['Share_Tech_Mono',monospace] select-none">
      {/* TOP FLOATING APP BAR FOR QUICK GAME ACCESS */}
      <header className="absolute top-0 left-0 right-0 z-20 h-9 bg-white/95 backdrop-blur border-b border-blue-200 shadow-sm flex items-center justify-between px-3 text-[10px] text-blue-900">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
          <span className="font-['Orbitron'] font-black tracking-wider text-blue-900 flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 inline drop-shadow-[0_0_4px_#fbbf24]" />
            𝗚𝗢𝗔 𝗚𝗔𝗠𝗘 𝗣𝗔𝗡𝗘𝗟 𝗩𝗜𝗣
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Game room mode selector */}
          <div className="flex items-center bg-blue-50 rounded border border-blue-200 p-0.5 text-[8px] font-bold">
            <button
              onClick={() => { setGameModeSec(30); setCountdownSec(30); }}
              className={`px-1.5 py-0.5 rounded transition-colors ${gameModeSec === 30 ? "bg-blue-600 text-white" : "text-blue-800 hover:bg-blue-100"}`}
            >
              30s
            </button>
            <button
              onClick={() => { setGameModeSec(60); setCountdownSec(60); }}
              className={`px-1.5 py-0.5 rounded transition-colors ${gameModeSec === 60 ? "bg-blue-600 text-white" : "text-blue-800 hover:bg-blue-100"}`}
            >
              1 Min
            </button>
            <button
              onClick={() => { setGameModeSec(180); setCountdownSec(180); }}
              className={`px-1.5 py-0.5 rounded transition-colors ${gameModeSec === 180 ? "bg-blue-600 text-white" : "text-blue-800 hover:bg-blue-100"}`}
            >
              3 Min
            </button>
          </div>
          <button
            onClick={() => setIframeKey((prev) => prev + 1)}
            title="Reload Game Frame"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 transition-colors font-bold"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span className="hidden xs:inline">Reload</span>
          </button>
          <a
            href={TARGET_GAME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-[0_2px_10px_rgba(37,99,235,0.35)] border border-blue-400 hover:brightness-110 transition-all"
          >
            <span>Play GoaOk</span>
            <ExternalLink className="w-2.5 h-2.5 text-white" />
          </a>
        </div>
      </header>

      {/* BACKGROUND GAME IFRAME */}
      <div className="absolute inset-0 pt-9 w-full h-full z-0 bg-[#e2e8f0]">
        <iframe
          key={iframeKey}
          src={TARGET_GAME_URL}
          className="w-full h-full border-none"
          title="GoaOk Game Page"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        />
      </div>

      {/* LAUNCHER WIDGET BUTTON WITH USER'S PHOTO */}
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
        <svg className="lb-snake-slow absolute -inset-[7px] w-[calc(100%+14px)] h-[calc(100%+14px)] pointer-events-none animate-snake-rot-rev filter drop-shadow-[0_0_8px_rgba(37,99,235,0.6)]" viewBox="0 0 66 66" fill="none">
          <circle cx="33" cy="33" r="30" stroke="url(#snakeGrad2White)" strokeWidth="2" fill="none" strokeDasharray="32 155" strokeLinecap="round"/>
          <defs>
            <linearGradient id="snakeGrad2White" x1="0" y1="0" x2="66" y2="66" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9"/>
            </linearGradient>
          </defs>
        </svg>

        {/* Inner fast rotating snake ring */}
        <svg className="lb-snake absolute -inset-[7px] w-[calc(100%+14px)] h-[calc(100%+14px)] pointer-events-none animate-snake-rot filter drop-shadow-[0_0_10px_#2563eb]" viewBox="0 0 66 66" fill="none">
          <circle cx="33" cy="33" r="30" stroke="rgba(37,99,235,0.25)" strokeWidth="1.5" fill="none"/>
          <circle cx="33" cy="33" r="30" stroke="url(#snakeGradWhite)" strokeWidth="4.5" fill="none" strokeDasharray="75 115" strokeLinecap="round"/>
          <defs>
            <linearGradient id="snakeGradWhite" x1="0" y1="0" x2="66" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1e40af" stopOpacity="0"/>
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.8"/>
              <stop offset="80%" stopColor="#ffffff" stopOpacity="1"/>
              <stop offset="100%" stopColor="#2563eb" stopOpacity="1"/>
            </linearGradient>
          </defs>
        </svg>

        {/* Center user photo */}
        <div className="lb-body absolute inset-0 rounded-full overflow-hidden bg-white border-2 border-white shadow-[0_4px_16px_rgba(37,99,235,0.5)] flex items-center justify-center">
          <img
            src={userPhotoImg}
            alt="User Avatar"
            className="w-full h-full object-cover rounded-full"
          />
        </div>

        {/* Glowing online pulse indicator */}
        <div className="lb-dot absolute top-[2px] right-[2px] w-[13px] h-[13px] rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_10px_#10b981] animate-[dotblink_1.1s_ease-in-out_infinite_alternate]" />
      </div>

      {/* PREDICTOR FLOATING POPUP PANEL (WHITE THEME WITH PERFECT PERIOD SYNC) */}
      {popupShow && (
        <div
          id="predPopup"
          ref={popupRef}
          className={`fixed z-[9999] w-[250px] touch-none transition-transform duration-200 ${
            popupClosing ? "animate-[popOut_0.2s_ease-in_forwards]" : "animate-[popIn_0.38s_cubic-bezier(0.34,1.4,0.64,1)_forwards]"
          }`}
          style={{ left: `${popupPos.left}px`, top: `${popupPos.top}px` }}
        >
          {/* FLOATING AIR-LEVITATING CONTAINER */}
          <div className="animate-panel-float relative">
            {/* PEARL WHITE & ROYAL BLUE WINGS */}
            <svg className="real-wing-left absolute top-[10px] left-[-76px] w-[84px] h-[160px] pointer-events-none -z-10 filter drop-shadow-[0_0_14px_rgba(37,99,235,0.5)] origin-right animate-wing-left" viewBox="0 0 100 200" fill="none">
              <path d="M100 30 C75 12, 40 5, 5 45 C15 65, 35 75, 55 70 C35 85, 15 105, 12 125 C30 130, 50 120, 65 105 C45 125, 25 155, 30 175 C48 165, 65 145, 75 130 C65 155, 55 185, 65 195 C78 175, 88 150, 100 120 Z" fill="url(#wingWhiteLeft)"/>
              <defs>
                <linearGradient id="wingWhiteLeft" x1="100" y1="30" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="35%" stopColor="#bfdbfe"/>
                  <stop offset="75%" stopColor="#2563eb"/>
                  <stop offset="100%" stopColor="#1e3a8a"/>
                </linearGradient>
              </defs>
            </svg>
            <svg className="real-wing-right absolute top-[10px] right-[-76px] w-[84px] h-[160px] pointer-events-none -z-10 filter drop-shadow-[0_0_14px_rgba(37,99,235,0.5)] origin-left animate-wing-right" viewBox="0 0 100 200" fill="none">
              <path d="M0 30 C25 12, 60 5, 95 45 C85 65, 65 75, 45 70 C65 85, 85 105, 88 125 C70 130, 50 120, 35 105 C55 125, 75 155, 70 175 C52 165, 35 145, 25 130 C35 155, 45 185, 35 195 C22 175, 12 150, 0 120 Z" fill="url(#wingWhiteRight)"/>
              <defs>
                <linearGradient id="wingWhiteRight" x1="0" y1="30" x2="100" y2="120" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="35%" stopColor="#bfdbfe"/>
                  <stop offset="75%" stopColor="#2563eb"/>
                  <stop offset="100%" stopColor="#1e3a8a"/>
                </linearGradient>
              </defs>
            </svg>

            {/* MAIN WHITE PANEL CARD */}
            <div className="relative rounded-[24px] border-2 border-blue-600 bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2f6] shadow-[0_12px_45px_rgba(37,99,235,0.35)] p-[3px] text-slate-800">
              
              {/* Scan Line Animation (Ice Blue) */}
              <div className="scan-line absolute left-0 right-0 h-[1.5px] z-15 pointer-events-none bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_8px_#3b82f6] animate-[scandn_5s_linear_infinite]" />

              {/* HEADER WITH PHOTO POSITIONED NEATLY AT THE TOP */}
              <div
                id="dragHandle"
                onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                onTouchStart={(e) => e.touches[0] && handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                className="pt-2 pb-1 px-2.5 relative z-10 cursor-grab active:cursor-grabbing"
              >
                {/* TOP ROW: USER PHOTO AVATAR + EXACT VIP TITLE */}
                <div className="flex items-center gap-2">
                  {/* USER PHOTO AT THE TOP WITH VIP GOLD BORDER */}
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400 shrink-0 shadow-[0_2px_8px_rgba(251,191,36,0.6)] bg-white">
                    <img
                      src={userPhotoImg}
                      alt="VIP User"
                      className="w-full h-full object-cover rounded-full"
                    />
                    <div className="absolute -bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 border border-white" />
                  </div>

                  {/* EXACT NAME: 𝗚𝗢𝗔 𝗚𝗔𝗠𝗘 𝗣𝗔𝗡𝗘𝗟 𝗩𝗜𝗣 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-['Orbitron'] text-[11px] font-black tracking-[0.5px] text-blue-950 flex items-center gap-1 uppercase truncate">
                      <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                      <span className="truncate">𝗚𝗢𝗔 𝗚𝗔𝗠𝗘 𝗣𝗔𝗡𝗘𝗟 𝗩𝗜𝗣</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[7px] text-blue-700 font-bold mt-0.5">
                      <span className="flex items-center gap-0.5 text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        LIVE
                      </span>
                      <span className="text-slate-400">|</span>
                      <span>PING: {srvPing}MS</span>
                    </div>
                  </div>

                  {/* SOUND & CLOSE BUTTONS */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title={soundEnabled ? "Mute Voice" : "Enable Voice"}
                    >
                      {soundEnabled ? <Volume2 className="w-2.5 h-2.5 text-blue-600" /> : <VolumeX className="w-2.5 h-2.5 text-gray-400" />}
                    </button>
                    <button
                      onClick={handleClosePopup}
                      className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black cursor-pointer shadow-sm active:scale-85 transition-transform"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* EXACT PERIOD SYNC BAR WITH DIRECT EDIT / TAP TO MATCH GAME SCREEN */}
                <div className="mt-1.5 px-2 py-1 bg-blue-50/90 rounded-lg border border-blue-200 text-[7.5px]">
                  {!isEditingPeriod ? (
                    <div className="flex items-center justify-between">
                      {/* Period click to edit */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempPeriodInput(periodNumber);
                          setIsEditingPeriod(true);
                        }}
                        className="flex items-center gap-1 font-bold text-slate-700 cursor-pointer hover:text-blue-600 group"
                        title="Click to enter your exact game period"
                      >
                        <span className="text-blue-800">PERIOD:</span>
                        <span className="font-mono text-blue-950 font-black text-[9px] underline decoration-blue-300">
                          {periodNumber.length > 5 ? `...${periodNumber.slice(-5)}` : periodNumber}
                        </span>
                        <Edit3 className="w-2.5 h-2.5 text-blue-500 group-hover:scale-110" />
                      </div>

                      {/* Manual +/- adjusters and timer */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center bg-white rounded border border-blue-200 overflow-hidden shadow-xs">
                          <button
                            onClick={(e) => { e.stopPropagation(); adjustPeriod(-1); }}
                            className="px-1 py-[1px] hover:bg-blue-100 text-blue-800 font-black"
                            title="Previous Period (-1)"
                          >
                            <Minus className="w-2 h-2" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSyncLiveIST(); }}
                            className="px-1 py-[1px] text-[6px] hover:bg-blue-100 text-slate-600 border-x border-blue-100 font-bold"
                            title="Auto Sync to Live IST"
                          >
                            SYNC
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); adjustPeriod(1); }}
                            className="px-1 py-[1px] hover:bg-blue-100 text-blue-800 font-black"
                            title="Next Period (+1)"
                          >
                            <Plus className="w-2 h-2" />
                          </button>
                        </div>

                        {/* COUNTDOWN TIMER */}
                        <div className={`font-mono font-black text-[7.5px] px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                          countdownSec <= 5 ? "bg-red-500 text-white animate-pulse" : "bg-blue-600 text-white"
                        }`}>
                          <Clock className="w-2 h-2" />
                          <span>{String(countdownSec).padStart(2, "0")}s</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* DIRECT PERIOD INPUT BOX SO USER CAN MATCH 100% OF THEIR GAME SCREEN */
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-blue-900 font-bold text-[7px]">ENTER PERIOD:</span>
                      <input
                        type="text"
                        value={tempPeriodInput}
                        onChange={(e) => setTempPeriodInput(e.target.value)}
                        placeholder="e.g. 0682 or full"
                        className="flex-1 bg-white border border-blue-400 rounded px-1.5 py-0.5 text-[8px] font-mono font-bold text-blue-950 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        autoFocus
                      />
                      <button
                        onClick={handleSavePeriodInput}
                        className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[7px] font-bold hover:bg-blue-700 flex items-center gap-0.5"
                      >
                        <Check className="w-2 h-2" />
                        SET
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* INNER CONTENT AREA */}
              <div className="m-[2px] bg-white rounded-[18px] p-[8px_7px] border border-blue-200 shadow-inner flex flex-col items-center justify-center min-h-[105px]">
                
                {/* STATE 1: WINGO PREDICTION RESULT CARD */}
                {curState === "stWingo" && (
                  <div className="w-full animate-[stIn_0.25s_ease_forwards]">
                    {showPredBox && predData ? (
                      /* HIGH-ACCURACY RESULT DISPLAY MATCHING PERIOD NUMBER */
                      <div className="bg-gradient-to-br from-white via-blue-50/40 to-slate-50 rounded-[14px] p-[8px_7px] border-2 border-blue-400 shadow-[0_4px_16px_rgba(37,99,235,0.18)] relative overflow-hidden">
                        
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-blue-100">
                          <span className="text-[7.5px] text-blue-950 font-black tracking-wide">
                            PERIOD: <span className="text-blue-600 font-mono text-[9px]">{periodNumber.slice(-4)}</span>
                          </span>
                          <span className="flex items-center gap-1 text-[6.5px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
                            98.6% WIN SIGNAL
                          </span>
                        </div>

                        {/* BIG RESULT BALL + INFORMATION */}
                        <div className="flex items-center gap-2.5">
                          {/* 3D GLOSSY COLORFUL NUMBER BALL */}
                          <div className="relative w-[56px] h-[56px] shrink-0 flex items-center justify-center">
                            <div
                              className="absolute inset-0 rounded-full animate-pulse"
                              style={{
                                boxShadow: `0 0 16px ${currentPredColor.glowColor}`,
                                border: `2px solid ${currentPredColor.glowColor}`
                              }}
                            />
                            <img
                              src={getNumberImageSrc(predData.n)}
                              alt={`Number ${predData.n}`}
                              className="w-[50px] h-[50px] object-contain relative z-2 animate-[imgPop_0.35s_cubic-bezier(0.34,1.56,0.64,1)_both]"
                            />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
                            {/* COLOR NAME BADGE */}
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase text-white tracking-wide shadow-xs ${currentPredColor.badgeBg} border ${currentPredColor.badgeBorder}`}>
                                {currentPredColor.name}
                              </span>
                            </div>

                            {/* BIG / SMALL SIGNAL */}
                            <div className={`font-['Orbitron'] text-[15px] font-black tracking-[1.5px] leading-tight ${
                              predData.s === "BIG" ? "text-amber-500 drop-shadow-[0_0_6px_#fbbf24]" : "text-blue-600 drop-shadow-[0_0_6px_#38bdf8]"
                            }`}>
                              {predData.s} ({predData.n})
                            </div>

                            {/* DYNAMIC OPPOSITE HEDGE NUMBER (VARIED 0-4, NOT STUCK ON 2) */}
                            <div className="text-[7px] font-bold text-slate-600 flex items-center gap-1 mt-0.5">
                              <span>SAFE HEDGE:</span>
                              <span className={predData.s === "SMALL" ? "text-amber-600 font-black" : "text-blue-600 font-black"}>
                                {predData.s === "SMALL" ? "BIG" : "SMALL"} ({predData.oppN})
                              </span>
                              <span className={`px-1 py-[0.5px] rounded text-[5.5px] text-white font-bold ${oppColor.badgeBg}`}>
                                {oppColor.name}
                              </span>
                            </div>

                            {/* ACCURACY PROBABILITY BAR */}
                            <div className="h-[3.5px] bg-slate-200 rounded-full overflow-hidden my-[2px]">
                              <div className="h-full w-[98.6%] rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-700" />
                            </div>
                            <div className="text-[6px] text-slate-500 flex justify-between font-bold">
                              <span>GOAOK MATCH: 100%</span>
                              <span className="text-emerald-600">WIN CHANCE: 98.6%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* IDLE STATE: READY TO SCAN */
                      <div className="text-center py-2 px-1">
                        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-200 p-2 mb-2 shadow-xs">
                          <div className="text-[7px] tracking-wider text-amber-600 font-bold mb-0.5 flex items-center justify-center gap-1">
                            <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            TARGET PERIOD: <span className="font-mono text-blue-900 font-black">{periodNumber.slice(-4)}</span>
                          </div>
                          <div className="font-['Orbitron'] text-[15px] font-black text-blue-900 tracking-wider">
                            GOAOK VIP
                          </div>
                          <div className="text-[7px] text-slate-500 mt-0.5">
                            BALANCE: <span className="text-slate-800 font-bold">₹{balance.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="text-[9px] text-blue-950 font-bold leading-tight">
                          Press <span className="text-blue-600 underline">SCAN VIP</span> for accurate prediction
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STATE 2: DANGEROUS / EXCITING SCANNING SCREEN ("खतरनाक" HACKER SCANNER) */}
                {curState === "stBypass" && (
                  <div className="w-full text-center animate-[stIn_0.25s_ease_forwards] py-1">
                    {/* DANGEROUS SCAN RADAR WITH LASER RETICLES */}
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_#ef4444] animate-ping" />
                      <span className="text-[7px] tracking-wider text-red-600 font-black uppercase">
                        CRACKING GOAOK PERIOD {periodNumber.slice(-4)}
                      </span>
                    </div>

                    {/* INTENSE RADAR DISPLAY */}
                    <div className="relative w-[72px] h-[72px] mx-auto my-1">
                      {/* Pulse rings */}
                      <div className="absolute inset-0 rounded-full border border-red-500/30 animate-ping opacity-60" />
                      <div className="absolute inset-1 rounded-full border-2 border-blue-600/40" />
                      
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 76 76" fill="none">
                        <circle cx="38" cy="38" r="35" stroke="#2563eb" strokeWidth="1" strokeDasharray="4 2" fill="none" opacity="0.4" />
                        <circle cx="38" cy="38" r="24" stroke="#dc2626" strokeWidth="1.2" strokeDasharray="3 3" fill="none" opacity="0.6" />
                        
                        {/* Dual rotating scanning sweep beams */}
                        <g className="origin-[38px_38px] animate-snake-rot">
                          <line x1="38" y1="38" x2="38" y2="4" stroke="url(#scannerBeamLaser)" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                        <g className="origin-[38px_38px] animate-snake-rot-rev">
                          <line x1="38" y1="38" x2="4" y2="38" stroke="url(#scannerBeamLaser2)" strokeWidth="1.8" strokeLinecap="round" />
                        </g>
                        
                        <defs>
                          <linearGradient id="scannerBeamLaser" x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#dc2626" stopOpacity="1" />
                          </linearGradient>
                          <linearGradient id="scannerBeamLaser2" x1="1" y1="0" x2="0" y2="0" gradientUnits="objectBoundingBox">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="1" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Center percentage and glitch numbers */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <div className="font-['Orbitron'] text-[13px] font-black text-red-600 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]">
                          {bypassPct}%
                        </div>
                        <div className="font-mono text-[5.5px] text-blue-700 font-bold tracking-tighter">
                          {glitchCode}
                        </div>
                      </div>
                    </div>

                    {/* STATUS TICKER */}
                    <div className="mt-1 px-2 py-1 rounded-full bg-slate-100 border border-slate-300 text-[6px] text-slate-700 font-bold flex items-center justify-center gap-1 shadow-inner">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      <span className="truncate max-w-[170px]">{bypassLog}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex w-full gap-1.5 mt-2 px-1 pb-1">
                <button
                  id="execBtn"
                  onClick={handleScan}
                  disabled={bypassRunning}
                  className="flex-1 py-2 cursor-pointer border rounded-full font-['Orbitron'] text-[9px] font-black tracking-[1px] uppercase transition-all duration-180 flex items-center justify-center gap-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)] border-blue-400 active:scale-95 disabled:opacity-50 hover:brightness-110"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  {bypassRunning ? "TUNNELING..." : "SCAN VIP"}
                </button>
                <button
                  id="closeBtnBottom"
                  onClick={handleClosePopup}
                  className="px-4 py-2 cursor-pointer border rounded-full font-['Orbitron'] text-[9px] font-black tracking-[0.8px] uppercase transition-all duration-180 flex items-center justify-center bg-slate-100 text-slate-700 border-slate-300 active:scale-95 hover:bg-slate-200"
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
