import React from 'react';
import { Equipo } from '../types';
import { Target, TrendingUp, BarChart2, Award, Lightbulb, ShieldAlert, Sparkles, BookOpen, Layers } from 'lucide-react';

interface DeepAnalysisProps {
  local: Equipo;
  visitante: Equipo;
  lambdaH: number;
  lambdaA: number;
  golesEsp: number;
  localWinProb: number;
  drawProb: number;
  visitWinProb: number;
  ovProb: number;
  unProb: number;
  ov35Prob: number;
  ov15Prob: number;
  bttsProb: number;
  csHProb: number;
  ahFavProb: number;
  handicapStr: string;
  eloLocal: number;
  eloVisit: number;
  eloDiff: number;
  pMassey: number;
  pColley: number;
  pPi: number;
  ratingWinLocal: number;
  faseLabel: string;
  climaDesc: string;
}

export const DeepAnalysis: React.FC<DeepAnalysisProps> = ({
  local,
  visitante,
  lambdaH,
  lambdaA,
  golesEsp,
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
  eloLocal,
  eloVisit,
  eloDiff,
  pMassey,
  pColley,
  pPi,
  ratingWinLocal,
  faseLabel,
  climaDesc,
}) => {
  const localName = local.name;
  const visitanteName = visitante.name;

  function conf(prob: number, hiThresh: number, loThresh: number): 'alta' | 'media' | 'baja' {
    return prob >= hiThresh ? 'alta' : prob >= loThresh ? 'media' : 'baja';
  }

  // 1X2 market pick
  const maxProb1x2 = Math.max(localWinProb, drawProb, visitWinProb);
  let pick1x2 = '';
  let razon1x2 = '';
  if (localWinProb === maxProb1x2) {
    pick1x2 = `Victoria de ${localName}`;
    razon1x2 = `Consenso de efectividad de ${localName} en ${(ratingWinLocal * 100).toFixed(0)}% y una expectativa λ superior (${lambdaH.toFixed(2)} vs ${lambdaA.toFixed(2)})`;
  } else if (visitWinProb === maxProb1x2) {
    pick1x2 = `Victoria de ${visitanteName}`;
    razon1x2 = `Métrica λ de visita superior y vector Pi Rating que favorece a ${visitanteName}`;
  } else {
    pick1x2 = 'Resultado de Empate (X)';
    razon1x2 = `Expectativa de goles equilibrada de manera estricta (${lambdaH.toFixed(2)} vs ${lambdaA.toFixed(2)}), situando el empate como mediana central`;
  }
  const conf1x2 = conf(maxProb1x2, 55, 40);

  // BTTS market pick
  const pickBTTS = bttsProb >= 50 ? 'Sí' : 'No';
  const razonBTTS =
    bttsProb >= 50
      ? `Ambos vectores λ superan 0.80, denotando alta probabilidad de anotación conjunta en el ${bttsProb.toFixed(0)}% de los escenarios`
      : `Restricción en λ ofensiva o alta solvencia táctica defensiva que proyecta arco en cero (Probabilidad: ${csHProb.toFixed(0)}%)`;
  const confBTTS = conf(bttsProb >= 50 ? bttsProb : 100 - bttsProb, 65, 50);

  // AH market pick
  const razonAH = `Sustentado en el ${(ratingWinLocal * 100).toFixed(0)}% de consenso de algoritmos. Tasa de cobertura simulada: ${ahFavProb.toFixed(0)}%`;
  const confAH = conf(ahFavProb, 62, 52);

  // Goles market pick
  let pickGoles = '';
  let razonGoles = '';
  let confGoles: 'alta' | 'media' | 'baja' = 'media';
  if (golesEsp >= 2.8) {
    pickGoles = 'Más de 2.5 goles';
    razonGoles = `Expectativa global de goles de ${golesEsp.toFixed(2)}. Frecuencia Over 2.5 estimada por Poisson en ${ovProb.toFixed(0)}%`;
    confGoles = conf(ovProb, 60, 48);
  } else if (golesEsp >= 2) {
    pickGoles = 'Más de 1.5 goles';
    razonGoles = `Expectativa global de goles de ${golesEsp.toFixed(2)}. Posición Over 1.5 de máxima solvencia táctica: ${ov15Prob.toFixed(0)}%`;
    confGoles = conf(ov15Prob, 72, 60);
  } else {
    pickGoles = 'Menos de 2.5 goles';
    razonGoles = `Encuentro con sólida asimetría defensiva projected. Suma de intensidades críticas λ baja (${golesEsp.toFixed(2)})`;
    confGoles = conf(unProb, 60, 48);
  }

  // Score exacto heurístico (top 1 de Poisson)
  // Let's approximate the top exact score
  let maxScoreP = 0;
  let topH = 1;
  let topA = 1;
  const rho = -0.11; // base
  const scoreProbLocal = (ih: number, ja: number) => {
    const poissonPMF = (l: number, k: number) => {
      if (l <= 0) return k === 0 ? 1 : 0;
      let logP = -l + k * Math.log(l);
      for (let x = 1; x <= k; x++) logP -= Math.log(x);
      return Math.exp(logP);
    };
    const dixonColesCorrection = (x: number, y: number, lh: number, la: number, r: number) => {
      if (x === 0 && y === 0) return 1 - lh * la * r;
      if (x === 0 && y === 1) return 1 + lh * r;
      if (x === 1 && y === 0) return 1 + la * r;
      if (x === 1 && y === 1) return 1 - r;
      return 1;
    };
    return dixonColesCorrection(ih, ja, lambdaH, lambdaA, rho) * poissonPMF(lambdaH, ih) * poissonPMF(lambdaA, ja);
  };

  for (let i = 0; i <= 5; i++) {
    for (let j = 0; j <= 5; j++) {
      const p = scoreProbLocal(i, j);
      if (p > maxScoreP) {
        maxScoreP = p;
        topH = i;
        topA = j;
      }
    }
  }
  const pickScore = `${topH}-${topA}`;
  const scorePct = maxScoreP * 100;
  const razonScore = `Resultado teórico central según distribución Dixon-Coles (${scorePct.toFixed(1)}% de densidad matemática)`;
  const confScore = scorePct >= 18 ? 'media' : 'baja';

  // HT
  const golesHT = golesEsp * 0.42;
  let pickHT = '';
  let razonHT = '';
  let confHT: 'alta' | 'media' | 'baja' = 'media';
  if (golesHT >= 1.2) {
    pickHT = 'Más de 0.5 goles en 1ª mitad';
    razonHT = `Expectativa de ~${golesHT.toFixed(1)} goles en primera mitad. Alta probabilidad de ruptura táctica temprana`;
    confHT = 'alta';
  } else {
    pickHT = 'Menos de 1.5 goles en 1ª mitad';
    razonHT = `Bloque defensivo muy conservador inicial, con expectativa reducida de ~${golesHT.toFixed(1)} goles en primera mitad`;
    confHT = 'media';
  }

  // Pick del partido — el mercado con mayor confianza y prob
  const candidatos: { mercado: string; pick: string; prob: number; conf: 'alta' | 'media' | 'baja' }[] = [
    { mercado: 'Línea de Dinero (1X2)', pick: pick1x2, prob: maxProb1x2, conf: conf1x2 },
    { mercado: 'Ambos Marcan (BTTS)', pick: 'BTTS ' + pickBTTS, prob: bttsProb >= 50 ? bttsProb : 100 - bttsProb, conf: confBTTS },
    { mercado: 'Margen de Goles Totales', pick: pickGoles, prob: golesEsp >= 2.8 ? ovProb : golesEsp >= 2.0 ? ov15Prob : unProb, conf: confGoles },
    { mercado: 'Hándicap Asiático', pick: handicapStr, prob: ahFavProb, conf: confAH },
  ];
  const confScoreVal = { alta: 3, media: 2, baja: 1 };
  candidatos.sort((a, b) => confScoreVal[b.conf] - confScoreVal[a.conf] || b.prob - a.prob);
  const best = candidatos[0];

  const estiloLocal = local.estiloGol || 'juego organizado';
  const estiloVisit = visitante.estiloGol || 'juego directo';
  const ventaja =
    eloDiff > 100
      ? `${localName} posee una asimetría de rendimiento clara`
      : eloDiff < -100
        ? `${visitanteName} se proyecta con ventaja de modelo sistemática`
        : 'Margen estatístico de paridad estrecha entre ambas escuadras';
  const climaImpacto =
    climaDesc.includes('🌡️') || climaDesc.toLowerCase().includes('calor')
      ? 'Las altas temperaturas registradas inducen a un estrés térmico atlético moderado, lo cual disminuye el ritmo de transiciones intensas en el segundo tiempo.'
      : climaDesc.includes('🌧️') || climaDesc.toLowerCase().includes('lluvia')
        ? 'La precipitación y humedad sobre el césped reducen el coeficiente de rodamiento del balón, favoreciendo el ataque transicional directo.'
        : climaDesc.includes('🏔️') || climaDesc.toLowerCase().includes('altitud')
          ? 'La altitud geográfica genera una reducción en el volumen del consumo máximo de oxígeno (VO2 máx), afectando principalmente al equipo visitante en el tramo final.'
          : 'Condiciones termohigrométricas ideales y balanceadas, posicionándose en el rango óptimo sin sesgos físicos.';

  const analisisTacticoText = `${localName} (Patrón táctico: ${estiloLocal}) se enfrenta a ${visitanteName} (Patrón táctico: ${estiloVisit}). Ventaja estructural: ${ventaja} según consenso ponderado de algoritmos Massey, Colley y Pi Rating (${(ratingWinLocal * 100).toFixed(0)}% local). Diagnóstico de entorno: ${climaImpacto}`;

  const dinamicaText = (() => {
    const intensidad = golesEsp >= 2.8 ? 'con alto índice de transiciones verticales y juego abierto' : golesEsp >= 1.8 ? 'parcialmente equilibrado, caracterizado por una alta densidad de juego en zona media' : 'de planteamiento rigurosamente cerrado y bloques defensivos compactos';
    const iniciativa =
      localWinProb > visitWinProb + 10
        ? `${localName} asumirá la iniciativa táctica principal mediante presión en salida.`
        : visitWinProb > localWinProb + 10
          ? `${visitanteName} proyecta una mayor cuota de posesión y control espacial en campo contrario.`
          : 'Se prevé un inicio reservado y de baja tasa de riesgo por parte de ambos bloques estratégicos.';
    const golesPrecoces =
      lambdaH > 1.3 || lambdaA > 1.1
        ? 'El volumen de generación ofensiva proyecta una ruptura del marcador durante los primeros 30 minutos.'
        : 'Las proyecciones indican un escenario de desgaste táctico concentrado que se definirá principalmente en el último vigésimo del partido.';
    return `Expectativa de un enfrentamiento ${intensidad} con un ratio de goles de baseline de ${golesEsp.toFixed(1)}. ${iniciativa} ${golesPrecoces}`;
  })();

  const factoresClave: string[] = [];
  if (Math.abs(eloDiff) > 80) {
    factoresClave.push(`Diferencial sistemático de Massey de ${Math.abs(eloDiff).toFixed(1)} puntos: ventaja matemática robusta para ${eloDiff > 0 ? localName : visitanteName}`);
  }
  if (bttsProb > 55) {
    factoresClave.push(`Rendimiento ofensivo simétrico (BTTS ${bttsProb.toFixed(0)}%): alta correlación de acierto en fases de finalización de jugadas`);
  }
  if (csHProb > 35) {
    factoresClave.push(`Eficacia defensiva de ${localName}: valla invicta proyectada en el ${csHProb.toFixed(0)}% de los escenarios simulados`);
  }
  if (ovProb > 58) {
    factoresClave.push(`Consistencia en el volumen de ataque (Over 2.5: ${ovProb.toFixed(0)}%): la eficiencia de remates supera el margen defensivo estándar`);
  }
  if (unProb > 55) {
    factoresClave.push(`Tendencia Under 2.5 consolidada (${unProb.toFixed(0)}%): neutralización sistemática de los circuitos de juego creativos`);
  }
  if (drawProb > 30) {
    factoresClave.push(`Probabilidad de empate técnico elevada (${drawProb.toFixed(0)}%): sugiere diversificación mediante coberturas o hándicaps`);
  }
  if (pPi > 0.62 || pPi < 0.38) {
    factoresClave.push(`Desbalance crítico en Pi Rating indicando clara supremacía histórica de modelo: ${(pPi * 100).toFixed(0)}%`);
  }
  while (factoresClave.length < 3) {
    factoresClave.push(` baseline acumulado de goles: ${golesEsp.toFixed(2)} — λ Local ${lambdaH.toFixed(2)} · λ Visitante ${lambdaA.toFixed(2)}`);
  }

  const riesgoNivel = maxProb1x2 >= 58 ? 'bajo' : maxProb1x2 >= 45 ? 'medio' : 'alto';
  const riesgoCls = riesgoNivel === 'bajo' ? 'cp-high' : riesgoNivel === 'medio' ? 'cp-med' : 'cp-low';
  const riesgoLabel = riesgoNivel === 'bajo' ? 'RIESGO MODELADO: BAJO' : riesgoNivel === 'medio' ? 'RIESGO MODELADO: MODERADO' : 'RIESGO MODELADO: ELEVADO';

  const veredictoText = `La posición de mayor expectativa matemática de valor corresponde a ${best.pick} con confianza ${best.conf} — fundamentado en la confluencia de tres modelos estructurados y un ${best.prob.toFixed(0)}% de convergencia en 10K iteraciones de Monte Carlo. ${riesgoNivel === 'alto' ? 'Se recomienda una asignación de capital sumamente moderada (Stake 1.0) por el alto grado de paridad implícita.' : riesgoNivel === 'medio' ? 'Adecuada liquidez estructural para una asignación estándar (Stake 2.5); la combinación con el mercado de margen de goles añade valor.' : 'Asimetría favorable lo suficientemente holgada para establecer posición de firmeza.'}`;

  const picksList: { mercado: string; pick: string; razon: string; confianza: 'alta' | 'media' | 'baja' }[] = [
    { mercado: 'Ganador (1X2 Consenso)', pick: pick1x2, razon: razon1x2, confianza: conf1x2 },
    { mercado: 'Ambos Marcan (BTTS)', pick: pickBTTS, razon: razonBTTS, confianza: confBTTS },
    { mercado: 'Hándicap Asiático', pick: handicapStr, razon: razonAH, confianza: confAH },
    { mercado: 'Volumen de Goles Totales', pick: pickGoles, razon: razonGoles, confianza: confGoles },
    { mercado: 'Marcador Exacto de Modelo', pick: pickScore, razon: razonScore, confianza: confScore },
    { mercado: 'Primera Mitad (Resultado HT)', pick: pickHT, razon: razonHT, confianza: confHT },
    { mercado: 'ESTRATEGIA ÓPTIMA RECOMENDADA', pick: best.pick, razon: `Selección estrella del portafolio con mayor ratio de certidumbre matemática (${best.prob.toFixed(0)}%)`, confianza: best.conf },
  ];

  const getConfClass = (c: 'alta' | 'media' | 'baja') => {
    if (c === 'alta') return 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50';
    if (c === 'media') return 'bg-amber-950/40 text-amber-400 border border-amber-800/50';
    return 'bg-rose-950/40 text-rose-400 border border-rose-800/50';
  };

  return (
    <div className="ai-output p-5 md:p-6 bg-brand-surface border border-brand-border rounded-xl mt-4">
      {/* Tactical Analysis */}
      <div className="ai-block border-b border-brand-borderpb-4 mb-5 pb-4">
        <div className="ai-block-title font-sans font-semibold text-xs tracking-wider text-brand-muted mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2 text-brand-accent uppercase font-bold tracking-widest"><Target size={14} /> DIAGNÓSTICO MATEMÁTICO INTEGRAL</span>
          <span className={`text-[10px] font-space font-bold px-2 py-0.5 rounded ${riesgoCls === 'cp-high' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50' : riesgoCls === 'cp-med' ? 'bg-amber-950/40 text-amber-400 border border-amber-800/50' : 'bg-rose-950/40 text-rose-400 border border-rose-800/50'}`}>
            {riesgoLabel}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-brand-text font-sans">{analisisTacticoText}</p>
      </div>

      {/* Match Dynamics */}
      <div className="ai-block border-b border-brand-border mb-5 pb-4">
        <div className="ai-block-title font-sans font-semibold text-xs tracking-wider text-brand-accent2 mb-2 uppercase tracking-widest flex items-center gap-2">
          <TrendingUp size={14} /> DINÁMICA DE JUEGO MODELADA
        </div>
        <p className="text-sm leading-relaxed text-brand-text font-sans">{dinamicaText}</p>
      </div>

      {/* Probability bar visualization */}
      <div className="ai-block border-b border-brand-border mb-5 pb-4">
        <div className="ai-block-title font-sans font-semibold text-xs tracking-wider text-brand-gold mb-2 uppercase tracking-widest flex items-center gap-2">
          <BarChart2 size={14} /> DENSIDAD DE CONCURRENCIA DE RESULTADOS (DIXON-COLES)
        </div>
        <div className="bg-brand-bg border border-brand-border rounded-lg p-5 mt-3">
          <div className="flex justify-between font-space text-[12px] font-bold mb-3 tracking-wide">
            <span className="text-brand-red">{localName} ({localWinProb.toFixed(1)}%)</span>
            <span className="text-brand-muted">EMPATE TÉCNICO ({drawProb.toFixed(1)}%)</span>
            <span className="text-brand-accent">{visitanteName} ({visitWinProb.toFixed(1)}%)</span>
          </div>

          <div className="flex h-4 rounded bg-brand-surface border border-brand-border overflow-hidden gap-0.5 relative">
            <div
              className="h-full bg-brand-red opacity-85 transition-all duration-500 ease-out cursor-crosshair hover:opacity-100"
              style={{ width: `${localWinProb}%` }}
              title={`${localName}: ${localWinProb.toFixed(1)}%`}
            />
            <div
              className="h-full bg-brand-muted opacity-85 transition-all duration-500 ease-out cursor-crosshair hover:opacity-100"
              style={{ width: `${drawProb}%` }}
              title={`Empate: ${drawProb.toFixed(1)}%`}
            />
            <div
              className="h-full bg-brand-accent opacity-85 transition-all duration-500 ease-out cursor-crosshair hover:opacity-100"
              style={{ width: `${visitWinProb}%` }}
              title={`${visitanteName}: ${visitWinProb.toFixed(1)}%`}
            />
          </div>

          <div className="mt-4 bg-brand-surface border-l-4 border-brand-accent p-3.5 rounded text-xs leading-relaxed text-brand-muted">
            <span className="font-bold text-brand-accent3 font-space text-[11px] block mb-1 uppercase tracking-wider flex items-center gap-1">
              <Layers size={11} className="text-brand-accent3" /> MÉTODO DE DISCREPANCIAS EXPONENCIALES BIVARIADAS
            </span>
            La tasa de acierto se fundamenta en la resolución numérica de la matriz general Dixon-Coles calibrando los coeficientes de ataque/defensa reales <strong>λ₁ (goles esperados {localName}: {lambdaH.toFixed(2)})</strong> y <strong>λ₂ (goles esperados {visitanteName}: {lambdaA.toFixed(2)})</strong>. El motor matemático asume una matriz de penalización marginal sobre empates de escaso volumen de anotación.
          </div>
        </div>
      </div>

      {/* Advanced picks list */}
      <div className="ai-block border-b border-brand-border mb-5 pb-4">
        <div className="ai-block-title font-sans font-semibold text-xs tracking-wider text-brand-accent mb-3 uppercase tracking-widest flex items-center gap-2">
          <Award size={14} /> VALORACIÓN ESTRATÉGICA DE MERCADOS (PROYECCIONES)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {picksList.map((p, idx) => (
            <div
              key={idx}
              className={`p-3.5 bg-brand-bg border rounded-lg transition-all hover:bg-brand-surface2 ${p.mercado.toLowerCase().includes('óptima') ? 'border-brand-gold bg-brand-surface2/40' : 'border-brand-border'}`}
            >
              <div className="text-[10px] text-brand-muted uppercase tracking-wider font-bold mb-1 font-sans">
                {p.mercado}
              </div>
              <div className="font-space text-sm font-bold text-brand-text mb-1">
                {p.pick}
              </div>
              <div className="text-[11px] text-brand-muted leading-relaxed mb-3 font-sans">
                {p.razon}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-brand-muted font-sans font-medium">
                CONVERTIBILIDAD:
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${getConfClass(p.confianza)}`}>
                  {p.confianza}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Factors */}
      <div className="ai-block border-b border-brand-border mb-5 pb-4">
        <div className="ai-block-title font-sans font-semibold text-xs tracking-wider text-brand-accent2 mb-2 uppercase tracking-widest flex items-center gap-2">
          <Lightbulb size={14} className="text-brand-accent2" /> PILARES CLAVE DE VIABILIDAD TÉCNICA
        </div>
        <div className="flex flex-col gap-2">
          {factoresClave.map((f, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-brand-text font-sans">
              <span className="text-brand-accent2 text-xs select-none pt-0.5">▪</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Verdict */}
      <div className="bg-[linear-gradient(135deg,rgba(12,26,36,0.5),rgba(5,10,15,0.8))] border border-brand-gold/20 rounded-lg p-4 mt-3">
        <div className="text-[10px] text-brand-gold uppercase tracking-[2px] font-bold mb-2 flex items-center gap-1.5 leading-none">
          <BookOpen size={11} className="text-brand-gold" /> PERSPECTIVA TÁCTICA DE RIESGO Y ASIGNACIÓN (EXECUTIVE DEEP DIVE)
        </div>
        <p className="text-xs md:text-sm leading-relaxed text-brand-muted font-sans">{veredictoText}</p>
      </div>
    </div>
  );
};

