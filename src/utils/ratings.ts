import { MASSEY_RATINGS, COLLEY_RATINGS, PI_RATINGS } from '../data';

export function masseyWinProb(mA: number, mB: number): number {
  const diff = mA - mB;
  return 1 / (1 + Math.exp(-diff / 0.9));
}

export function colleyWinProb(cA: number, cB: number): number {
  const ratio = cA / (cA + cB);
  return 0.15 + ratio * 0.70;
}

export function piWinProb(piHomeA: number, piAwayB: number): number {
  return piHomeA / (piHomeA + piAwayB);
}

export interface ConsensusResult {
  pMassey: number;
  pColley: number;
  pPi: number;
  combined: number;
}

export function consensusRating(localName: string, visitanteName: string): ConsensusResult {
  const mLocal = MASSEY_RATINGS[localName] ?? 0.5;
  const mVisit = MASSEY_RATINGS[visitanteName] ?? 0.5;
  const cLocal = COLLEY_RATINGS[localName] ?? 0.5;
  const cVisit = COLLEY_RATINGS[visitanteName] ?? 0.5;
  const piL = PI_RATINGS[localName] ?? { home: 1.0, away: 0.85 };
  const piV = PI_RATINGS[visitanteName] ?? { home: 1.0, away: 0.85 };

  const pMassey = masseyWinProb(mLocal, mVisit);
  const pColley = colleyWinProb(cLocal, cVisit);
  const pPi = piWinProb(piL.home, piV.away);

  // Weighing: Pi: 50%, Massey: 28%, Colley: 22% (academically best)
  const combined = pMassey * 0.28 + pColley * 0.22 + pPi * 0.50;

  return { pMassey, pColley, pPi, combined };
}
