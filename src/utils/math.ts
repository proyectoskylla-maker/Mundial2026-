// Poisson and Dixon-Coles mathematical engine

export function poissonPMF(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 1; i <= k; i++) {
    logP -= Math.log(i);
  }
  return Math.exp(logP);
}

export function dixonColesCorrection(
  i: number,
  j: number,
  lambdaH: number,
  lambdaA: number,
  rho: number
): number {
  if (i === 0 && j === 0) return 1 - lambdaH * lambdaA * rho;
  if (i === 0 && j === 1) return 1 + lambdaH * rho;
  if (i === 1 && j === 0) return 1 + lambdaA * rho;
  if (i === 1 && j === 1) return 1 - rho;
  return 1;
}

export function scoreProb(
  i: number,
  j: number,
  lambdaH: number,
  lambdaA: number,
  rho = -0.11
): number {
  return (
    dixonColesCorrection(i, j, lambdaH, lambdaA, rho) *
    poissonPMF(lambdaH, i) *
    poissonPMF(lambdaA, j)
  );
}

export interface MCSimResult {
  winH: number;
  draw: number;
  winA: number;
  over15: number;
  over25: number;
  over35: number;
  btts: number;
  cleanSheetH: number;
  cleanSheetA: number;
}

export function monteCarloSim(lambdaH: number, lambdaA: number, N = 10000): MCSimResult {
  function randPoisson(lambda: number): number {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  }

  let winH = 0;
  let draw = 0;
  let winA = 0;
  let over25 = 0;
  let over35 = 0;
  let over15 = 0;
  let btts = 0;
  let cleanSheetH = 0;
  let cleanSheetA = 0;

  for (let i = 0; i < N; i++) {
    const gH = randPoisson(lambdaH);
    const gA = randPoisson(lambdaA);
    const total = gH + gA;
    if (gH > gA) {
      winH++;
    } else if (gH < gA) {
      winA++;
    } else {
      draw++;
    }
    if (total > 2.5) over25++;
    if (total > 3.5) over35++;
    if (total > 1.5) over15++;
    if (gH > 0 && gA > 0) btts++;
    if (gA === 0) cleanSheetH++;
    if (gH === 0) cleanSheetA++;
  }

  return {
    winH: winH / N,
    draw: draw / N,
    winA: winA / N,
    over15: over15 / N,
    over25: over25 / N,
    over35: over35 / N,
    btts: btts / N,
    cleanSheetH: cleanSheetH / N,
    cleanSheetA: cleanSheetA / N,
  };
}
