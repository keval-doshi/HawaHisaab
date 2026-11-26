import {
  HOME_VOLUME_M3,
  INDOOR_SOURCE_RATES_UG_PER_HOUR,
  MASK_REDUCTION_FRACTION,
} from './constants.js';
import { calculateInhaledDoseUg, getInhalationRateM3PerHour } from './dose.js';
import { evaluateHouseholdSwaps } from './emissions.js';
import { simulateIndoorAir } from './indoor.js';
import type {
  AirForecastResponse,
  DailyLedger,
  FamilyMember,
  FamilyProfile,
  MemberLedger,
  SwapId,
} from './types.js';
import { findCleanWindows } from './windows.js';

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function averageValidPm25(forecast: AirForecastResponse): number {
  const values = forecast.hourly
    .map((point) => point.pm2_5)
    .filter((val): val is number => val !== null && Number.isFinite(val));

  if (values.length === 0) {
    return forecast.current.pm2_5 ?? 120;
  }

  const sum = values.reduce((acc, v) => acc + v, 0);
  return round1(sum / values.length);
}

function computeMemberLedger(
  member: FamilyMember,
  profile: FamilyProfile,
  avgOutdoorPm25: number,
  worstOutdoorPm25: number,
  cleanWindowPm25: number,
): MemberLedger {
  const outdoorHours = Math.min(16, Math.max(0, member.outdoorHoursPerDay));
  const indoorHours = 24 - outdoorHours;
  const restHours = Math.min(8, indoorHours);
  const lightIndoorHours = Math.max(0, indoorHours - restHours);
  const roomVolumeM3 = HOME_VOLUME_M3[profile.homeSize];

  // Baseline indoor: windows open, no purifier, unvented cooking/incense source
  const baselineIndoorSource =
    profile.cookingFuel === 'biomass'
      ? INDOOR_SOURCE_RATES_UG_PER_HOUR.unventedFryingTadka * 2
      : INDOOR_SOURCE_RATES_UG_PER_HOUR.incenseOrDiya;

  const baselineIndoor = simulateIndoorAir({
    outdoorPm25: avgOutdoorPm25,
    windowsOpen: true,
    roomVolumeM3,
    purifierCadrM3h: 0,
    indoorSourceUgPerHour: baselineIndoorSource,
  });

  // Planned indoor: windows closed during smog, household purifier CADR, low-emission cooking
  const plannedIndoor = simulateIndoorAir({
    outdoorPm25: avgOutdoorPm25,
    windowsOpen: false,
    roomVolumeM3,
    purifierCadrM3h: profile.purifierCadrM3h,
    indoorSourceUgPerHour: INDOOR_SOURCE_RATES_UG_PER_HOUR.pressureCookerOrBoiling,
  });

  // Outdoor exposure: baseline at worst waking hour without mask vs planned clean window (+ N95 if > 120 ug/m3 and not under 5)
  const useMask = cleanWindowPm25 > 120 && member.ageGroup !== 'child_under_5';
  const effectivePlannedOutdoorPm25 = useMask
    ? round1(cleanWindowPm25 * (1 - MASK_REDUCTION_FRACTION))
    : cleanWindowPm25;

  const baselineOutdoorDose = calculateInhaledDoseUg(
    worstOutdoorPm25,
    member.ageGroup,
    'moderate',
    outdoorHours,
  );
  const plannedOutdoorDose = calculateInhaledDoseUg(
    effectivePlannedOutdoorPm25,
    member.ageGroup,
    'moderate',
    outdoorHours,
  );

  const baselineIndoorDose =
    calculateInhaledDoseUg(
      baselineIndoor.indoorPm25,
      member.ageGroup,
      'rest',
      restHours,
    ) +
    calculateInhaledDoseUg(
      baselineIndoor.indoorPm25,
      member.ageGroup,
      'light',
      lightIndoorHours,
    );

  const plannedIndoorDose =
    calculateInhaledDoseUg(plannedIndoor.indoorPm25, member.ageGroup, 'rest', restHours) +
    calculateInhaledDoseUg(
      plannedIndoor.indoorPm25,
      member.ageGroup,
      'light',
      lightIndoorHours,
    );

  const baselineDoseUg = round1(baselineOutdoorDose + baselineIndoorDose);
  const plannedDoseUg = round1(plannedOutdoorDose + plannedIndoorDose);
  const breathedLessUg = Math.max(0, round1(baselineDoseUg - plannedDoseUg));

  const restRate = getInhalationRateM3PerHour(member.ageGroup, 'rest');
  const lightRate = getInhalationRateM3PerHour(member.ageGroup, 'light');
  const modRate = getInhalationRateM3PerHour(member.ageGroup, 'moderate');

  const outdoorPart =
    outdoorHours > 0
      ? `${String(outdoorHours)}h outdoor shifted from ${String(worstOutdoorPm25)} ug/m3 peak to ${String(cleanWindowPm25)} ug/m3 clean window${useMask ? ' with N95 mask (-80%)' : ''}`
      : '0h outdoor planned';

  const indoorPart = `${String(indoorHours)}h indoor lowered from ${String(baselineIndoor.indoorPm25)} to ${String(plannedIndoor.indoorPm25)} ug/m3 (windows closed, CADR ${String(profile.purifierCadrM3h)} m3/h, low-smoke cooking)`;

  const basis = `${member.ageGroup} US EPA inhalation rates (rest ${String(restRate)}, light ${String(lightRate)}, moderate ${String(modRate)} m3/h): ${outdoorPart}; ${indoorPart}.`;

  return {
    memberId: member.id,
    name: member.name,
    ageGroup: member.ageGroup,
    baselineDoseUg,
    plannedDoseUg,
    breathedLessUg,
    basis,
  };
}

