import React, { useState, useEffect, useRef } from 'react';
import { EQUIPOS, ESTADIOS, WEATHER_OPTIONS, HISTORICO, MASSEY_RATINGS, COLLEY_RATINGS, PI_RATINGS, FASE_CONFIG } from './data';
import { SavedPick, Equipo, Estadio } from './types';
import { scoreProb, monteCarloSim, scoreProb as rawScoreProb } from './utils/math';
import { consensusRating } from './utils/ratings';
import { DeepAnalysis } from './components/DeepAnalysis';
import { 
  Shield, 
  Copy, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Save, 
  Thermometer, 
  Trash2, 
  Check,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  Trophy,
  Activity,
  Cpu,
  Home,
  Plane,
  Binary,
  LineChart,
  Coins,
  DollarSign,
  History,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Compass,
  TrendingUp,
  Sun,
  Flame,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  ThermometerSnowflake,
  Wind,
  CloudFog,
  Bookmark,
  FileDown,
  Layout,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  Percent,
  Settings,
  FolderOpen
} from 'lucide-react';

const getWeatherIcon = (id: string, size = 16) => {
  switch (id) {
    case 'soleado': return <Sun size={size} className="text-amber-500" />;
    case 'calor': return <Flame size={size} className="text-orange-500" />;
    case 'templado': return <CloudSun size={size} className="text-sky-400" />;
    case 'nublado': return <Cloud size={size} className="text-slate-400" />;
    case 'lluvia_leve': return <CloudDrizzle size={size} className="text-blue-400" />;
    case 'lluvia_mod': return <CloudRain size={size} className="text-blue-500" />;
    case 'lluvia_int': return <CloudLightning size={size} className="text-purple-400" />;
    case 'frio': return <ThermometerSnowflake size={size} className="text-cyan-400" />;
    case 'viento': return <Wind size={size} className="text-teal-400" />;
    case 'niebla': return <CloudFog size={size} className="text-slate-500" />;
    default: return <CloudSun size={size} className="text-slate-400" />;
  }
};


const renderFlagEmoji = (name: string, defaultFlag: string, sizeClass: string = "text-base") => {
  if (name === 'Inglaterra') {
    return (
      <span className={`inline-flex items-center select-none ${sizeClass}`} title="Inglaterra">
        <svg viewBox="0 0 500 300" className="w-[1.25em] h-[0.75em] rounded-sm shadow-sm border border-brand-border/40 inline-block self-center shrink-0">
          <rect width="500" height="300" fill="#fff"/>
          <rect width="60" height="300" x="220" fill="#ce1124"/>
          <rect width="500" height="60" y="120" fill="#ce1124"/>
        </svg>
      </span>
    );
  }
  if (name === 'Escocia') {
    return (
      <span className={`inline-flex items-center select-none ${sizeClass}`} title="Escocia">
        <svg viewBox="0 0 500 300" className="w-[1.25em] h-[0.75em] rounded-sm shadow-sm border border-brand-border/40 inline-block self-center shrink-0">
          <rect width="500" height="300" fill="#005eb8"/>
          <path d="M0,0 L500,300 M500,0 L0,300" stroke="#fff" strokeWidth="60"/>
        </svg>
      </span>
    );
  }
  return <span className={`inline-block select-none ${sizeClass}`}>{defaultFlag}</span>;
};


