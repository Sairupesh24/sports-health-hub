import { FMSData, StabilityData, PowerSpeedData, AnaerobicData, AerobicData, BiomotorRatings, BiomotorTier } from './performanceTypes';

/**
 * 1. FMS Movement Calculation Engine
 * Enforces clearing tests fail-safes:
 * - Pain on clearing test (clearing = true) immediately zeroes out that movement score.
 * - For bilateral tests, the score is the minimum of Right and Left.
 * - Total score is sum of all 7 movement screens (Max 21).
 */
export function calculateFMS(fms: FMSData) {
  const getBilateralScore = (test?: { right?: number; left?: number; clearing?: boolean }) => {
    if (!test) return 0;
    if (test.clearing === true) return 0; // Fail-safe: pain yields 0
    const r = typeof test.right === 'number' ? test.right : 0;
    const l = typeof test.left === 'number' ? test.left : 0;
    return Math.min(r, l);
  };

  const ohsScore = fms.ohs?.final ?? 0;
  const hurdleStepScore = getBilateralScore(fms.hurdle_step);
  const inlineLungeScore = getBilateralScore(fms.inline_lunge);
  const shoulderMobilityScore = getBilateralScore(fms.shoulder_mobility);
  const aslrScore = getBilateralScore(fms.aslr);
  const trunkPushupScore = getBilateralScore(fms.trunk_pushup);
  const rotaryStabilityScore = getBilateralScore(fms.rotary_stability);

  const total = ohsScore + hurdleStepScore + inlineLungeScore + shoulderMobilityScore + aslrScore + trunkPushupScore + rotaryStabilityScore;

  return {
    total,
    scores: {
      ohs: ohsScore,
      hurdle_step: hurdleStepScore,
      inline_lunge: inlineLungeScore,
      shoulder_mobility: shoulderMobilityScore,
      aslr: aslrScore,
      trunk_pushup: trunkPushupScore,
      rotary_stability: rotaryStabilityScore,
    },
    riskFlag: total <= 14 // FMS ≤ 14 is clinically established risk threshold
  };
}

/**
 * 2. Y-Balance Test (YBT) Engine
 * Formula: Composite Score = ((Anterior + PosteroMedial + PosteroLateral) / (3 * Limb Length)) * 100
 * Difference = |Right - Left|
 */
export function calculateYBT(
  stability: StabilityData,
  lowerLimbLengthR: number = 0,
  lowerLimbLengthL: number = 0,
  upperLimbLengthR: number = 0,
  upperLimbLengthL: number = 0
) {
  const num = (val: any) => (typeof val === 'number' ? val : parseFloat(val) || 0);

  // Lower Quadrant YBT
  const antR = num(stability.ybt_lq_anterior_r);
  const antL = num(stability.ybt_lq_anterior_l);
  const pmR = num(stability.ybt_lq_pm_r);
  const pmL = num(stability.ybt_lq_pm_l);
  const plR = num(stability.ybt_lq_pl_r);
  const plL = num(stability.ybt_lq_pl_l);

  const diffAnt = Math.abs(antR - antL);
  const diffPm = Math.abs(pmR - pmL);
  const diffPl = Math.abs(plR - plL);

  const compLowerR = lowerLimbLengthR > 0 && (antR || pmR || plR)
    ? ((antR + pmR + plR) / (3 * lowerLimbLengthR)) * 100
    : 0;

  const compLowerL = lowerLimbLengthL > 0 && (antL || pmL || plL)
    ? ((antL + pmL + plL) / (3 * lowerLimbLengthL)) * 100
    : 0;

  // Upper Quadrant YBT
  const medR = num(stability.ybt_uq_medial_r);
  const medL = num(stability.ybt_uq_medial_l);
  const slR = num(stability.ybt_uq_sl_r);
  const slL = num(stability.ybt_uq_sl_l);
  const ilR = num(stability.ybt_uq_il_r);
  const ilL = num(stability.ybt_uq_il_l);

  const diffMed = Math.abs(medR - medL);

  const compUpperR = upperLimbLengthR > 0 && (medR || slR || ilR)
    ? ((medR + slR + ilR) / (3 * upperLimbLengthR)) * 100
    : 0;

  const compUpperL = upperLimbLengthL > 0 && (medL || slL || ilL)
    ? ((medL + slL + ilL) / (3 * upperLimbLengthL)) * 100
    : 0;

  return {
    lower: {
      diffAnt: Number(diffAnt.toFixed(1)),
      diffPm: Number(diffPm.toFixed(1)),
      diffPl: Number(diffPl.toFixed(1)),
      compR: Number(compLowerR.toFixed(1)),
      compL: Number(compLowerL.toFixed(1)),
      antAsymmetryRisk: diffAnt >= 4.0 // Anterior diff >= 4cm indicates elevated injury risk
    },
    upper: {
      diffMed: Number(diffMed.toFixed(1)),
      compR: Number(compUpperR.toFixed(1)),
      compL: Number(compUpperL.toFixed(1)),
      medAsymmetryRisk: diffMed >= 4.0
    }
  };
}