export function computeDailyLedger(
  profile: FamilyProfile,
  forecast: AirForecastResponse,
  selectedSwapIds?: readonly SwapId[],
): DailyLedger {
  const avgOutdoorPm25 = averageValidPm25(forecast);
  const windows = findCleanWindows(forecast.hourly);
  const worstOutdoorPm25 =
    windows.worstHours[0]?.pm2_5 ?? forecast.current.pm2_5 ?? avgOutdoorPm25;
  const cleanWindowPm25 =
    windows.best2h?.averagePm25 ??
    windows.best1h?.averagePm25 ??
    forecast.current.pm2_5 ??
    avgOutdoorPm25;

  const members = profile.members.map((member) =>
    computeMemberLedger(
      member,
      profile,
      avgOutdoorPm25,
      worstOutdoorPm25,
      cleanWindowPm25,
    ),
  );

  const totalBreathedLessUg = round1(
    members.reduce((sum, m) => sum + m.breathedLessUg, 0),
  );

  const allSwaps = evaluateHouseholdSwaps(profile, avgOutdoorPm25);
  const activeSwaps = selectedSwapIds
    ? allSwaps.filter((s) => selectedSwapIds.includes(s.swapId))
    : allSwaps.filter((s) => s.applicable).slice(0, 4);

  const emittedLessG = round2(activeSwaps.reduce((sum, s) => sum + s.emittedLessG, 0));
  const emittedLessKgCO2 = round2(
    activeSwaps.reduce((sum, s) => sum + s.emittedLessKgCO2, 0),
  );

  const swapSummaryList =
    activeSwaps.length > 0
      ? activeSwaps
          .map(
            (s) =>
              `${s.titleEn} (-${String(s.emittedLessG)} g PM2.5, -${String(s.emittedLessKgCO2)} kg CO2)`,
          )
          .join('; ')
      : 'No active emission swaps selected';

  const emittedBasis = `Household total from ${String(activeSwaps.length)} daily swaps using ARAI, CEEW, and CPCB India emission factor estimates: ${swapSummaryList}.`;

  return {
    members,
    totalBreathedLessUg,
    emittedLessG,
    emittedLessKgCO2,
    swapsBreakdown: activeSwaps,
    emittedBasis,
  };
}