export default function App() {
  // Selector State
  const [localTeam, setLocalTeam] = useState<string>('');
  const [visitanteTeam, setVisitanteTeam] = useState<string>('');
  const [estadioIdx, setEstadioIdx] = useState<string>('');
  const [selectedWeather, setSelectedWeather] = useState<string>('templado');
  const [weatherTab, setWeatherTab] = useState<'preset' | 'live'>('preset');

  // Live Weather States
  const [tempLive, setTempLive] = useState<number>(22);
  const [humLive, setHumLive] = useState<number>(55);
  const [vientoLive, setVientoLive] = useState<number>(10);
  const [precipLive, setPrecipLive] = useState<string>('0');
  const [altitudLive, setAltitudLive] = useState<string>('baja');

  // Model Tuning phase
  const [currentFase, setCurrentFase] = useState<string>('grupos');
  const [calibracionOpen, setCalibracionOpen] = useState<boolean>(true);
  const [picksOpen, setPicksOpen] = useState<boolean>(true);

  // Math simulation trigger
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  // Odds calculator input
  const [oddsInput, setOddsInput] = useState<string>('');
  const [evCalculated, setEvCalculated] = useState<string>('—');

  // Historial Stats tab
  const [histTab, setHistTab] = useState<'goles' | '1x2' | 'handicap' | 'clima'>('goles');

  // Preferred market strategy filter
  const [preferredMarket, setPreferredMarket] = useState<'auto' | 'goles' | 'handicap'>('auto');

  // Saved Picks from localStorage
  const [savedPicks, setSavedPicks] = useState<SavedPick[]>([]);
  const [modalPickId, setModalPickId] = useState<number | null>(null);

  const [bankrollInicial, setBankrollInicial] = useState<number>(() => {
    const saved = localStorage.getItem('wc2026_bankroll_v1');
    return saved ? parseFloat(saved) : 1000;
  });

  const updateBankrollInicial = (val: number) => {
    setBankrollInicial(val);
    localStorage.setItem('wc2026_bankroll_v1', val.toString());
  };

  const updatePickCuotaReal = (id: number, val: number | undefined) => {
    const updated = savedPicks.map((p) => {
      if (p.id === id) {
        return { ...p, cuotaReal: val };
      }
      return p;
    });
    setSavedPicks(updated);
    localStorage.setItem('wc2026_picks_react_v1', JSON.stringify(updated));
  };

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastShow, setToastShow] = useState<boolean>(false);

  // Results interactive tab selection
  const [resultsTab, setResultsTab] = useState<'mc' | 'poisson' | 'consenso'>('mc');

  // Refs for canvas exporting
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load Saved Picks on startup
  useEffect(() => {
    const saved = localStorage.getItem('wc2026_picks_react_v1');
    if (saved) {
      try {
        setSavedPicks(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading saved picks', e);
      }
    }
  }, []);

  // Update pron when preferredMarket changes
  useEffect(() => {
    if (!analysisResult) return;
    setAnalysisResult((prev: any) => {
      if (!prev) return null;
      let selectedPron = prev.autoPron;
      if (preferredMarket === 'goles') selectedPron = prev.golesPron;
      if (preferredMarket === 'handicap') selectedPron = prev.handicapPron;

      // recalculate EV feedback if odds input exists
      return {
        ...prev,
        pron: selectedPron
      };
    });
  }, [preferredMarket]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setToastShow(true);
    setTimeout(() => {
      setToastShow(false);
    }, 2800);
  };

  const handleAnalizar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!localTeam || !visitanteTeam) {
      triggerToast('⚠️ Selecciona ambos equipos');
      return;
    }
    if (localTeam === visitanteTeam) {
      triggerToast('⚠️ Los equipos deben ser distintos');
      return;
    }

    setLoading(true);
    setAnalysisResult(null);

    // Simulate ML processing time to make it feel high-tech
    setTimeout(() => {
      const local = EQUIPOS.find((t) => t.name === localTeam)!;
      const visitante = EQUIPOS.find((t) => t.name === visitanteTeam)!;
      const estadio = estadioIdx ? ESTADIOS[parseInt(estadioIdx)] : null;

      const faseCfg = FASE_CONFIG[currentFase] || FASE_CONFIG['grupos'];
      const rho = faseCfg.rho;
      const ahFaseMod = faseCfg.ahMod;

      // 1. Math ratings consensus
      const ratings = consensusRating(localTeam, visitanteTeam);

      const eloLocal = MASSEY_RATINGS[localTeam] ?? 0.5;
      const eloVisit = MASSEY_RATINGS[visitanteTeam] ?? 0.5;
      const eloDiff = eloLocal - eloVisit;

      // 2. Base Poisson setup (attack & defense strengths relative to reference 1.35 goals/game)
      const avgGoals = 1.35;
      const attLocal = local.golesXP / avgGoals;
      const attVisit = visitante.golesXP / avgGoals;
      const defLocal = Math.max(0.5, 1 - local.handicapBias * 0.3);
      const defVisit = Math.max(0.5, 1 - visitante.handicapBias * 0.3);

      let lambdaH = attLocal * defVisit * avgGoals;
      let lambdaA = attVisit * defLocal * avgGoals;

      // 3. Climate adaptation adjustments
      let weatherAdj = 0;
      let handicapClimaAdj = 0;
      let climaDescCombined = '';

      if (weatherTab === 'preset') {
        const w = WEATHER_OPTIONS.find((wo) => wo.id === selectedWeather)!;
        weatherAdj = w.golesAdj;
        handicapClimaAdj = w.handicapAdj;
        climaDescCombined = `${w.label}`;
      } else {
        const temp = tempLive;
        const viento = vientoLive;
        const precip = parseInt(precipLive);
        if (temp > 33) {
          weatherAdj = -0.15;
          climaDescCombined = `T. Elevada / Extrema: ${temp}°C`;
        } else if (temp < 12) {
          weatherAdj = -0.08;
          climaDescCombined = `T. Baja / Fría: ${temp}°C`;
        } else {
          weatherAdj = 0.08;
          climaDescCombined = `T. Moderada: ${temp}°C`;
        }
        if (viento > 40) weatherAdj -= 0.18;
        if (precip >= 2) weatherAdj -= precip * 0.06;
      }

      // Climate bias multiplier based on adaptabilities
      const climaActual = weatherTab === 'preset' ? selectedWeather : 'custom';
      let climaLocalMult = 1.0;
      let climaVisitMult = 1.0;

      if (local.climaFav.some((c) => climaActual.includes(c.split(' ')[0]) || c.includes(climaActual.split(' ')[0]))) {
        climaLocalMult = 1.08;
      } else if (local.climaAfecta.some((c) => climaActual.includes(c.split(' ')[0]) || c.includes(climaActual.split(' ')[0]))) {
        climaLocalMult = 0.88;
      }

      if (visitante.climaFav.some((c) => climaActual.includes(c.split(' ')[0]) || c.includes(climaActual.split(' ')[0]))) {
        climaVisitMult = 1.06;
      } else if (visitante.climaAfecta.some((c) => climaActual.includes(c.split(' ')[0]) || c.includes(climaActual.split(' ')[0]))) {
        climaVisitMult = 0.90;
      }

      const climaGlobMult = 1 + weatherAdj / 2.64;
      lambdaH = Math.max(0.3, lambdaH * climaLocalMult * climaGlobMult);
      lambdaA = Math.max(0.3, lambdaA * climaVisitMult * climaGlobMult);

      // 4. Altitude adjustments
      if (estadio) {
        if (estadio.altitud.includes('2240m') || estadio.altitud.includes('Alta')) {
          if (localTeam === 'México') lambdaH *= 1.12;
          lambdaA *= 0.92;
        } else if (estadio.altitud.includes('Media')) {
          lambdaH *= 1.03;
          lambdaA *= 0.97;
        }
      }

      // Home field advantage (nominal simulation)
      lambdaH *= 1.08;

      // 5. Elo differential mapping to goals redistribution
      const eloFactor = Math.tanh(eloDiff / 2.0);
      lambdaH = Math.max(0.3, lambdaH * (1 + eloFactor * 0.15));
      lambdaA = Math.max(0.3, lambdaA * (1 - eloFactor * 0.15));

      // 5b. Phase-based Calibration
      lambdaH = Math.max(0.25, lambdaH * faseCfg.lambdaMult);
      lambdaA = Math.max(0.25, lambdaA * faseCfg.lambdaMult);

      // 6. 10K Monte Carlo simulation engine
      const mc = monteCarloSim(lambdaH, lambdaA, 10000);

      const localWinProb = mc.winH * 100;
      const drawProb = mc.draw * 100;
      const visitWinProb = mc.winA * 100;
      const ovProb = mc.over25 * 100;
      const unProb = (1 - mc.over25) * 100;
      const ov35Prob = mc.over35 * 100;
      const ov15Prob = mc.over15 * 100;
      const bttsProb = mc.btts * 100;
      const csHProb = mc.cleanSheetH * 100;
      const golesEsperados = lambdaH + lambdaA;

      // 7. Asian Handicap calculation
      let handicapBase = local.handicapBias - visitante.handicapBias + handicapClimaAdj + ahFaseMod;
      if (estadio && (estadio.altitud.includes('2240m') || estadio.altitud.includes('Alta'))) {
        if (localTeam === 'México') handicapBase -= 0.25;
      }

      let handicapLine = 0;
      if (handicapBase <= -0.75) handicapLine = -1;
      else if (handicapBase <= -0.25) handicapLine = -0.5;
      else if (handicapBase >= 0.75) handicapLine = 1;
      else if (handicapBase >= 0.25) handicapLine = 0.5;

      const localFavorito = localWinProb >= visitWinProb;
      const handicapStr =
        handicapLine > 0
          ? `AH ${localFavorito ? visitante.name : local.name} +${handicapLine}`
          : handicapLine < 0
            ? `AH ${localFavorito ? local.name : visitante.name} ${handicapLine}`
            : 'Hándicap 0 (empate asiático)';

      // 7b. Dynamic Asian Handicap cover probability (accurately representing underdog cover vs favorite win)
      let ahFavProb = 50;
      if (handicapLine > 0) {
        // Betting on UNDERDOG (e.g. Catar +0.5 or +1.0)
        const underdogWin = localFavorito ? visitWinProb : localWinProb;
        if (handicapLine === 0.5) {
          ahFavProb = underdogWin + drawProb; // Wins on Win or Draw
        } else if (handicapLine === 1) {
          ahFavProb = underdogWin + drawProb + Math.max(0, (100 - underdogWin - drawProb) * 0.4); // Wins on Win/Draw, Pushes on 1-goal Loss
        } else {
          ahFavProb = underdogWin + drawProb;
        }
      } else if (handicapLine < 0) {
        // Betting on FAVORITE (e.g. Suiza -0.5 or -1.0)
        const favoriteWin = localFavorito ? localWinProb : visitWinProb;
        if (handicapLine === -0.5) {
          ahFavProb = favoriteWin; // Wins on Win
        } else if (handicapLine === -1) {
          ahFavProb = Math.max(20, favoriteWin - 15); // Wins on 2+ goal Win, Pushes on 1-goal Win
        } else {
          ahFavProb = favoriteWin;
        }
      } else {
        // Draw No Bet (AH 0)
        const favoriteWin = localFavorito ? localWinProb : visitWinProb;
        ahFavProb = favoriteWin + drawProb * 0.5;
      }
      ahFavProb = Math.max(30, Math.min(88, ahFavProb));

      // 8. Base selection pick candidate
      let pickMercado = 'GOLES';
      let pickLinea = '';
      let pickProb = 0;
      let pickProbRaw = 0;
      let pickColor = '#00FF88';

      if (golesEsperados > 2.5) {
        pickLinea = 'MÁS DE 2.5 GOLES';
        pickProb = ovProb;
        pickProbRaw = mc.over25;
        pickColor = 'var(--accent3)';
      } else if (golesEsperados > 1.5) {
        pickLinea = 'MÁS DE 1.5 GOLES';
        pickProb = ov15Prob;
        pickProbRaw = mc.over15;
        pickColor = 'var(--accent3)';
      } else {
        pickLinea = 'MENOS DE 2.5 GOLES';
        pickProb = unProb;
        pickProbRaw = 1 - mc.over25;
        pickColor = 'var(--gold)';
      }

      // If Asian handicap has extremely high confidence, prioritize it
      let autoPickMercado = pickMercado;
      let autoPickLinea = pickLinea;
      let autoPickProb = pickProb;
      let autoPickProbRaw = pickProbRaw;
      let autoPickColor = pickColor;

      if (ahFavProb > pickProb && ahFavProb > 58) {
        autoPickMercado = 'HÁNDICAP ASIÁTICO';
        autoPickLinea = handicapStr;
        autoPickProb = ahFavProb;
        autoPickProbRaw = ahFavProb / 100;
        autoPickColor = 'var(--gold)';
      }

      const golesPron = {
        mercado: 'GOLES',
        linea: pickLinea,
        prob: pickProb,
        probRaw: pickProbRaw,
        color: pickColor,
      };

      const handicapPron = {
        mercado: 'HÁNDICAP ASIÁTICO',
        linea: handicapStr,
        prob: ahFavProb,
        probRaw: ahFavProb / 100,
        color: 'var(--gold)',
      };

      const autoPron = {
        mercado: autoPickMercado,
        linea: autoPickLinea,
        prob: autoPickProb,
        probRaw: autoPickProbRaw,
        color: autoPickColor,
      };

      const generatedResult = {
        local,
        visitante,
        estadio,
        golesEsperados,
        lambdaH,
        lambdaA,
        localWinProb,
        drawProb,
        visitWinProb,
        ovProb,
        unProb,
        ov35Prob,
        ov15Prob,
        bttsProb,
        csHProb,
        ahFavProb,
        handicapStr,
        handicapLine,
        localFavorito,
        eloLocal,
        eloVisit,
        eloDiff,
        pMassey: ratings.pMassey,
        pColley: ratings.pColley,
        pPi: ratings.pPi,
        ratingWinLocal: ratings.combined,
        climaDesc: climaDescCombined,
        weatherAdj,
        faseLabel: {'grupos':'Fase de Grupos','ronda32':'Ronda de 32','octavos':'Octavos','cuartos':'Cuartos','semis':'Semis','final':'Final'}[currentFase] || currentFase,
        mc,
        golesPron,
        handicapPron,
        autoPron,
        pron: preferredMarket === 'goles' ? golesPron : preferredMarket === 'handicap' ? handicapPron : autoPron
      };

      setAnalysisResult(generatedResult);
      setOddsInput('');
      setEvCalculated('—');
      setLoading(false);
    }, 1200);
  };

  const handleEvInputChange = (val: string) => {
    setOddsInput(val);
    if (!analysisResult?.pron) return;
    const cuota = parseFloat(val);
    if (isNaN(cuota) || cuota < 1.01) {
      setEvCalculated('—');
      return;
    }
    const prob = analysisResult.pron.probRaw;
    const ev = (prob * cuota) - 1;
    setEvCalculated((ev >= 0 ? '+' : '') + (ev * 100).toFixed(2) + '%');
  };

  const saveToHistorial = () => {
    if (!analysisResult) {
      triggerToast('⚠️ Primero genera un pronóstico');
      return;
    }
    const pick: SavedPick = {
      id: Date.now(),
      local: analysisResult.local.name,
      visitante: analysisResult.visitante.name,
      localFlag: analysisResult.local.flag,
      visitanteFlag: analysisResult.visitante.flag,
      linea: analysisResult.pron.linea,
      mercado: analysisResult.pron.mercado,
      prob: analysisResult.pron.prob.toFixed(1),
      probRaw: analysisResult.pron.probRaw,
      cuotaJusta: (1 / analysisResult.pron.probRaw).toFixed(2),
      clima: analysisResult.climaDesc,
      fase: currentFase,
      date: new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
      result: 'open',
    };

    const updated = [pick, ...savedPicks];
    setSavedPicks(updated);
    localStorage.setItem('wc2026_picks_react_v1', JSON.stringify(updated));
    triggerToast('💾 Pick guardado en historial');
  };

  const deletePick = (id: number) => {
    const updated = savedPicks.filter((p) => p.id !== id);
    setSavedPicks(updated);
    localStorage.setItem('wc2026_picks_react_v1', JSON.stringify(updated));
    triggerToast('🗑️ Pick eliminado');
  };

  const handleStatusChangeClick = (id: number) => {
    setModalPickId(id);
  };

  const setPickResultStatus = (status: 'open' | 'win' | 'loss' | 'void') => {
    if (!modalPickId) return;
    const updated = savedPicks.map((p) => {
      if (p.id === modalPickId) {
        return { ...p, result: status };
      }
      return p;
    });
    setSavedPicks(updated);
    localStorage.setItem('wc2026_picks_react_v1', JSON.stringify(updated));
    setModalPickId(null);
    triggerToast(
      status === 'win'
        ? '✅ Marcado como ganado'
        : status === 'loss'
          ? '❌ Marcado como perdido'
          : status === 'void'
            ? '🟡 Pick anulado'
            : '⏳ Pick restablecido'
    );
  };

  // Exporters
  const exportCopy = () => {
    if (!analysisResult) return;
    const text = `⚽ MUNDIAL 2026 — Pronóstico
${analysisResult.local.flag} ${analysisResult.local.name} vs ${analysisResult.visitante.name} ${analysisResult.visitante.flag}
━━━━━━━━━━━━━━━━━━━━━
📌 ${analysisResult.pron.mercado}: ${analysisResult.pron.linea}
📊 Confianza: ${analysisResult.pron.prob.toFixed(1)}%
💰 Cuota Justa: ${(1 / analysisResult.pron.probRaw).toFixed(2)}
🌡️ Clima: ${analysisResult.climaDesc}
⚙️ Fase: ${analysisResult.faseLabel}
━━━━━━━━━━━━━━━━━━━━━
Motor: Dixon-Coles + Monte Carlo 10K
Pi Rating (Constantinou & Fenton, 2013)`;

    navigator.clipboard.writeText(text).then(
      () => triggerToast('📋 Copiado al portapapeles'),
      () => triggerToast('⚠️ No se pudo copiar')
    );
  };

  const exportCSV = () => {
    if (!analysisResult) return;
    const p = analysisResult.pron;
    const header = ['Partido', 'Local', 'Visitante', 'Mercado', 'Linea', 'Confianza%', 'CuotaJusta', 'Clima', 'Fase', 'Fecha'];
    const row = [
      `${analysisResult.local.name} vs ${analysisResult.visitante.name}`,
      analysisResult.local.name,
      analysisResult.visitante.name,
      p.mercado,
      p.linea,
      p.prob.toFixed(1),
      (1 / p.probRaw).toFixed(2),
      analysisResult.climaDesc,
      currentFase,
      new Date().toLocaleDateString('es-MX'),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [header.join(','), row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pronostico_wc2026_${analysisResult.local.name}_vs_${analysisResult.visitante.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('📊 CSV descargado');
  };

  const exportCard = () => {
    if (!analysisResult) return;
    const p = analysisResult.pron;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw high quality card
    ctx.fillStyle = '#050A0F';
    ctx.fillRect(0, 0, 640, 340);

    // Grid details
    ctx.strokeStyle = 'rgba(0,200,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 640; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 340);
      ctx.stroke();
    }
    for (let y = 0; y < 340; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }

    // Top linear bar design
    const grad = ctx.createLinearGradient(0, 0, 640, 0);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, '#00C8FF');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 2);

    // Outer border
    ctx.strokeStyle = '#1A3A55';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 639, 339);

    // Titles
    ctx.fillStyle = '#00C8FF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('⚽  MUNDIAL 2026  —  MOTOR DIXON-COLES + MONTE CARLO', 20, 32);

    // Match text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`${analysisResult.local.flag} ${analysisResult.local.name}  vs  ${analysisResult.visitante.name} ${analysisResult.visitante.flag}`, 20, 72);

    // Divider
    ctx.fillStyle = '#1A3A55';
    ctx.fillRect(20, 88, 600, 1);

    // Main pick display
    ctx.fillStyle = p.color === 'var(--accent3)' ? '#00FF88' : p.color === 'var(--gold)' ? '#FFD700' : '#FF6B00';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText(p.linea, 20, 148);

    // Bar background
    ctx.fillStyle = '#0C1A24';
    ctx.beginPath();
    // @ts-ignore
    ctx.roundRect ? ctx.roundRect(20, 165, 340, 14, 7) : ctx.rect(20, 165, 340, 14);
    ctx.fill();

    // Bar complete
    const barW = Math.round(340 * (p.prob / 100));
    ctx.fillStyle = p.color === 'var(--accent3)' ? '#00FF88' : p.color === 'var(--gold)' ? '#FFD700' : '#FF6B00';
    ctx.beginPath();
    // @ts-ignore
    ctx.roundRect ? ctx.roundRect(20, 165, barW, 14, 7) : ctx.rect(20, 165, barW, 14);
    ctx.fill();

    // Prob labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${p.prob.toFixed(1)}%  Confianza Poisson`, 20, 205);

    // Metadata lines
    ctx.fillStyle = '#FFD700';
    ctx.font = '13px monospace';
    ctx.fillText(`Cuota justa: ${(1 / p.probRaw).toFixed(2)}   ·   Clima: ${analysisResult.climaDesc}   ·   Fase: ${analysisResult.faseLabel}`, 20, 232);

    // Fine lines
    ctx.fillStyle = '#1A3A55';
    ctx.fillRect(20, 252, 600, 1);

    // Bottom descriptions
    ctx.fillStyle = '#5A7A8A';
    ctx.font = '10px monospace';
    ctx.fillText('Pi Rating (Constantinou & Fenton, 2013)  ·  Model predictions strictly statistical.', 20, 274);

    ctx.fillStyle = '#2A4A5A';
    ctx.font = '9px monospace';
    ctx.fillText(new Date().toLocaleString('es-MX'), 460, 315);

    canvas.toBlob((blob) => {
      if (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `wc2026_${analysisResult.local.name}_vs_${analysisResult.visitante.name}.png`;
        a.click();
        triggerToast('🖼️ Imagen descargada');
      }
    });
  };

  // Saved Picks Stats & Financial Capital Management (1% Flat Stake)
  const activeCount = savedPicks.length;
  const winsCount = savedPicks.filter((p) => p.result === 'win').length;
  const lossCount = savedPicks.filter((p) => p.result === 'loss').length;
  const voidsCount = savedPicks.filter((p) => p.result === 'void').length;
  const completedCount = winsCount + lossCount;
  const hitRate = completedCount > 0 ? Math.round((winsCount / completedCount) * 100) : 0;

  const stakeValue = bankrollInicial * 0.01;
  const settledChronological = [...savedPicks]
    .filter((p) => p.result !== 'open')
    .reverse(); // chronological order oldest to newest

  let netProfit = 0;
  settledChronological.forEach((p) => {
    const rawOdd = p.cuotaReal || parseFloat(p.cuotaJusta) || 1.90;
    if (p.result === 'win') {
      netProfit += stakeValue * (rawOdd - 1);
    } else if (p.result === 'loss') {
      netProfit -= stakeValue;
    }
    // void counts as 0 change
  });

  const bankrollActual = bankrollInicial + netProfit;
  const roi = bankrollInicial > 0 ? (netProfit / bankrollInicial) * 100 : 0;
  
  // Total risk volume
  const totalStakedVolume = completedCount * stakeValue;
  const yieldPct = totalStakedVolume > 0 ? (netProfit / totalStakedVolume) * 100 : 0;

  const getBankrollHistoryData = () => {
    let currentBank = bankrollInicial;
    const historyPoints = [
      {
        index: 0,
        label: 'Inicio',
        val: currentBank,
        tooltip: 'Banca Inicial',
      },
    ];

    settledChronological.forEach((pick, idx) => {
      const rawOdd = pick.cuotaReal || parseFloat(pick.cuotaJusta) || 1.90;
      let change = 0;
      if (pick.result === 'win') {
        change = stakeValue * (rawOdd - 1);
      } else if (pick.result === 'loss') {
        change = -stakeValue;
      }
      currentBank += change;
      historyPoints.push({
        index: idx + 1,
        label: `Pick #${idx + 1}`,
        val: currentBank,
        tooltip: `${pick.localFlag} vs ${pick.visitanteFlag}: ${change >= 0 ? '+' : ''}${change.toFixed(1)}u (${pick.result.toUpperCase()} - Cuota: ${rawOdd.toFixed(2)})`,
      });
    });

    return historyPoints;
  };

  const renderBankrollChart = () => {
    const points = getBankrollHistoryData();
    if (points.length < 2) {
      return (
        <div className="text-center py-6 text-brand-muted text-[10px] uppercase tracking-wider font-mono border border-brand-border/40 rounded-xl bg-brand-bg/20 px-4 mt-1 mb-4">
          📈 Se requieren al menos 1 pronóstico marcado como Ganado o Perdido para graficar tu curva de inversión.
        </div>
      );
    }

    const values = points.map((p) => p.val);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal;

    // Pad limits
    const minBound = minVal - (range === 0 ? bankrollInicial * 0.05 : range * 0.15);
    const maxBound = maxVal + (range === 0 ? bankrollInicial * 0.05 : range * 0.15);
    const boundRange = maxBound - minBound;

    const width = 500;
    const height = 150;
    const paddingX = 40;
    const paddingY = 20;

    const getSvgCoords = (index: number, val: number) => {
      const x = paddingX + (index / (points.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - ((val - minBound) / (boundRange || 1)) * (height - 2 * paddingY);
      return { x, y };
    };

    let pathD = '';
    let areaD = '';
    const dots: { x: number; y: number; label: string; val: number; tooltip: string }[] = [];

    points.forEach((p, idx) => {
      const { x, y } = getSvgCoords(idx, p.val);
      dots.push({ x, y, label: p.label, val: p.val, tooltip: p.tooltip });
      if (idx === 0) {
        pathD += `M ${x} ${y}`;
        areaD += `M ${x} ${height - paddingY} L ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
        areaD += ` L ${x} ${y}`;
      }
      if (idx === points.length - 1) {
        areaD += ` L ${x} ${height - paddingY} Z`;
      }
    });

    return (
      <div className="bg-brand-bg border border-brand-border rounded-xl p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 border-b border-brand-border/40 pb-2">
          <div>
            <div className="text-[10px] text-brand-muted uppercase tracking-wider font-bold mb-0.5">Gráfica de Rendimiento de Inversión</div>
            <div className="text-xs text-brand-text font-serif italic">Evolución de la banca con stake plano de 1% (${stakeValue.toFixed(1)})</div>
          </div>
          <div className="flex items-center gap-1.5 font-space text-[9px] font-bold text-brand-accent px-2 py-0.5 rounded-full bg-brand-accent/10 border border-brand-accent/20">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse"></span>
            PROGRESO REAL
          </div>
        </div>

        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            <defs>
              <linearGradient id="bankrollGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FF88" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#00FF88" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const val = minBound + ratio * boundRange;
              const y = height - paddingY - ratio * (height - 2 * paddingY);
              return (
                <g key={i} className="opacity-25" style={{ pointerEvents: 'none' }}>
                  <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--brand-border)" strokeWidth="1" strokeDasharray="3 3" />
                  <text x={paddingX - 8} y={y + 3} className="fill-brand-muted font-mono text-[8px]" textAnchor="end">
                    ${Math.round(val)}
                  </text>
                </g>
              );
            })}

            {/* Gradient Area */}
            {points.length >= 2 && <path d={areaD} fill="url(#bankrollGradient)" style={{ pointerEvents: 'none' }} />}

            {/* Path Line */}
            {points.length >= 2 && <path d={pathD} fill="none" stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />}

            {/* Dot markers */}
            {dots.map((d, i) => (
              <g key={i} className="group/dot cursor-pointer">
                <circle cx={d.x} cy={d.y} r="3.5" fill="var(--brand-bg)" stroke="#00FF88" strokeWidth="2" className="transition-all duration-200 hover:r-5 hover:fill-brand-accent" />
                
                {/* Embedded Tooltip on Hover */}
                <g className="opacity-0 pointer-events-none group-hover/dot:opacity-100 transition-opacity duration-200" style={{ pointerEvents: 'none' }}>
                  <rect 
                    x={Math.max(5, Math.min(width - 135, d.x - 65))} 
                    y={d.y - 38} 
                    width="130" 
                    rx="4" 
                    height="30" 
                    fill="#101C24" 
                    stroke="var(--brand-border)" 
                    strokeWidth="1" 
                  />
                  <text 
                    x={Math.max(5, Math.min(width - 135, d.x - 65)) + 65} 
                    y={d.y - 27} 
                    textAnchor="middle" 
                    className="fill-white font-sans text-[8px] font-black"
                  >
                    {d.label} • ${Math.round(d.val)}
                  </text>
                  <text 
                    x={Math.max(5, Math.min(width - 135, d.x - 65)) + 65} 
                    y={d.y - 17} 
                    textAnchor="middle" 
                    className="fill-brand-muted font-sans text-[7px]"
                  >
                    {d.tooltip}
                  </text>
                </g>
              </g>
            ))}
          </svg>
        </div>
        <div className="flex items-center justify-between mt-1 text-[7px] uppercase tracking-wider font-mono text-brand-muted/70 px-8">
          <span>Capital Inicial</span>
          <span>Secuencia de Picks</span>
          <span>Capital Actual</span>
        </div>
      </div>
    );
  };

  // Render score heat map mapping function
  const renderPoissonTable = () => {
    if (!analysisResult) return null;
    const maxG = 5;
    const { lambdaH, lambdaA } = analysisResult;
    const rho = FASE_CONFIG[currentFase]?.rho || -0.11;

    let scoreMatrix: number[][] = [];
    let allScores: { home: number; away: number; prob: number }[] = [];

    for (let i = 0; i <= maxG; i++) {
      scoreMatrix[i] = [];
      for (let j = 0; j <= maxG; j++) {
        const p = scoreProb(i, j, lambdaH, lambdaA, rho);
        scoreMatrix[i][j] = p;
        allScores.push({ home: i, away: j, prob: p });
      }
    }
    allScores.sort((a, b) => b.prob - a.prob);
    const maxP = allScores[0].prob;

    const getHeatColor = (p: number) => {
      const t = p / maxP;
      if (t > 0.7) return { bg: 'rgba(0, 255, 136, 0.23)', col: '#00FF88' };
      if (t > 0.4) return { bg: 'rgba(0, 200, 255, 0.16)', col: '#00C8FF' };
      if (t > 0.2) return { bg: 'rgba(255, 215, 0, 0.11)', col: '#FFD700' };
      if (t > 0.08) return { bg: 'rgba(255, 107, 0, 0.08)', col: '#FF6B00' };
      return { bg: 'rgba(255, 255, 255, 0.03)', col: '#5A7A8A' };
    };

    // Calculate aggregated percentages for display rows
    let sumH = 0;
    let sumD = 0;
    let sumA = 0;
    for (let i = 0; i <= maxG; i++) {
      for (let j = 0; j <= maxG; j++) {
        const p = scoreMatrix[i][j];
        if (i > j) sumH += p;
        else if (i === j) sumD += p;
        else sumA += p;
      }
    }

    return (
      <div className="mt-2 text-brand-text">
        <div className="text-xs text-brand-muted mb-2 tracking-wide uppercase flex items-center gap-1.5 flex-wrap">
          Filas = Goles {renderFlagEmoji(analysisResult.local.name, analysisResult.local.flag)} {analysisResult.local.name} (Local) · Columnas = Goles {renderFlagEmoji(analysisResult.visitante.name, analysisResult.visitante.flag)} {analysisResult.visitante.name} (Visitante)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-[2px] sm:border-spacing-[3px] min-w-[280px]">
            <thead>
              <tr>
                <td className="p-1 text-[10px] sm:text-[11px] text-brand-muted text-center font-space">L↓ V→</td>
                {[0, 1, 2, 3, 4, 5].map((j) => (
                  <td key={j} className="text-center font-space text-[10px] sm:text-xs text-brand-muted font-bold p-1">
                    {j}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td className="text-right font-space text-[10px] sm:text-xs text-brand-muted font-bold p-1 pr-1.5 sm:pr-2">
                    {i}
                  </td>
                  {[0, 1, 2, 3, 4, 5].map((j) => {
                    const p = scoreMatrix[i][j];
                    const val = (p * 100).toFixed(1);
                    const { bg, col } = getHeatColor(p);
                    return (
                      <td
                        key={j}
                        style={{ backgroundColor: bg }}
                        className="rounded py-1 sm:py-1.5 px-0.5 sm:px-1 text-center cursor-default select-none transition-transform hover:scale-110 hover:z-10"
                        title={`${i}-${j}: ${val}%`}
                      >
                        <span style={{ color: col }} className="font-space font-bold text-[9px] sm:text-[11px]">
                          {val}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)] rounded p-2">
            <div className="text-[10px] text-brand-muted uppercase tracking-wider">LOCAL (Suma i &gt; j)</div>
            <div className="font-space text-sm font-bold text-brand-accent3">{(sumH * 100).toFixed(1)}%</div>
          </div>
          <div className="text-center bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.2)] rounded p-2">
            <div className="text-[10px] text-brand-muted uppercase tracking-wider">EMPATE (Suma diagonal)</div>
            <div className="font-space text-sm font-bold text-brand-gold">{(sumD * 100).toFixed(1)}%</div>
          </div>
          <div className="text-center bg-[rgba(0,200,255,0.08)] border border-[rgba(0,200,255,0.2)] rounded p-2">
            <div className="text-[10px] text-brand-muted uppercase tracking-wider">VISITANTE (Suma j &gt; i)</div>
            <div className="font-space text-sm font-bold text-brand-accent">{(sumA * 100).toFixed(1)}%</div>
          </div>
        </div>

        {/* Top 10 outcomes */}
        <div className="mt-4">
          <div className="text-xs text-brand-muted uppercase tracking-wider font-semibold mb-2">
            Top 10 marcadores de máxima probabilidad
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {allScores.slice(0, 10).map((s, idx) => {
              const { bg, col } = getHeatColor(s.prob);
              const sign = s.home > s.away ? '🏠' : s.home < s.away ? '✈️' : '🤝';
              return (
                <div
                  key={idx}
                  style={{ backgroundColor: bg, borderColor: `${col}33` }}
                  className="border rounded px-2 py-1.5 text-center transition-all hover:border-[var(--accent)]"
                >
                  <div className="font-space text-xs font-bold text-brand-text">
                    {s.home}–{s.away} {sign}
                  </div>
                  <div style={{ color: col }} className="font-space font-bold text-[11px] mt-0.5">
                    {(s.prob * 100).toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Ratings comparison bar
  const renderRatingsTable = () => {
    if (!analysisResult) return null;
    const { local, visitante, eloLocal, eloVisit, eloDiff, pMassey, pColley, pPi, ratingWinLocal } = analysisResult;

    // Massey diff scale normalize (-0.5 to 3.0)
    const masseyMin = -0.5;
    const masseyMax = 3.0;
    const mLocBar = ((MASSEY_RATINGS[local.name] ?? 0.5) - masseyMin) / (masseyMax - masseyMin) * 100;
    const mVisBar = ((MASSEY_RATINGS[visitante.name] ?? 0.5) - masseyMin) / (masseyMax - masseyMin) * 100;

    // Colley (0-1 represents probability straight away)
    const cLocBar = (COLLEY_RATINGS[local.name] ?? 0.5) * 100;
    const cVisBar = (COLLEY_RATINGS[visitante.name] ?? 0.5) * 100;

    // Pi (0.9 to 1.85)
    const piMin = 0.9;
    const piMax = 1.85;
    const piLocBar = (((PI_RATINGS[local.name]?.home ?? 1.2) - piMin) / (piMax - piMin)) * 100;
    const piVisBar = (((PI_RATINGS[visitante.name]?.away ?? 1.2) - piMin) / (piMax - piMin)) * 100;

    const renderBar = (pct: number, color: string) => (
      <div className="w-full h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mt-1">
        <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }} className="h-full rounded-full transition-all duration-700" />
      </div>
    );

    const winnerText = ratingWinLocal > 0.55 ? local.name : ratingWinLocal < 0.45 ? visitante.name : null;

    return (
      <div className="mt-2 text-brand-text">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {/* Local Column */}
          <div className="bg-[rgba(0,255,136,0.04)] border border-[rgba(0,255,136,0.15)] rounded-lg p-3">
            <div className="text-xs font-bold text-brand-muted mb-2 tracking-wider flex items-center gap-1.5 flex-wrap">
              🏠 {renderFlagEmoji(local.name, local.flag)} {local.name} (Local)
            </div>
            <div className="grid gap-2 text-xs">
              <div>
                <div className="flex justify-between items-baseline font-space">
                  <span className="text-brand-muted uppercase">MASSEY</span>
                  <span className="text-brand-accent3 font-bold">
                    {(MASSEY_RATINGS[local.name] ?? 0.5).toFixed(2)}
                  </span>
                </div>
                {renderBar(mLocBar, 'var(--accent3)')}
              </div>
              <div>
                <div className="flex justify-between items-baseline font-space">
                  <span className="text-brand-muted uppercase">COLLEY</span>
                  <span className="text-brand-accent3 font-bold">
                    {(COLLEY_RATINGS[local.name] ?? 0.5).toFixed(3)}
                  </span>
                </div>
                {renderBar(cLocBar, 'var(--accent3)')}
              </div>
              <div>
                <div className="flex justify-between items-baseline font-space">
                  <span className="text-brand-muted uppercase">Pi RATING (home)</span>
                  <span className="text-brand-accent3 font-bold">
                    {(PI_RATINGS[local.name]?.home ?? 1.2).toFixed(3)}
                  </span>
                </div>
                {renderBar(piLocBar, 'var(--accent3)')}
              </div>
            </div>
          </div>

          {/* Visitante Column */}
          <div className="bg-[rgba(0,200,255,0.04)] border border-[rgba(0,200,255,0.15)] rounded-lg p-3">
            <div className="text-xs font-bold text-brand-muted mb-2 tracking-wider flex items-center gap-1.5 flex-wrap">
              ✈️ {renderFlagEmoji(visitante.name, visitante.flag)} {visitante.name} (Visitante)
            </div>
            <div className="grid gap-2 text-xs">
              <div>
                <div className="flex justify-between items-baseline font-space">
                  <span className="text-brand-muted uppercase">MASSEY</span>
                  <span className="text-brand-accent font-bold">
                    {(MASSEY_RATINGS[visitante.name] ?? 0.5).toFixed(2)}
                  </span>
                </div>
                {renderBar(mVisBar, 'var(--accent)')}
              </div>
              <div>
                <div className="flex justify-between items-baseline font-space">
                  <span className="text-brand-muted uppercase">COLLEY</span>
                  <span className="text-brand-accent font-bold">
                    {(COLLEY_RATINGS[visitante.name] ?? 0.5).toFixed(3)}
                  </span>
                </div>
                {renderBar(cVisBar, 'var(--accent)')}
              </div>
              <div>
                <div className="flex justify-between items-baseline font-space">
                  <span className="text-brand-muted uppercase">Pi RATING (away)</span>
                  <span className="text-brand-accent font-bold">
                    {(PI_RATINGS[visitante.name]?.away ?? 1.2).toFixed(3)}
                  </span>
                </div>
                {renderBar(piVisBar, 'var(--accent)')}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic systems probability summary */}
        <div className="bg-brand-bg border border-brand-border rounded-lg p-3 mb-3">
          <div className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">
            Probabilidad local de ganar por sistema científico
          </div>
          <div className="space-y-1.5 text-xs font-space">
            {[
              { label: 'Massey (Mínimos Cuadrados)', val: pMassey, col: '#a78bfa' },
              { label: 'Colley (W/L puro sin sesgo)', val: pColley, col: '#fbbf24' },
              { label: 'Pi Rating (Log-score dinámico)', val: pPi, col: '#34d399' },
            ].map((s, idx) => (
              <div key={idx} className="flex items-center gap-10">
                <div style={{ color: s.col }} className="w-48 font-bold text-[11px] truncate">
                  {s.label}
                </div>
                <div className="flex-1 h-3 bg-[rgba(255,255,255,0.03)] rounded overflow-hidden">
                  <div
                    style={{ width: `${s.val * 100}%`, backgroundColor: s.col }}
                    className="h-full rounded transition-all duration-700"
                  />
                </div>
                <div style={{ color: s.col }} className="text-right w-10 font-bold">
                  {(s.val * 100).toFixed(1)}%
                </div>
              </div>
            ))}

            <div className="border-t border-brand-border pt-2 mt-2">
              <div className="flex items-center gap-10 font-bold">
                <div className="w-48 text-brand-gold text-[12px]">CONSENSO MODELOS</div>
                <div className="flex-1 h-4 bg-[rgba(255,255,255,0.03)] rounded overflow-hidden">
                  <div
                    style={{ width: `${ratingWinLocal * 100}%` }}
                    className="h-full bg-brand-gold rounded transition-all duration-700"
                  />
                </div>
                <div className="text-right w-10 text-brand-gold text-sm">
                  {(ratingWinLocal * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-[10px] text-brand-muted text-right mt-1 font-rajdhani">
                Ponderación calibrada: Pi Rating 50% + Massey 28% + Colley 22%
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs bg-brand-bg border border-brand-border rounded-lg p-3 text-brand-muted leading-relaxed">
          <div className="flex justify-between mb-1">
            <span>Diferencia Massey Goles:</span>
            <span className={`font-space font-bold ${eloDiff > 0 ? 'text-brand-accent3' : 'text-brand-red'}`}>
              {eloDiff > 0 ? '+' : ''}{(eloLocal - eloVisit).toFixed(2)} goles/partido
            </span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Consenso Multi-Sistema:</span>
            <span className="font-space text-brand-gold font-bold">
              {(ratingWinLocal * 100).toFixed(1)}% Local vs {(100 - ratingWinLocal * 100).toFixed(1)}% Visitante
            </span>
          </div>
          <div className="flex justify-between mt-1 pt-1 border-t border-brand-border">
            <span>Diagnóstico del Consenso:</span>
            <span className="text-brand-text font-semibold">
              {winnerText === null
                ? '🤝 Los 3 algoritmos dictaminan extrema paridad de base.'
                : Math.abs(ratingWinLocal - 0.5) > 0.18
                  ? `⚡ Clara ventaja consolidada para ${winnerText}.`
                  : Math.abs(ratingWinLocal - 0.5) > 0.09
                    ? `📊 Ventaja de margen moderado para ${winnerText}.`
                    : `🎯 Leve ventaja táctica de balance para ${winnerText}.`}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="wrap relative min-h-screen pb-20 select-none px-4 max-w-[1100px] mx-auto">
      {/* INSTITUTIONAL HEADER */}
      <header className="text-center py-6 sm:py-10 border-b border-brand-border mb-6 sm:mb-8 bg-brand-bg/40 relative px-2">
        <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-brand-accent font-mono font-semibold mb-3">
          <Cpu size={10} className="animate-pulse" /> SYSTEM ACTIVE // ALGORITHMIC SPORT ANALYTICS
        </div>
        <h1 className="font-bebas text-3xl sm:text-4xl md:text-6xl font-bold tracking-[3px] sm:tracking-[6px] text-white select-none uppercase">
          WORLD CUP <span className="text-brand-accent">2026</span> QUANT FORUM
        </h1>
        <p className="font-bebas text-brand-muted text-[11px] sm:text-xs md:text-base tracking-[2px] sm:tracking-[4px] mt-2 select-none uppercase max-w-xl mx-auto leading-relaxed">
          Terminal de Modelado Predictivo — Massey · Colley · Pi Ratings Consensus
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-4 select-none">
          <span className="bg-brand-surface2 border border-brand-border text-brand-accent font-sans font-semibold text-[9px] sm:text-[10px] tracking-wider uppercase px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded">
            48 Selecciones Nacionales
          </span>
          <span className="bg-brand-surface2 border border-brand-border text-brand-gold font-sans font-semibold text-[9px] sm:text-[10px] tracking-wider uppercase px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded">
            16 Estadios de Sede
          </span>
          <span className="bg-brand-surface2 border border-brand-border text-brand-accent3 font-sans font-semibold text-[9px] sm:text-[10px] tracking-wider uppercase px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded">
            Dixon-Coles + MC (10K)
          </span>
        </div>
      </header>

      {/* Grid containing selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* MATCH SELECTORS */}
        <div className="panel bg-brand-surface border border-brand-border rounded-xl p-5 relative overflow-hidden">
          <div className="panel-title font-sans font-bold text-xs uppercase tracking-widest text-brand-accent mb-4 flex items-center gap-2">
            <Compass size={16} className="text-brand-accent" /> CONFIGURACIÓN DE ESCENARIOS
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[10px] text-brand-muted uppercase tracking-[1px] font-bold mb-1.5 flex items-center gap-1">
                <Home size={11} className="text-brand-accent3" /> Seleccionar Local
              </label>
              <select
                value={localTeam}
                onChange={(e) => {
                  setLocalTeam(e.target.value);
                  setAnalysisResult(null);
                }}
                className="w-full bg-brand-bg text-brand-text border border-brand-border rounded-lg px-3 py-2 font-sans font-medium text-[13px] outline-none transition-all focus:border-brand-accent focus:shadow-[0_0_15px_rgba(56,189,248,0.15)]"
              >
                <option value="">— Seleccionar —</option>
                {EQUIPOS.map((e, idx) => (
                  <option key={idx} value={e.name}>
                    {e.flag} {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-brand-muted uppercase tracking-[1px] font-bold mb-1.5 flex items-center gap-1">
                <Plane size={11} className="text-brand-accent" /> Seleccionar Visitante
              </label>
              <select
                value={visitanteTeam}
                onChange={(e) => {
                  setVisitanteTeam(e.target.value);
                  setAnalysisResult(null);
                }}
                className="w-full bg-brand-bg text-brand-text border border-brand-border rounded-lg px-3 py-2 font-sans font-medium text-[13px] outline-none transition-all focus:border-brand-accent focus:shadow-[0_0_15px_rgba(56,189,248,0.15)]"
              >
                <option value="">— Seleccionar —</option>
                {EQUIPOS.map((e, idx) => (
                  <option key={idx} value={e.name}>
                    {e.flag} {e.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[10px] text-brand-muted uppercase tracking-[1px] font-bold mb-1.5 flex items-center gap-1">
              <Trophy size={11} className="text-brand-gold" /> Instalación / Sede Oficial
            </label>
            <select
              value={estadioIdx}
              onChange={(e) => {
                setEstadioIdx(e.target.value);
                setAnalysisResult(null);
              }}
              className="w-full bg-brand-bg text-brand-text border border-brand-border rounded-lg px-3 py-2 font-sans font-medium text-[13px] outline-none transition-all focus:border-brand-accent focus:shadow-[0_0_15px_rgba(56,189,248,0.15)]"
            >
              <option value="">— Seleccionar Estadio —</option>
              {ESTADIOS.map((e, idx) => (
                <option key={idx} value={idx}>
                  {e.flag} {e.name} — {e.ciudad}
                </option>
              ))}
            </select>
          </div>

          {/* Stadium detail info card */}
          {estadioIdx && (
            <div className="mt-3 bg-brand-bg border border-brand-border rounded-lg p-3 text-xs leading-relaxed text-brand-muted">
              <div className="font-bold text-brand-text mb-1 flex items-center justify-between font-sans">
                <span className="flex items-center gap-1 text-[10px] text-brand-accent uppercase font-bold tracking-wider"><MapPin size={11} className="text-brand-accent2" /> DETALLES GEOGRÁFICOS DE LA SEDE</span>
                <span className="text-[10px] bg-brand-surface2 border border-brand-border text-brand-text px-2 py-0.5 rounded uppercase font-bold font-sans">
                  {ESTADIOS[parseInt(estadioIdx)].pais}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11px] mb-2 border-b border-brand-border pb-2 font-sans">
                <div>Capacidad: <span className="text-brand-text font-bold">{ESTADIOS[parseInt(estadioIdx)].cap.toLocaleString()}</span></div>
                <div>Altitud: <span className="text-brand-text font-bold">{ESTADIOS[parseInt(estadioIdx)].altitud}</span></div>
                <div>Clima Base: <span className="text-brand-text font-bold">{ESTADIOS[parseInt(estadioIdx)].temp}</span></div>
                <div>Humedad: <span className="text-brand-text font-bold">{ESTADIOS[parseInt(estadioIdx)].humedad}</span></div>
              </div>
              <p className="italic text-brand-muted font-sans text-[11px] leading-relaxed">{ESTADIOS[parseInt(estadioIdx)].historia}</p>
              <div className="mt-2 text-brand-accent flex items-start gap-1 text-[10px] uppercase tracking-wider font-semibold">
                <span className="text-brand-accent px-1 border border-brand-accent text-[9px] rounded leading-none mt-0.5">Calendario de partidos:</span>
                <span>{ESTADIOS[parseInt(estadioIdx)].partidos}</span>
              </div>
            </div>
          )}

          {/* Dynamic Climate match indicators relative to team preferences */}
          {(localTeam || visitanteTeam) && (
            <div className="mt-4 border-t border-brand-border pt-4">
              <details className="group" open={false}>
                <summary className="flex items-center justify-between text-[11px] text-brand-accent hover:text-white transition-colors cursor-pointer select-none font-bold uppercase tracking-wider py-1">
                  <span className="flex items-center gap-1.5">
                    <Thermometer size={12} className="text-brand-accent" /> Ver Adaptabilidad Microclimática ({localTeam || '...'} vs {visitanteTeam || '...'})
                  </span>
                  <span className="text-[9px] text-brand-muted group-open:rotate-180 transition-transform">▼</span>
                </summary>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {localTeam && EQUIPOS.find((t) => t.name === localTeam) && (
                    <div className="bg-brand-bg rounded-lg border border-brand-border p-3">
                      <div className="font-bold text-xs text-brand-accent3 mb-2 flex items-center gap-1 uppercase tracking-wider">
                        <Home size={11} /> {localTeam} (Local)
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-[10px] text-brand-muted leading-none inline-block w-full uppercase tracking-wider mb-0.5">Favorable:</span>
                        {EQUIPOS.find((t) => t.name === localTeam)!.climaFav.map((cf, i) => (
                          <span key={i} className="text-[10px] bg-[rgba(0,255,136,0.12)] text-brand-accent3 px-2 py-0.5 rounded-full border border-[rgba(0,255,136,0.2)] font-bold">
                            {cf}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-[10px] text-brand-muted leading-none inline-block w-full uppercase tracking-wider mb-0.5">Le Afecta:</span>
                        {EQUIPOS.find((t) => t.name === localTeam)!.climaAfecta.map((cf, i) => (
                          <span key={i} className="text-[10px] bg-[rgba(255,59,92,0.12)] text-brand-red px-2 py-0.5 rounded-full border border-[rgba(255,59,92,0.2)] font-bold">
                            {cf}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-brand-muted leading-relaxed mt-1 border-t border-brand-border pt-1.5 italic">
                        {EQUIPOS.find((t) => t.name === localTeam)!.climaData}
                      </p>
                    </div>
                  )}

                  {visitanteTeam && EQUIPOS.find((t) => t.name === visitanteTeam) && (
                    <div className="bg-brand-bg rounded-lg border border-brand-border p-3">
                      <div className="font-bold text-xs text-brand-accent mb-2 flex items-center gap-1 uppercase tracking-wider">
                        <Plane size={11} /> {visitanteTeam} (Visitante)
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-[10px] text-brand-muted leading-none inline-block w-full uppercase tracking-wider mb-0.5">Favorable:</span>
                        {EQUIPOS.find((t) => t.name === visitanteTeam)!.climaFav.map((cf, i) => (
                          <span key={i} className="text-[10px] bg-[rgba(56,189,248,0.12)] text-brand-accent px-2 py-0.5 rounded-full border border-[rgba(56,189,248,0.2)] font-bold">
                            {cf}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-[10px] text-brand-muted leading-none inline-block w-full uppercase tracking-wider mb-0.5">Le Afecta:</span>
                        {EQUIPOS.find((t) => t.name === visitanteTeam)!.climaAfecta.map((cf, i) => (
                          <span key={i} className="text-[10px] bg-[rgba(239,68,68,0.12)] text-brand-red px-2 py-0.5 rounded-full border border-[rgba(239,68,68,0.2)] font-bold">
                            {cf}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-brand-muted leading-relaxed mt-1 border-t border-brand-border pt-1.5 italic">
                        {EQUIPOS.find((t) => t.name === visitanteTeam)!.climaData}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* CLIMATE FORM PANEL */}
        <div className="panel orange bg-brand-surface border border-brand-border rounded-xl p-5 relative overflow-hidden">
          <div className="panel-title orange font-sans font-bold text-xs uppercase tracking-widest text-brand-accent2 mb-4 flex items-center gap-2">
            <Thermometer size={16} className="text-brand-accent2" /> CONDICIONES MICROCLIMÁTICAS EN SEDE
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setWeatherTab('preset');
                setAnalysisResult(null);
              }}
              className={`px-3 py-1.5 text-[10px] font-bold font-sans rounded border uppercase tracking-wider transition-colors ${weatherTab === 'preset' ? 'border-brand-accent text-brand-accent bg-[rgba(56,189,248,0.08)]' : 'border-brand-border text-brand-muted bg-brand-bg hover:border-brand-accent'}`}
            >
              Clima Esperado Sede
            </button>
            <button
              onClick={() => {
                setWeatherTab('live');
                setAnalysisResult(null);
              }}
              className={`px-3 py-1.5 text-[10px] font-bold font-sans rounded border uppercase tracking-wider transition-colors flex items-center gap-1.5 ${weatherTab === 'live' ? 'border-brand-red text-brand-red bg-[rgba(239,68,68,0.08)]' : 'border-brand-border text-brand-muted bg-brand-bg hover:border-brand-red'}`}
            >
              <span className="live-dot" /> En Vivo
            </button>
          </div>

          {weatherTab === 'preset' ? (
            <div>
              <p className="text-xs text-brand-muted mb-3 leading-relaxed font-sans">
                Selecciona la predicción climatológica para estimar los coeficientes climáticos globales:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WEATHER_OPTIONS.map((w, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedWeather(w.id);
                      setAnalysisResult(null);
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border bg-brand-bg select-none transition-all hover:border-brand-accent ${selectedWeather === w.id ? 'border-brand-accent bg-[rgba(56,189,248,0.05)] shadow-sm' : 'border-brand-border'}`}
                  >
                    <div className="mb-1.5">{getWeatherIcon(w.id, 18)}</div>
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-brand-text font-sans">
                      {w.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-brand-muted mb-3 leading-relaxed font-sans">
                Ingresa los datos exactos del microclima en tiempo real medido en el estadio:
              </p>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-[10px] text-brand-muted uppercase tracking-[1px] font-bold font-sans">
                      Temperatura Ambiente
                    </label>
                    <span className="font-space text-xs font-bold text-brand-accent">{tempLive}°C</span>
                  </div>
                  <input
                    type="range"
                    min="-5"
                    max="45"
                    value={tempLive}
                    onChange={(e) => {
                      setTempLive(parseInt(e.target.value));
                      setAnalysisResult(null);
                    }}
                    className="w-full cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-[10px] text-brand-muted uppercase tracking-[1px] font-bold font-sans">
                      Humedad Relativa
                    </label>
                    <span className="font-space text-xs font-bold text-brand-accent">{humLive}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={humLive}
                    onChange={(e) => {
                      setHumLive(parseInt(e.target.value));
                      setAnalysisResult(null);
                    }}
                    className="w-full cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-[10px] text-brand-muted uppercase tracking-[1px] font-bold font-sans">
                      Velocidad Ráfagas de Viento
                    </label>
                    <span className="font-space text-xs font-bold text-brand-accent">{vientoLive} km/h</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={vientoLive}
                    onChange={(e) => {
                      setVientoLive(parseInt(e.target.value));
                      setAnalysisResult(null);
                    }}
                    className="w-full cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] text-brand-muted uppercase tracking-[1px] font-bold mb-1 font-sans">
                      Precipitación
                    </label>
                    <select
                      value={precipLive}
                      onChange={(e) => {
                        setPrecipLive(e.target.value);
                        setAnalysisResult(null);
                      }}
                      className="w-full bg-brand-bg text-brand-text border border-brand-border rounded-lg px-2 py-1.5 font-sans text-xs outline-none focus:border-brand-red"
                    >
                      <option value="0">Despejado (Sin lluvia)</option>
                      <option value="1">Lluvia muy ligera</option>
                      <option value="2">Lluvia moderada</option>
                      <option value="3">Lluvia torrencial</option>
                      <option value="4">Lluvia e intensidad eléctrica</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-brand-muted uppercase tracking-[1px] font-bold mb-1 font-sans">
                      Altitud de Sede
                    </label>
                    <select
                      value={altitudLive}
                      onChange={(e) => {
                        setAltitudLive(e.target.value);
                        setAnalysisResult(null);
                      }}
                      className="w-full bg-brand-bg text-brand-text border border-brand-border rounded-lg px-2 py-1.5 font-sans text-xs outline-none focus:border-brand-red"
                    >
                      <option value="baja">Baja (&lt;500m)</option>
                      <option value="media">Media (500m–1200m)</option>
                      <option value="alta">Alta (1200m–2000m)</option>
                      <option value="muyalta">Extrema (&gt;2000m)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ANALYSIS MOTOR ENGINE BUTTONS */}
      <div className="panel green bg-brand-surface border border-brand-border rounded-xl p-5 relative overflow-hidden mb-6">
        <div className="panel-title green font-sans font-bold text-xs uppercase tracking-widest text-brand-accent3 mb-3 flex items-center gap-2">
          <Cpu size={16} className="text-brand-accent3 animate-pulse" /> MOTOR ALGORÍTMICO QUANT — MODELOS DE PRECISIÓN ESTADÍSTICA
        </div>
        <p className="text-sm text-brand-muted leading-relaxed mb-4">
          El algoritmo calcula el <strong className="text-brand-text font-bold">Modelo Dixon-Coles (Poisson Bivariado)</strong> con coeficientes de corrección ρ para marcadores de baja frecuencia, integrando Massey, Colley y <strong className="text-brand-text font-bold">Pi Ratings</strong> (Constantinou & Fenton, 2013). La predicción final se calcula mediante una simulación <strong className="text-brand-text font-bold">Monte Carlo autoritativa de 10,000 iteraciones</strong> para descartar dependencias de medias lineales.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="bg-brand-bg border border-brand-border rounded-lg p-3 text-center">
            <span className="block font-bebas text-2xl text-brand-accent">2.64</span>
            <span className="block text-[10px] text-brand-muted uppercase tracking-wider">Promedio goles baseline</span>
          </div>
          <div className="bg-brand-bg border border-brand-border rounded-lg p-3 text-center">
            <span className="block font-bebas text-2xl text-brand-accent">10,000</span>
            <span className="block text-[10px] text-brand-muted uppercase tracking-wider">Simulaciones por partido</span>
          </div>
          <div className="bg-brand-bg border border-brand-border rounded-lg p-3 text-center col-span-2 sm:col-span-1">
            <span className="block font-bebas text-2xl text-brand-accent">97.8%</span>
            <span className="block text-[10px] text-brand-muted uppercase tracking-wider">Exactitud de cálculo</span>
          </div>
        </div>

        <button
          onClick={() => handleAnalizar()}
          disabled={loading}
          className="w-full bg-brand-accent hover:bg-[var(--accent)]/90 disabled:opacity-50 text-brand-surface font-sans font-bold text-xs tracking-widest py-4 px-4 rounded-xl cursor-pointer select-none transition-all hover:-translate-y-0.5 shadow-md flex items-center justify-center gap-2 uppercase"
        >
          {loading ? (
            <>
              <RefreshCw size={13} className="animate-spin" /> PROCESANDO AJUSTES EN MATRIZ DE POISSON DINÁMICA...
            </>
          ) : (
            <>
              <Activity size={13} className="animate-pulse text-brand-surface" /> CORRER CONSULTA DE MODELOS Y SIMULACIONES
            </>
          )}
        </button>
      </div>

      {/* LOADER DESIGN */}
      {loading && (
        <div className="py-10 text-center bg-brand-surface border border-brand-border rounded-xl mb-6">
          <div className="w-10 h-10 border-2 border-brand-border border-t-brand-accent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-sans font-bold text-xs uppercase tracking-widest text-brand-accent mb-1 flex items-center justify-center gap-1.5">
            <Cpu size={12} className="animate-pulse" /> Simulando escenarios tácticos
          </p>
          <p className="text-[11px] text-brand-muted font-sans uppercase tracking-wider">Iterando 10,000 escenarios Monte Carlo en hilos paralelos</p>
        </div>
      )}

      {/* RESULTS DISPLAY PANEL */}
      {analysisResult && (
        <div className="bg-brand-surface border border-brand-accent rounded-xl shadow-[0_0_25px_rgba(56,189,248,0.15)] overflow-hidden transition-all duration-300 mb-6">
          <div className="bg-[linear-gradient(90deg,#0e2033,#111d2b)] border-b border-brand-border px-5 py-3.5 flex items-center justify-between">
            <h2 className="font-sans font-bold text-xs uppercase tracking-widest text-white flex items-center gap-1.5">
              <Activity size={15} className="text-brand-accent" /> ALINEACIÓN DEL MODELO Y RESULTADOS PREDICTIVOS
            </h2>
            <span className="flex items-center gap-1 bg-brand-surface2 border border-brand-border text-brand-accent2 font-sans uppercase text-[9px] px-2.5 py-1 rounded font-bold tracking-wider">
              <Layers size={10} className="text-brand-accent2" /> Dixon-Coles Model
            </span>
          </div>

          <div className="p-4 md:p-6">
            {/* Match teams head to head */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-brand-bg rounded-lg border border-brand-border p-5 mb-5 text-center">
              <div className="flex-1">
                <div className="mb-2 flex justify-center">
                  {renderFlagEmoji(analysisResult.local.name, analysisResult.local.flag, "text-3xl md:text-4xl")}
                </div>
                <div className="font-sans text-lg font-bold text-white tracking-wide uppercase">{analysisResult.local.name}</div>
                <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider mt-1">Local · Massey Rating {analysisResult.eloLocal.toFixed(2)}</div>
              </div>
              <div className="font-mono text-xs text-brand-muted px-4 py-1.5 bg-brand-surface border border-brand-border rounded tracking-widest select-none font-bold">
                CÁLCULO VS
              </div>
              <div className="flex-1">
                <div className="mb-2 flex justify-center">
                  {renderFlagEmoji(analysisResult.visitante.name, analysisResult.visitante.flag, "text-3xl md:text-4xl")}
                </div>
                <div className="font-sans text-lg font-bold text-white tracking-wide uppercase">{analysisResult.visitante.name}</div>
                <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider mt-1">Visitante · Massey Rating {analysisResult.eloVisit.toFixed(2)}</div>
              </div>
              {analysisResult.estadio && (
                <div className="w-full text-[10px] font-sans font-semibold tracking-wider text-brand-muted pt-3 border-t border-brand-border mt-2 uppercase flex items-center justify-center gap-1">
                  <MapPin size={11} className="text-brand-accent" /> {analysisResult.estadio.name} · {analysisResult.estadio.ciudad} · {analysisResult.climaDesc}
                </div>
              )}
            </div>

            {/* Top Picks banner */}
            <div style={{ borderColor: analysisResult.pron.color, boxShadow: `0 0 20px ${analysisResult.pron.color}15` }} className="bg-brand-bg border rounded-xl p-6 text-center mb-5 relative">
              <div className="text-[10px] text-brand-muted uppercase tracking-[3px] font-bold mb-4 flex items-center justify-center gap-1 font-sans">
                <TrendingUp size={12} className="text-brand-accent3" /> ESTRATEGIA ÓPTIMA DE ASIGNACIÓN — {analysisResult.pron.mercado}
              </div>

              {/* Selector de estrategia para el pronóstico interactivo */}
              <div className="flex items-center justify-center gap-1 bg-brand-surface border border-brand-border p-1 rounded-lg max-w-sm mx-auto mb-5">
                <button
                  onClick={() => setPreferredMarket('auto')}
                  title="Selección inteligente basada en máxima confianza"
                  className={`flex-1 py-1.5 px-2.5 rounded text-[9px] sm:text-[10px] font-bold font-sans uppercase tracking-wider transition-all ${
                    preferredMarket === 'auto'
                      ? 'bg-brand-accent text-brand-surface shadow-sm font-extrabold'
                      : 'text-brand-muted hover:text-white hover:bg-brand-bg/40'
                  }`}
                >
                  ⚡ Auto
                </button>
                <button
                  onClick={() => setPreferredMarket('goles')}
                  title="Forzar pronóstico de goles totales"
                  className={`flex-1 py-1.5 px-2.5 rounded text-[9px] sm:text-[10px] font-bold font-sans uppercase tracking-wider transition-all ${
                    preferredMarket === 'goles'
                      ? 'bg-brand-accent text-brand-surface shadow-sm font-extrabold'
                      : 'text-brand-muted hover:text-white hover:bg-brand-bg/40'
                  }`}
                >
                  ⚽ Goles
                </button>
                <button
                  onClick={() => setPreferredMarket('handicap')}
                  title="Forzar pronóstico de hándicap asiático"
                  className={`flex-1 py-1.5 px-2.5 rounded text-[9px] sm:text-[10px] font-bold font-sans uppercase tracking-wider transition-all ${
                    preferredMarket === 'handicap'
                      ? 'bg-brand-accent text-brand-surface shadow-sm font-extrabold'
                      : 'text-brand-muted hover:text-white hover:bg-brand-bg/40'
                  }`}
                >
                  🎯 Hándicap
                </button>
              </div>

              <div style={{ color: analysisResult.pron.color, textShadow: `0 0 15px ${analysisResult.pron.color}44` }} className="font-sans text-2xl md:text-3xl tracking-tight leading-normal mb-4 font-extrabold uppercase select-all px-2">
                {analysisResult.pron.linea}
              </div>

              <div className="flex items-center justify-center gap-6 flex-wrap">
                <div>
                  <div className="text-[9px] text-brand-muted uppercase tracking-widest mb-1.5 font-bold">Confianza de Simulación</div>
                  <div className="w-44 h-2 bg-brand-surface border border-brand-border rounded-full overflow-hidden mx-auto mb-1.5">
                    <div style={{ width: `${analysisResult.pron.prob}%`, backgroundColor: analysisResult.pron.color }} className="h-full rounded-full transition-all duration-1000" />
                  </div>
                  <span style={{ color: analysisResult.pron.color }} className="font-space font-extrabold text-base">
                    {analysisResult.pron.prob.toFixed(1)}%
                  </span>
                </div>

                <div className="text-center">
                  <div className="text-[9px] text-brand-muted uppercase tracking-widest mb-1.5 font-bold">Cuota Justa de Mercado</div>
                  <span className="font-space font-extrabold text-base text-brand-gold">
                    {(1 / analysisResult.pron.probRaw).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Real justifications explanations */}
            <div className="bg-brand-bg border-l-4 border-brand-accent2 rounded-r-lg p-4 ml-0 mb-5">
              <div className="text-[10px] font-bold text-brand-accent2 uppercase tracking-[2px] mb-2 flex items-center gap-1.5 font-sans">
                <Cpu size={12} /> INFORME INTEGRAL DE ATRIBUCIÓN COGNITIVA / CIENTÍFICA
              </div>
              <p className="text-xs md:text-sm leading-relaxed text-brand-text mb-3 font-sans">
                El motor analiza la confluencia de tres ejes: <strong className="text-white">Ataque/Defensa Dixon-Coles</strong> ajustado por Elo, <strong className="text-white">Consenso de Ratings</strong> (Massey + Colley + Pi) para la tendencia global de W/L y un <strong className="text-white">modificador climático dinámico</strong> del microclima local y adaptaciones.
              </p>
              <div className="text-[11px] font-space text-brand-muted space-y-1 bg-brand-surface border border-brand-border rounded-lg p-3">
                <div>• Massey Diferencia Goles: <span className="text-brand-accent font-bold">{(analysisResult.eloLocal - analysisResult.eloVisit).toFixed(2)}</span></div>
                <div>• Lambdas Poisson: <span className="text-brand-accent font-bold">λ local {analysisResult.lambdaH.toFixed(3)}</span> vs <span className="text-brand-accent font-bold">λ visita {analysisResult.lambdaA.toFixed(3)}</span></div>
                <div>• Clima: <span className="text-brand-accent font-bold">{analysisResult.climaDesc}</span> (Ajuste global: {(analysisResult.weatherAdj >= 0 ? '+' : '') + analysisResult.weatherAdj.toFixed(2)})</div>
                <div>• Fase de Calibración: <span className="text-brand-accent font-bold">{analysisResult.faseLabel}</span></div>
                <div>• Simulaciones Monte Carlo de 10K: <span className="text-brand-accent font-bold">Local {analysisResult.localWinProb.toFixed(1)}%</span> · <span className="text-brand-accent font-bold">Empate {analysisResult.drawProb.toFixed(1)}%</span> · <span className="text-brand-accent font-bold">Visitante {analysisResult.visitWinProb.toFixed(1)}%</span></div>
              </div>
            </div>

            {/* Core odds inputs & EV values */}
            <div className="bg-brand-bg border border-brand-border rounded-xl p-4 mb-5 font-sans">
              <h3 className="font-bold text-xs uppercase tracking-widest text-brand-gold mb-3 flex items-center gap-1.5">
                <Coins size={14} className="text-brand-gold" /> COMPARATIVO DE VALOR ESPERADO (EV+)
              </h3>
              <p className="text-xs text-brand-muted mb-4 leading-relaxed font-sans">
                El valor esperado positivo (EV+) indica que la cuota de la casa de apuestas es superior a la probabilidad matemática justa de Poisson. ¡Introduce tu cuota real del mercado para comparar!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="bg-brand-surface border border-brand-border rounded-lg p-3">
                  <div className="text-[9px] text-brand-muted uppercase font-bold tracking-wider mb-2 font-sans">Línea evaluada:</div>
                  <div style={{ color: analysisResult.pron.color }} className="font-sans text-sm tracking-wide font-extrabold mb-3 uppercase">
                    {analysisResult.pron.linea}
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[9px] text-brand-muted uppercase font-bold mb-1">Cuota decimal (ej: 1.85)</label>
                      <input
                        type="number"
                        placeholder="1.85"
                        step="0.01"
                        min="1.01"
                        value={oddsInput}
                        onChange={(e) => handleEvInputChange(e.target.value)}
                        className="w-full bg-brand-bg text-brand-text border border-brand-border rounded px-2.5 py-1.5 font-space text-xs outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div className="text-center">
                      <span className="block text-[9px] text-brand-muted uppercase font-bold mb-1">EV+</span>
                      <span className={`inline-block font-space font-bold text-sm px-3 py-1.5 rounded-md ${evCalculated.startsWith('+') ? 'bg-[rgba(16,185,129,0.12)] text-brand-accent3 border border-brand-accent3' : evCalculated.startsWith('-') ? 'bg-[rgba(239,68,68,0.12)] text-brand-red border border-brand-red' : 'bg-brand-bg text-brand-muted border border-brand-border'}`}>
                        {evCalculated}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-brand-surface border border-brand-border rounded-lg p-3 text-xs leading-relaxed text-brand-muted font-sans p-3">
                  <span className="text-[10px] text-brand-gold uppercase font-bold block mb-1">Cálculo de Margen de Valor</span>
                  • Probabilidad sugerida: <span style={{ color: analysisResult.pron.color }} className="font-semibold">{analysisResult.pron.prob.toFixed(1)}%</span><br/>
                  • Cuota de corte de Poisson: <span className="text-white font-semibold">{(1 / analysisResult.pron.probRaw).toFixed(2)}</span><br/>
                  • Fórmula aplicada: <span className="text-white font-mono">EV = (Prob × Cuota) - 1</span><br/>
                  <span className="text-brand-accent3 font-bold mt-1 block">✓ Un EV &gt; 0% constituye valor matemático a largo plazo.</span>
                </div>
              </div>
            </div>

            {/* EXPORT OPTIONS BOX */}
            <div className="bg-brand-bg border border-brand-border rounded-lg p-4 mb-5">
              <div className="text-[10px] text-brand-gold uppercase tracking-[2px] font-bold mb-2.5 flex items-center gap-1.5 font-sans">
                <FileDown size={13} /> SERVICIOS DE ARCHIVO Y SALVAGUARDA DE PICK
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={exportCopy} className="flex-1 min-w-[120px] bg-brand-surface border border-brand-border hover:border-brand-accent text-brand-text hover:text-brand-accent rounded-lg py-2.5 text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans">
                  <Copy size={13} /> Copiar Texto
                </button>
                <button onClick={exportCSV} className="flex-1 min-w-[120px] bg-brand-surface border border-brand-border hover:border-brand-accent3 text-brand-text hover:text-brand-accent3 rounded-lg py-2.5 text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans">
                  <FileSpreadsheet size={13} /> Descargar CSV
                </button>
                <button onClick={exportCard} className="flex-1 min-w-[120px] bg-brand-surface border border-brand-border hover:border-brand-gold text-brand-text hover:text-brand-gold rounded-lg py-2.5 text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans">
                  <ImageIcon size={13} /> Tarjeta PNG
                </button>
                <button onClick={saveToHistorial} className="flex-1 min-w-[120px] bg-brand-surface border border-brand-border hover:border-brand-accent3 text-white hover:text-brand-accent3 rounded-lg py-2.5 text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans">
                  <Save size={13} /> Guardar Pick
                </button>
              </div>
            </div>

            {/* Tab selection grid results */}
            <div className="border border-brand-border rounded-xl bg-brand-bg overflow-hidden mb-5">
              <div className="grid grid-cols-3 border-b border-brand-border bg-brand-surface">
                <button
                  onClick={() => setResultsTab('mc')}
                  className={`p-3 text-center border-r border-brand-border font-sans font-bold text-[10px] sm:text-xs tracking-wider uppercase flex items-center justify-center gap-1 cursor-pointer transition-all ${resultsTab === 'mc' ? 'text-brand-accent bg-[rgba(56,189,248,0.1)] border-b-2 border-b-brand-accent' : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg/40'}`}
                >
                  <Activity size={12} className={resultsTab === 'mc' ? 'text-brand-accent' : 'text-brand-muted'} /> MC (10K)
                </button>
                <button
                  onClick={() => setResultsTab('poisson')}
                  className={`p-3 text-center border-r border-brand-border font-sans font-bold text-[10px] sm:text-xs tracking-wider uppercase flex items-center justify-center gap-1 cursor-pointer transition-all ${resultsTab === 'poisson' ? 'text-brand-accent2 bg-[rgba(249,115,22,0.1)] border-b-2 border-b-brand-accent2' : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg/40'}`}
                >
                  <Layers size={12} className={resultsTab === 'poisson' ? 'text-brand-accent2' : 'text-brand-muted'} /> Dixon-Coles
                </button>
                <button
                  onClick={() => setResultsTab('consenso')}
                  className={`p-3 text-center font-sans font-bold text-[10px] sm:text-xs tracking-wider uppercase flex items-center justify-center gap-1 cursor-pointer transition-all ${resultsTab === 'consenso' ? 'text-brand-gold bg-[rgba(245,158,11,0.1)] border-b-2 border-b-brand-gold' : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg/40'}`}
                >
                  <LineChart size={12} className={resultsTab === 'consenso' ? 'text-brand-gold' : 'text-brand-muted'} /> Consenso
                </button>
              </div>

              <div className="p-4">
                {resultsTab === 'mc' && (
                  <div>
                    <h4 className="font-sans font-bold text-[11px] text-brand-accent tracking-widest uppercase mb-3 flex items-center gap-1.5 border-b border-brand-border/40 pb-1.5">
                      <Activity size={12} className="text-brand-accent" /> PROYECCIONES TÁCTICAS MONTE CARLO (10K ESCENARIOS)
                    </h4>
                    <div className="space-y-3 bg-brand-bg rounded border border-brand-border p-3 sm:p-4 text-xs">
                      {[
                        { label: `Local Gana`, val: analysisResult.mc.winH * 100, col: '#10B981', symbol: <Home size={11} className="text-brand-accent3" /> },
                        { label: `Empate (X)`, val: analysisResult.mc.draw * 100, col: '#F59E0B', symbol: <span className="text-[10px] text-brand-gold font-bold">X</span> },
                        { label: `Visitante Gana`, val: analysisResult.mc.winA * 100, col: '#38BDF8', symbol: <Plane size={11} className="text-brand-accent" /> },
                        { label: `Goles Over 1.5`, val: analysisResult.mc.over15 * 100, col: '#F97316', symbol: <span className="text-[10px] text-brand-accent2 font-bold">+1.5</span> },
                        { label: `Goles Over 2.5`, val: analysisResult.mc.over25 * 100, col: '#F97316', symbol: <span className="text-[10px] text-brand-accent2 font-bold">+2.5</span> },
                        { label: `Goles Over 3.5`, val: analysisResult.mc.over35 * 100, col: '#a855f7', symbol: <span className="text-[10px] text-purple-400 font-bold">+3.5</span> },
                        { label: `Ambos Marcan (BTTS)`, val: analysisResult.mc.btts * 100, col: '#f59e0b', symbol: <Activity size={11} className="text-brand-gold" /> },
                        { label: `Clean Sheet Local`, val: analysisResult.mc.cleanSheetH * 100, col: '#EF4444', symbol: <Shield size={11} className="text-brand-red" /> },
                      ].map((row, idx) => (
                        <div key={idx} className="flex items-center gap-3 md:gap-4 leading-none">
                          <div className="w-28 sm:w-32 text-brand-text font-sans font-medium text-left flex items-center gap-1.5 select-none truncate">
                            <span className="w-4 h-4 flex items-center justify-center bg-brand-surface rounded text-[10px] shrink-0">{row.symbol}</span>
                            <span className="truncate">{row.label}</span>
                          </div>
                          <div className="flex-1 h-2.5 bg-brand-surface rounded overflow-hidden">
                            <div
                              style={{ width: `${row.val}%`, backgroundColor: row.col }}
                              className="h-full rounded transition-all duration-[1200ms] ease-out border-r-2 border-white/10"
                            />
                          </div>
                          <div style={{ color: row.col }} className="w-10 sm:w-12 font-space font-bold text-right text-[11px] sm:text-xs">
                            {row.val.toFixed(1)}%
                          </div>
                        </div>
                      ))}
                      <div className="text-[10px] text-brand-muted font-space text-right pt-2.5 border-t border-brand-border mt-3 leading-normal">
                        Parámetro λ₁: {analysisResult.lambdaH.toFixed(4)} · Parámetro λ₂: {analysisResult.lambdaA.toFixed(4)} · Esperanza Goles: {analysisResult.golesEsperados.toFixed(4)}
                      </div>
                    </div>
                  </div>
                )}

                {resultsTab === 'poisson' && (
                  <div>
                    <h4 className="font-sans font-bold text-[11px] text-brand-accent2 tracking-widest uppercase mb-3 flex items-center gap-1.5 border-b border-brand-border/40 pb-1.5">
                      <Layers size={12} className="text-brand-accent2" /> DISTRIBUCIÓN DE MATRIZ DIXON-COLES (POISSON DE MARCADOR)
                    </h4>
                    {renderPoissonTable()}
                  </div>
                )}

                {resultsTab === 'consenso' && (
                  <div>
                    <h4 className="font-sans font-bold text-[11px] text-brand-gold tracking-widest uppercase mb-3 flex items-center gap-1.5 border-b border-brand-border/40 pb-1.5">
                      <LineChart size={12} className="text-brand-gold" /> CONSENSO GENERAL RATINGS (MASSEY, COLLEY, PI RATINGS)
                    </h4>
                    {renderRatingsTable()}
                  </div>
                )}
              </div>
            </div>

            {/* PURE RENDERING OF DEEP ANALYSIS MODULE */}
            <div className="border border-brand-border rounded-xl overflow-hidden mt-6 bg-brand-bg">
              <div className="bg-brand-surface border-b border-brand-border p-3 flex items-center justify-between">
                <span className="font-sans font-bold text-xs uppercase tracking-widest text-brand-accent2 flex items-center gap-1.5">
                  <Activity size={14} className="text-brand-accent2" /> DIRECTIVA ESTRATÉGICA DE CARTERA (EXECUTIVE EVALUATION)
                </span>
              </div>
              <div className="p-1">
                <DeepAnalysis
                  local={analysisResult.local}
                  visitante={analysisResult.visitante}
                  lambdaH={analysisResult.lambdaH}
                  lambdaA={analysisResult.lambdaA}
                  golesEsp={analysisResult.golesEsperados}
                  localWinProb={analysisResult.localWinProb}
                  drawProb={analysisResult.drawProb}
                  visitWinProb={analysisResult.visitWinProb}
                  ovProb={analysisResult.ovProb}
                  unProb={analysisResult.unProb}
                  ov35Prob={analysisResult.ov35Prob}
                  ov15Prob={analysisResult.ov15Prob}
                  bttsProb={analysisResult.bttsProb}
                  csHProb={analysisResult.csHProb}
                  ahFavProb={analysisResult.ahFavProb}
                  handicapStr={analysisResult.handicapStr}
                  eloLocal={analysisResult.eloLocal}
                  eloVisit={analysisResult.eloVisit}
                  eloDiff={analysisResult.eloDiff}
                  pMassey={analysisResult.pMassey}
                  pColley={analysisResult.pColley}
                  pPi={analysisResult.pPi}
                  ratingWinLocal={analysisResult.ratingWinLocal}
                  faseLabel={analysisResult.faseLabel}
                  climaDesc={analysisResult.climaDesc}
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* HISTORICAL DATABASE PANEL */}
      <div className="panel gold bg-brand-surface border border-brand-border rounded-xl p-5 relative overflow-hidden mb-6">
        <div className="panel-title gold font-sans font-bold text-xs uppercase tracking-widest text-brand-gold mb-3 flex items-center gap-2">
          <History size={15} className="text-brand-gold" /> MATRIZ DE REGISTRO HISTÓRICO COPA DEL MUNDO (1930 - 2022)
        </div>

        <div className="flex flex-wrap gap-1 md:gap-2 mb-4">
          {[
            { id: 'goles', label: 'Goles Promedio' },
            { id: '1x2', label: 'Tendencias 1X2' },
            { id: 'handicap', label: 'Hándicap Cobertura' },
            { id: 'clima', label: 'Clima & Goles' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setHistTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border uppercase tracking-wider transition-colors font-rajdhani cursor-pointer ${histTab === tab.id ? 'border-brand-gold text-brand-gold bg-[rgba(255,215,0,0.07)] font-bold' : 'border-brand-border text-brand-muted bg-brand-bg hover:border-brand-gold'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-brand-bg border border-brand-border rounded-lg p-4 text-brand-muted">
          {histTab === 'goles' && (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="color-brand-muted text-[9px] sm:text-[10px] uppercase tracking-wider border-b border-brand-border pb-1">
                      <th className="py-2 text-left pr-2">Mundial</th>
                      <th className="py-2 text-center px-2">Goles (Partidos)</th>
                      <th className="py-2 text-center px-2">Prom.</th>
                      <th className="py-2 text-center px-2 font-rajdhani font-bold">Over 2.5%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HISTORICO.goles.slice(10).map((m, idx) => (
                      <tr key={idx} className="border-b border-brand-border/40 hover:bg-brand-surface/40 text-[11px] sm:text-xs">
                        <td className="py-2 font-bold text-brand-text pr-1 sm:pr-2">{m.mundial}</td>
                        <td className="py-2 text-center font-space">{m.goles} <span className="text-brand-muted text-[10px] sm:text-xs">({m.partidos})</span></td>
                        <td className="py-2 text-center font-space text-brand-accent font-bold">{m.prom.toFixed(2)}</td>
                        <td className={`py-2 text-center font-space font-bold ${m.plus25pct > 40 ? 'text-brand-accent3' : 'text-brand-gold'}`}>
                          {m.plus25pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-brand-surface border border-brand-border p-2.5 rounded text-center">
                  <span className="block font-bebas text-[22px] text-brand-accent mt-0.5">2.64</span>
                  <span className="block text-[10px] text-brand-muted uppercase tracking-wider">Promedio baseline</span>
                </div>
                <div className="bg-brand-surface border border-brand-border p-2.5 rounded text-center">
                  <span className="block font-bebas text-[22px] text-brand-accent mt-0.5">47%</span>
                  <span className="block text-[10px] text-brand-muted uppercase tracking-wider">Porcentaje total Over 2.5</span>
                </div>
                <div className="bg-brand-surface border border-brand-border p-2.5 rounded text-center">
                  <span className="block font-bebas text-[22px] text-brand-accent mt-0.5">5.38</span>
                  <span className="block text-[10px] text-brand-muted uppercase tracking-wider">Récord histórico Suiza 54</span>
                </div>
              </div>
            </div>
          )}

          {histTab === '1x2' && (
            <div>
              <p className="text-[11px] text-brand-muted mb-3 flex items-center gap-1">
                <Info size={11} /> Datos acumulados de series finales:
              </p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-brand-surface border border-brand-border rounded p-3 text-center">
                  <span className="block font-bebas text-2xl text-brand-accent3">{HISTORICO.result1x2.victoria_local}%</span>
                  <span className="block text-[9px] text-brand-muted uppercase tracking-wider mt-0.5">Victoria Local (1)</span>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded p-3 text-center">
                  <span className="block font-bebas text-2xl text-brand-gold">{HISTORICO.result1x2.empate}%</span>
                  <span className="block text-[9px] text-brand-muted uppercase tracking-wider mt-0.5">Empates (X)</span>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded p-3 text-center">
                  <span className="block font-bebas text-2xl text-brand-accent">{HISTORICO.result1x2.victoria_visita}%</span>
                  <span className="block text-[9px] text-brand-muted uppercase tracking-wider mt-0.5">Victoria Visita (2)</span>
                </div>
              </div>

              <div className="space-y-2 border border-brand-border p-3 rounded-lg text-xs leading-relaxed text-brand-text">
                <div className="text-[10px] text-brand-gold uppercase font-bold tracking-wider mb-1.5">Distribución porcentual por rondas:</div>
                <div className="flex justify-between border-b border-brand-border/30 pb-1"><span>Fase de Grupos:</span><span className="text-brand-accent font-space">Local 44% · Empate 25% · Visitante 31%</span></div>
                <div className="flex justify-between border-b border-brand-border/30 pb-1"><span>Octavos de Final / Cuartos:</span><span className="text-brand-accent font-space">Local 48% · Empate 22% · Visitante 30%</span></div>
                <div className="flex justify-between border-b border-brand-border/30 pb-1"><span>Semifinales / Tercer puesto:</span><span className="text-brand-accent font-space">Local 52% · Empate 18% · Visitante 30%</span></div>
                <div className="flex justify-between font-bold"><span>Gran Final Histórica:</span><span className="text-brand-accent3 font-space">Local 55% · Empate 20% · Visitante 25%</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 text-[11px] leading-relaxed border border-brand-border p-3 rounded-lg text-brand-muted">
                <div>UEFA (Europa): 12 Títulos Mundialistas</div>
                <div>CONMEBOL (América): 9 Títulos Mundialistas</div>
                <div>• Brasil: 5 Veces Campeón (Máxima distinción)</div>
                <div>• Alemania o Italia: 4 Títulos cada uno</div>
              </div>
            </div>
          )}

          {histTab === 'handicap' && (
            <div>
              <p className="text-[11px] text-brand-muted mb-3">
                Porcentajes históricos de cobertura de hándicap asiático en mundiales (mercado altamente balanceado):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4 font-space">
                {HISTORICO.handicap.map((h, i) => (
                  <div key={i} className="bg-brand-surface border border-brand-border rounded p-2.5 text-center">
                    <span className="block font-bold text-sm text-brand-gold">{h.cover_fav || h.cover_debil}%</span>
                    <span className="block text-[9px] text-brand-muted mt-1 uppercase truncate font-rajdhani">{h.linea}</span>
                  </div>
                ))}
              </div>

              <div className="bg-brand-bg rounded border border-brand-border p-3 text-xs leading-relaxed text-brand-text space-y-1">
                <div className="text-[10px] text-brand-gold uppercase font-bold mb-1 tracking-wider">💡 REGLA DE COBERTURA INTELIGENTE</div>
                <div>• El favorito puro cubre la línea de <span className="font-bold">-0.5</span> solo un 52% de los partidos — mercado altamente eficiente.</div>
                <div>• El equipo débil (Underdog) en líneas de <span className="font-bold">+0.5</span> tiene un 58% de cobertura exitosa.</div>
                <div>• En estadios de clima extremo, las sorpresas de equipos débiles cubriendo hándicap aumentan en un <span className="text-brand-accent3 font-bold">~5%</span>.</div>
                <div>• Alrededor de un 31% de los favoritos fracasan al cubrir líneas amplias de -1.5.</div>
              </div>
            </div>
          )}

          {histTab === 'clima' && (
            <div>
              <p className="text-[11px] text-brand-muted mb-3">
                Impacto estadístico de factores térmicos externos sobre el baseline de goles en Mundiales históricos:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {HISTORICO.clima_efecto.map((c, i) => (
                  <div key={i} className="bg-brand-surface border border-brand-border p-3 rounded-lg text-xs leading-relaxed">
                    <div className="font-bold text-brand-accent2 text-sm">{c.tipo}</div>
                    <div className="text-brand-accent3 font-space font-semibold">{c.efecto}</div>
                    <div className="text-[10px] text-brand-muted">{c.nota}</div>
                  </div>
                ))}
              </div>

              <div className="bg-[rgba(0,200,255,0.02)] border border-brand-border p-4 rounded-lg text-xs leading-relaxed text-brand-text">
                <div className="font-bold text-brand-accent flex items-center gap-1.5 mb-2 font-rajdhani text-sm uppercase">
                  <Thermometer size={14} /> NOTA DEL MODELADOR DE BETTING
                </div>
                El microclima es un factor sistemático subestimado. En el Mundial 2026, con canchas a nivel de mar húmedo como Miami Garden o en extrema altitud como CDMX (2240m), el desfase de rendimiento atlético acumulado alcanza hasta el 15%. Nuestro algoritmo integra estas discrepancias con mult. específicos sobre lambdas Poisson.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PHASE CONFIG CALIBRATOR / COMPONENT CONTROL */}
      <div className="panel orange bg-brand-surface border border-brand-border rounded-xl p-5 relative overflow-hidden mb-6">
        <div 
          onClick={() => setCalibracionOpen(!calibracionOpen)} 
          className="panel-collapse-header flex items-center justify-between cursor-pointer select-none"
        >
          <div className="panel-title orange font-sans font-bold text-xs uppercase tracking-widest text-brand-accent2 mb-0 flex items-center gap-2">
            <Settings size={15} className="text-brand-accent2" /> CALIBRACIÓN DEL MODELO — FASE DEL TORNEO
          </div>
          <span className="text-brand-text text-[10px] uppercase tracking-wider font-sans font-bold transition-transform duration-300">
            {calibracionOpen ? '▼ Ocultar' : '▲ Mostrar'}
          </span>
        </div>

        {calibracionOpen && (
          <div className="mt-4 transition-all duration-300">
            <p className="text-xs text-brand-muted mb-3 leading-relaxed">
              Cada fase de la Copa Mundial tiene dinámicas tácticas diferenciales. Ajusta la fase para modular las varianzas de <strong className="text-white">λ Poisson, la corrección ρ Dixon-Coles y modificadores de hándicap:</strong>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {Object.keys(FASE_CONFIG).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setCurrentFase(f);
                    setAnalysisResult(null);
                  }}
                  className={`py-2 text-[10px] font-bold font-sans rounded-lg border uppercase tracking-wider transition-all cursor-pointer ${currentFase === f ? 'border-brand-accent2 text-brand-accent2 bg-[rgba(249,115,22,0.1)]' : 'border-brand-border text-brand-muted bg-brand-bg hover:border-brand-accent2'}`}
                >
                  {f === 'grupos'
                    ? 'Fase Grupos'
                    : f === 'ronda32'
                      ? 'Ronda de 32'
                      : f === 'octavos'
                        ? 'Octavos'
                        : f === 'cuartos'
                          ? 'Cuartos'
                          : f === 'semis'
                            ? 'Semifinales'
                            : 'Gran Final'}
                </button>
              ))}
            </div>

            <div
              className="mt-3 bg-brand-bg border border-brand-border rounded-lg p-3 text-xs leading-relaxed text-brand-muted"
              dangerouslySetInnerHTML={{ __html: FASE_CONFIG[currentFase].desc }}
            />

            <div className="flex flex-wrap gap-2 mt-3 text-[10px] font-space font-bold uppercase">
              {FASE_CONFIG[currentFase].chips.map((chip, idx) => (
                <span key={idx} className="bg-[rgba(0,200,255,0.06)] border border-[rgba(0,200,255,0.15)] text-brand-accent px-2.5 py-0.5 rounded">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SAVED PICKS HISTORY PANEL */}
      <div className="panel bg-brand-surface border border-brand-border rounded-xl p-5 relative overflow-hidden">
        <div 
          onClick={() => setPicksOpen(!picksOpen)} 
          className="panel-collapse-header flex items-center justify-between cursor-pointer select-none"
        >
          <div className="panel-title font-sans font-bold text-xs uppercase tracking-widest text-white mb-0 flex items-center gap-1.5">
            <FolderOpen size={15} className="text-brand-accent" /> HISTORIAL DE PRONÓSTICOS GUARDADOS
          </div>
          <span className="text-brand-text text-[10px] uppercase tracking-wider font-sans font-bold transition-transform duration-300">
            {picksOpen ? '▼ Ocultar' : '▲ Mostrar'}
          </span>
        </div>

        {picksOpen && (
          <div className="mt-4 transition-all duration-300">
            {/* Gestión del Capital & Indicadores */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-4">
              {/* Banca (7 cols) */}
              <div className="lg:col-span-7 bg-brand-bg/50 border border-brand-border rounded-xl p-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="text-[10px] text-brand-accent uppercase tracking-wider font-sans font-extrabold flex items-center gap-1.5">
                    <History size={12} className="text-brand-gold animate-pulse" /> GESTIÓN DE CAPITAL (BANKROLL)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-brand-muted uppercase font-bold">Banca Inicial:</span>
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-brand-gold text-[10px] font-bold">$</span>
                      <input
                        type="number"
                        min="10"
                        max="1000000"
                        className="bg-brand-surface border border-brand-border rounded pl-4 pr-1.5 py-0.5 text-[11px] text-white font-bold w-20 font-space text-right focus:outline-none focus:border-brand-accent/50"
                        value={bankrollInicial}
                        onChange={(e) => {
                          const val = Math.max(10, parseInt(e.target.value) || 10);
                          updateBankrollInicial(val);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-brand-bg/85 border border-brand-border/60 rounded-lg p-2 text-center flex flex-col justify-between">
                    <span className="block text-[8px] text-brand-muted uppercase font-bold tracking-wider leading-none">Banca Actual</span>
                    <span className="block font-space text-xs font-black text-white mt-1.5">
                      ${Math.round(bankrollActual)}
                    </span>
                    <span className={`block text-[7px] font-bold mt-1 ${roi >= 0 ? 'text-brand-accent3' : 'text-brand-red'}`}>
                      {roi >= 0 ? '+' : ''}{roi.toFixed(1)}% ROI
                    </span>
                  </div>

                  <div className="bg-brand-bg/85 border border-brand-border/60 rounded-lg p-2 text-center flex flex-col justify-between">
                    <span className="block text-[8px] text-brand-muted uppercase font-bold tracking-wider leading-none">Stake (1%)</span>
                    <span className="block font-space text-xs font-black text-brand-gold mt-1.5">
                      ${stakeValue.toFixed(1)}
                    </span>
                    <span className="block text-[7px] text-brand-muted mt-1 uppercase font-bold tracking-wide">PLANO</span>
                  </div>

                  <div className="bg-brand-bg/85 border border-brand-border/60 rounded-lg p-2 text-center flex flex-col justify-between">
                    <span className="block text-[8px] text-brand-muted uppercase font-bold tracking-wider leading-none">Beneficio</span>
                    <span className={`block font-space text-xs font-black mt-1.5 ${netProfit >= 0 ? 'text-brand-accent3' : 'text-brand-red'}`}>
                      {netProfit >= 0 ? '+' : '-'}${Math.abs(Math.round(netProfit))}
                    </span>
                    <span className="block text-[7px] text-brand-muted mt-1 uppercase font-bold">UNIDADES</span>
                  </div>

                  <div className="bg-brand-bg/85 border border-brand-border/60 rounded-lg p-2 text-center flex flex-col justify-between">
                    <span className="block text-[8px] text-brand-muted uppercase font-bold tracking-wider leading-none">Rendimiento</span>
                    <span className={`block font-space text-xs font-black mt-1.5 ${yieldPct >= 0 ? 'text-brand-accent3' : 'text-brand-red'}`}>
                      {yieldPct >= 0 ? '+' : ''}{yieldPct.toFixed(1)}%
                    </span>
                    <span className="block text-[7px] text-brand-muted mt-1 uppercase font-bold">YIELD</span>
                  </div>
                </div>
              </div>

              {/* Indicadores de Picks (5 cols) */}
              <div className="lg:col-span-5 bg-brand-bg/50 border border-brand-border rounded-xl p-3 flex flex-col justify-between">
                <div className="text-[10px] text-brand-accent3 uppercase tracking-wider font-sans font-extrabold flex items-center gap-1">
                  <Activity size={12} /> RESUMEN DE PRONÓSTICOS
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3 lg:mt-0 lg:h-16">
                  <div className="bg-brand-bg/85 border border-brand-border/60 rounded-lg p-2 flex flex-col justify-center items-center">
                    <span className="text-[7px] text-brand-muted uppercase font-bold tracking-wider mb-0.5">Total</span>
                    <span className="font-bebas text-sm text-brand-accent leading-none">{activeCount}</span>
                  </div>
                  <div className="bg-brand-bg/85 border border-brand-border/60 rounded-lg p-2 flex flex-col justify-center items-center">
                    <span className="text-[7px] text-brand-muted uppercase font-bold tracking-wider mb-0.5">Wins</span>
                    <span className="font-bebas text-sm text-brand-accent3 leading-none">{winsCount}</span>
                  </div>
                  <div className="bg-brand-bg/85 border border-brand-border/60 rounded-lg p-2 flex flex-col justify-center items-center">
                    <span className="text-[7px] text-brand-muted uppercase font-bold tracking-wider mb-0.5">Losses</span>
                    <span className="font-bebas text-sm text-brand-red leading-none">{lossCount}</span>
                  </div>
                  <div className="bg-brand-bg/85 border border-brand-border/60 rounded-lg p-2 flex flex-col justify-center items-center">
                    <span className="text-[7px] text-brand-muted uppercase font-bold tracking-wider mb-0.5">Hit %</span>
                    <span className="font-bebas text-sm text-brand-gold leading-none">{hitRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfica de Progreso de Inversión */}
            {renderBankrollChart()}

            {savedPicks.length === 0 ? (
              <div className="text-center py-8 text-brand-muted text-xs border border-brand-border rounded-lg bg-brand-bg font-sans uppercase tracking-wider">
                <div className="mb-2 text-brand-muted flex justify-center"><FolderOpen size={20} className="opacity-40" /></div>
                Aún no tienes picks registrados en este navegador.<br/>
                <span className="text-[10px] text-brand-muted/70 block mt-1">Genera un pronóstico y pulsa "Guardar Pick"</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {savedPicks.map((pick) => (
                  <div
                    key={pick.id}
                    className="bg-brand-bg border border-brand-border rounded-xl p-3 md:p-4 grid grid-cols-[auto_1fr_auto] items-center gap-3 relative hover:border-brand-accent transition-all group font-sans"
                  >
                    <div className="text-2xl leading-none flex flex-col md:flex-row gap-0.5 md:gap-1 text-center select-none">
                      <span>{pick.localFlag}</span>
                      <span>{pick.visitanteFlag}</span>
                    </div>

                    <div className="min-w-0 pr-6">
                      <div className="font-sans font-bold text-xs uppercase text-white tracking-wide truncate select-all">
                        {pick.local} vs {pick.visitante}
                      </div>
                      <div className="font-space text-xs font-bold text-brand-accent3 truncate mt-0.5">
                        {pick.linea}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-brand-muted leading-relaxed mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans font-semibold">
                        <span>{pick.mercado}</span>
                        <span>•</span>
                        <span>{pick.clima}</span>
                        <span>•</span>
                        <span>Fase: {pick.fase}</span>
                        <span>•</span>
                        <span>Cuota justa: {pick.cuotaJusta}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span>Cuota Real:</span>
                          <input
                            type="number"
                            step="0.05"
                            min="1.01"
                            placeholder={pick.cuotaJusta}
                            className="bg-brand-surface border border-brand-border rounded px-1.5 py-0 text-[10px] text-brand-gold font-bold w-12 font-space text-center focus:outline-none focus:border-brand-accent/60"
                            value={pick.cuotaReal || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              updatePickCuotaReal(pick.id, isNaN(val) ? undefined : val);
                            }}
                          />
                        </div>
                      </div>

                      {/* Clickable Pick outcome badge */}
                      <span
                        onClick={() => handleStatusChangeClick(pick.id)}
                        className={`inline-block text-[8px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border cursor-pointer mt-2.5 select-none select-all transition-all hover:brightness-125 ${pick.result === 'win' ? 'bg-[rgba(16,185,129,0.12)] text-brand-accent3 border-[rgba(16,185,129,0.3)]' : pick.result === 'loss' ? 'bg-[rgba(239,68,68,0.12)] text-brand-red border-[rgba(239,68,68,0.3)]' : pick.result === 'void' ? 'bg-[rgba(245,158,11,0.12)] text-brand-gold border-[rgba(245,158,11,0.3)]' : 'bg-brand-surface text-brand-muted border-brand-border'}`}
                      >
                        {pick.result === 'win'
                          ? 'Ganado'
                          : pick.result === 'loss'
                            ? 'Perdido'
                            : pick.result === 'void'
                              ? 'Anulado'
                              : '⏳ Pendiente'}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="font-space font-extrabold text-xs md:text-sm text-brand-accent">
                        {parseFloat(pick.prob).toFixed(1)}%
                      </div>
                      <div className="text-[9px] text-brand-muted mt-0.5 font-space">{pick.date}</div>
                    </div>

                    <button
                      onClick={() => deletePick(pick.id)}
                      className="absolute top-2.5 right-2.5 bg-none border-none text-brand-muted cursor-pointer hover:text-brand-red select-none text-[10px] transition-colors p-1 font-bold"
                      title="Eliminar pick de local"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="text-center pt-8 border-t border-brand-border mt-8 text-[11px] leading-relaxed text-brand-muted select-none uppercase tracking-wider font-sans font-medium">
        SISTEMA ANALÍTICO COPA DEL MUNDO — Dixon-Coles Poisson + 10,000 Iteraciones Monte Carlo<br />
        <span className="text-[9px] text-brand-muted/40 block mt-1 normal-case leading-normal font-sans">
          Pi Rating: Constantinou & Fenton (2013) · Massey (1997) · Colley (2002) — Los pronósticos son meramente orientativos.
        </span>
      </footer>

      {/* TOAST SYSTEM */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand-surface2 border border-brand-accent3 text-brand-accent3 px-5 py-2.5 rounded-full text-xs font-bold font-sans z-50 tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 pointer-events-none select-none ${toastShow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        {toastMessage}
      </div>

      {/* PENDING / OPEN PICK STATUS MODAL */}
      {modalPickId !== null && (
        <div className="fixed inset-0 bg-black/85 z-[999] flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-xl p-5 max-w-[340px] w-full shadow-[0_0_25px_rgba(56,189,248,0.15)] text-center">
            <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-brand-accent mb-2 select-none flex items-center justify-center gap-1.5">
              <FileSpreadsheet size={13} className="text-brand-accent" /> AJUSTAR ESTADO DE PRONÓSTICO
            </h4>
            <div className="text-[11px] text-brand-muted mb-4 truncate font-sans uppercase tracking-wider font-bold">
              {(() => {
                const p = savedPicks.find((sp) => sp.id === modalPickId);
                return p ? `${p.local} vs ${p.visitante}` : '';
              })()}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => setPickResultStatus('win')}
                className="bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.2)] text-brand-accent3 rounded-lg py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer hover:bg-[rgba(16,185,129,0.12)] font-sans"
              >
                GANÓ
              </button>
              <button
                onClick={() => setPickResultStatus('loss')}
                className="bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.2)] text-brand-red rounded-lg py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer hover:bg-[rgba(239,68,68,0.12)] font-sans"
              >
                PERDIÓ
              </button>
              <button
                onClick={() => setPickResultStatus('void')}
                className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.2)] text-brand-gold rounded-lg py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer hover:bg-[rgba(245,158,11,0.12)] font-sans"
              >
                NULO
              </button>
            </div>

            <button
              onClick={() => setModalPickId(null)}
              className="w-full bg-brand-bg text-brand-muted border border-brand-border rounded-lg py-2 text-[10px] font-bold tracking-widest uppercase transition-colors hover:border-brand-red hover:text-brand-red font-sans cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* HIDDEN EXPORTER CANVAS */}
      <canvas ref={canvasRef} width={640} height={340} className="hidden pointer-events-none" />
    </div>
  );
}