/**
 * 3. Sayers Peak Power Formula (Watts)
 * PAPw (W) = 60.7 * Jump Height (cm) + 45.3 * Body Mass (kg) - 2055
 */
export function calculateSayersPower(jumpHeightCm: number, bodyWeightKg: number): number {
  if (jumpHeightCm <= 0 || bodyWeightKg <= 0) return 0;
  const watts = (60.7 * jumpHeightCm) + (45.3 * bodyWeightKg) - 2055;
  return Number(Math.max(0, watts).toFixed(0));
}

/**
 * 4. Drop Jump RSI (Reactive Strength Index)
 * RSI = Jump Height (m) / Contact Time (s)
 * Or = (Jump Height (cm) / 100) / Contact Time (s)
 */
export function calculateDropJumpRSI(jumpHeightCm: number, contactTimeMsOrSec: number): number {
  if (jumpHeightCm <= 0 || contactTimeMsOrSec <= 0) return 0;
  const contactTimeSec = contactTimeMsOrSec > 10 ? contactTimeMsOrSec / 1000 : contactTimeMsOrSec;
  const jumpHeightM = jumpHeightCm / 100;
  const rsi = jumpHeightM / contactTimeSec;
  return Number(rsi.toFixed(2));
}

/**
 * 5. RAST (Running-based Anaerobic Sprint Test)
 * 6 x 35m sprints with 10s recovery.
 * Power (W) = (Weight (kg) * 35^2) / (Time^3) = (Weight * 1225) / (Time^3)
 * Fatigue Index (W/s) = (Peak Power - Min Power) / Total Sprints Time
 */
export function calculateRAST(sprintTimesSec: number[], bodyWeightKg: number) {
  if (bodyWeightKg <= 0 || sprintTimesSec.length === 0) {
    return { peakPower: 0, minPower: 0, avgPower: 0, fatigueIndex: 0, sprintPowers: [] };
  }

  const powers: number[] = [];
  let totalTime = 0;

  for (const t of sprintTimesSec) {
    if (t > 0) {
      const p = (bodyWeightKg * 1225) / Math.pow(t, 3);
      powers.push(Number(p.toFixed(1)));
      totalTime += t;
    } else {
      powers.push(0);
    }
  }

  const validPowers = powers.filter(p => p > 0);
  if (validPowers.length === 0) {
    return { peakPower: 0, minPower: 0, avgPower: 0, fatigueIndex: 0, sprintPowers: powers };
  }

  const peakPower = Math.max(...validPowers);
  const minPower = Math.min(...validPowers);
  const avgPower = Number((validPowers.reduce((a, b) => a + b, 0) / validPowers.length).toFixed(1));
  const fatigueIndex = totalTime > 0 ? Number(((peakPower - minPower) / totalTime).toFixed(2)) : 0;

  return {
    peakPower: Number(peakPower.toFixed(1)),
    minPower: Number(minPower.toFixed(1)),
    avgPower,
    fatigueIndex,
    sprintPowers: powers
  };
}

/**
 * 6. Yo-Yo Intermittent Recovery Test - Estimated VO2 Max (mL/kg/min)
 * Bangsbo formula:
 * IR1: VO2 Max = Distance (m) * 0.0084 + 36.4
 * IR2: VO2 Max = Distance (m) * 0.0136 + 45.3
 */
export function calculateYoYoVO2Max(distanceMeters: number, variant: string = 'Yo-Yo IR1'): number {
  if (distanceMeters <= 0) return 0;
  if (variant.includes('IR2')) {
    return Number(((distanceMeters * 0.0136) + 45.3).toFixed(1));
  }
  return Number(((distanceMeters * 0.0084) + 36.4).toFixed(1));
}

/**
 * 7. Bio-Motor Ratings to 5-Point Radar Numeric Score
 */
export const BIOMOTOR_LEVEL_MAP: Record<BiomotorTier, number> = {
  'Poor': 1,
  'Average': 2,
  'Good': 3,
  'Excellent': 4,
  'Elite': 5
};

export const BIOMOTOR_LEVEL_COLORS: Record<BiomotorTier, string> = {
  'Poor': 'bg-rose-100 text-rose-700 border-rose-300',
  'Average': 'bg-amber-100 text-amber-700 border-amber-300',
  'Good': 'bg-blue-100 text-blue-700 border-blue-300',
  'Excellent': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  'Elite': 'bg-purple-100 text-purple-700 border-purple-300'
};

export function transformBiomotorToRadar(ratings: BiomotorRatings, activeDimensions?: string[]) {
  const dimensions = activeDimensions && activeDimensions.length > 0
    ? activeDimensions
    : ['Balance', 'Flexibility', 'Power', 'Speed', 'Agility', 'Strength', 'Anaerobic', 'Aerobic'];

  return dimensions.map(dim => {
    const tier = ratings[dim] || 'Average';
    return {
      quality: dim,
      score: BIOMOTOR_LEVEL_MAP[tier] || 2,
      tier,
      benchmark: 4 // Standard high-performance target
    };
  });
}
