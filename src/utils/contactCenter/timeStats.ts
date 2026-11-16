import type { SpecialCase } from '../../types/contactCenter';

export type TimeUnit = 'hours';

export interface ComprehensiveTimeStats {
  count: number;
  sumHours: number;
  meanHours: number;
  medianHours: number;
  modeHours: number;
  modeFrequency: number;
  modePercentage: number;
  allModes: number[];
  trimmedMean10Hours: number;
  minHours: number;
  maxHours: number;
  rangeHours: number;
  stdDevHours: number;
  varianceHours: number;
  coefVariationPct: number;
  p10Hours: number;
  p25Hours: number;
  p50Hours: number;
  p75Hours: number;
  p90Hours: number;
  p95Hours: number;
  p99Hours: number;
  iqrHours: number;
  immediateCount: number;
  immediatePct: number;
  fastCount: number;
  fastPct: number;
  moderateCount: number;
  moderatePct: number;
  criticalCount: number;
  criticalPct: number;
}

export function calculateComprehensiveStats(cases: SpecialCase[]): ComprehensiveTimeStats {
  const n = cases.length;
  if (n === 0) {
    return {
      count: 0,
      sumHours: 0,
      meanHours: 0,
      medianHours: 0,
      modeHours: 0,
      modeFrequency: 0,
      modePercentage: 0,
      allModes: [],
      trimmedMean10Hours: 0,
      minHours: 0,
      maxHours: 0,
      rangeHours: 0,
      stdDevHours: 0,
      varianceHours: 0,
      coefVariationPct: 0,
      p10Hours: 0,
      p25Hours: 0,
      p50Hours: 0,
      p75Hours: 0,
      p90Hours: 0,
      p95Hours: 0,
      p99Hours: 0,
      iqrHours: 0,
      immediateCount: 0,
      immediatePct: 0,
      fastCount: 0,
      fastPct: 0,
      moderateCount: 0,
      moderatePct: 0,
      criticalCount: 0,
      criticalPct: 0,
    };
  }

  const timesHours = cases
    .map((c) => Math.max(0, Math.round(c.tiempoSolucionDias * 8)))
    .sort((a, b) => a - b);

  const sumHours = timesHours.reduce((acc, v) => acc + v, 0);
  const meanHours = Number((sumHours / n).toFixed(2));

  const getPercentile = (p: number): number => {
    if (n === 1) return timesHours[0];
    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (lower === upper) return timesHours[lower];
    return Number((timesHours[lower] * (1 - weight) + timesHours[upper] * weight).toFixed(1));
  };

  const p10Hours = getPercentile(10);
  const p25Hours = getPercentile(25);
  const p50Hours = getPercentile(50);
  const p75Hours = getPercentile(75);
  const p90Hours = getPercentile(90);
  const p95Hours = getPercentile(95);
  const p99Hours = getPercentile(99);
  const medianHours = p50Hours;

  const frequencyMap: Record<number, number> = {};
  timesHours.forEach((v) => {
    frequencyMap[v] = (frequencyMap[v] || 0) + 1;
  });

  let maxFreq = 0;
  Object.values(frequencyMap).forEach((freq) => {
    if (freq > maxFreq) maxFreq = freq;
  });

  const allModes = Object.entries(frequencyMap)
    .filter(([_, freq]) => freq === maxFreq)
    .map(([val]) => Number(val))
    .sort((a, b) => a - b);

  const modeHours = allModes[0] ?? 0;
  const modeFrequency = maxFreq;
  const modePercentage = Number(((modeFrequency / n) * 100).toFixed(2));

  const trimCount = Math.floor(n * 0.1);
  const trimmedSubset = timesHours.slice(trimCount, n - trimCount);
  const trimmedMean10Hours =
    trimmedSubset.length > 0
      ? Number((trimmedSubset.reduce((acc, v) => acc + v, 0) / trimmedSubset.length).toFixed(2))
      : meanHours;

  const minHours = timesHours[0];
  const maxHours = timesHours[timesHours.length - 1];
  const rangeHours = Number((maxHours - minHours).toFixed(1));

  const varianceHours = Number(
    (timesHours.reduce((acc, v) => acc + Math.pow(v - meanHours, 2), 0) / (n > 1 ? n - 1 : 1)).toFixed(2)
  );
  const stdDevHours = Number(Math.sqrt(varianceHours).toFixed(2));
  const coefVariationPct = meanHours > 0 ? Number(((stdDevHours / meanHours) * 100).toFixed(1)) : 0;
  const iqrHours = Number((p75Hours - p25Hours).toFixed(1));

  const immediateCount = timesHours.filter((h) => h <= 8).length;
  const immediatePct = Number(((immediateCount / n) * 100).toFixed(2));
  const fastCount = timesHours.filter((h) => h > 8 && h <= 24).length;
  const fastPct = Number(((fastCount / n) * 100).toFixed(2));
  const moderateCount = timesHours.filter((h) => h > 24 && h <= 56).length;
  const moderatePct = Number(((moderateCount / n) * 100).toFixed(2));
  const criticalCount = timesHours.filter((h) => h > 56).length;
  const criticalPct = Number(((criticalCount / n) * 100).toFixed(2));

  return {
    count: n,
    sumHours,
    meanHours,
    medianHours,
    modeHours,
    modeFrequency,
    modePercentage,
    allModes,
    trimmedMean10Hours,
    minHours,
    maxHours,
    rangeHours,
    stdDevHours,
    varianceHours,
    coefVariationPct,
    p10Hours,
    p25Hours,
    p50Hours,
    p75Hours,
    p90Hours,
    p95Hours,
    p99Hours,
    iqrHours,
    immediateCount,
    immediatePct,
    fastCount,
    fastPct,
    moderateCount,
    moderatePct,
    criticalCount,
    criticalPct,
  };
}
