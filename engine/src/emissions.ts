import {
  EMISSION_FACTORS,
  INDOOR_SOURCE_RATES_UG_PER_HOUR,
  HOME_VOLUME_M3,
  SWAP_METADATA,
} from './constants.js';
import { calculateInhaledDoseUg } from './dose.js';
import { simulateIndoorAir } from './indoor.js';
import type { FamilyProfile, SwapId, SwapImpact } from './types.js';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calculateSwapImpact(
  swapId: SwapId,
  profile: FamilyProfile,
  outdoorPm25: number,
): SwapImpact {
  const meta = SWAP_METADATA[swapId];
  const km = Math.max(0, profile.commuteKmRoundTrip);
  const effectiveKm = km > 0 ? km : 12;
  const memberCount = Math.max(1, profile.members.length);
  const roomVolumeM3 = HOME_VOLUME_M3[profile.homeSize];

  switch (swapId) {
    case 'car_to_metro': {
      const applicable = profile.commuteMode === 'car' && km > 0;
      const emittedLessG = round2(
        effectiveKm * (EMISSION_FACTORS.carPm25GPerKm - EMISSION_FACTORS.metroPm25GPerKm),
      );
      const emittedLessKgCO2 = round2(
        effectiveKm * (EMISSION_FACTORS.carKgCo2PerKm - EMISSION_FACTORS.metroKgCo2PerKm),
      );
      const breathedLessUg = round1(
        calculateInhaledDoseUg(outdoorPm25 * 0.45, 'adult', 'light', 0.75),
      );
      return {
        swapId,
        titleEn: meta.titleEn,
        titleHi: meta.titleHi,
        applicable,
        emittedLessG,
        emittedLessKgCO2,
        breathedLessUg,
        basis: `${String(effectiveKm)} km round-trip car commute shifted to Metro (ARAI/India estimate: net -0.023 g PM2.5/km, -0.140 kg CO2/km; ~45% lower cabin PM2.5 in AC Metro).`,
      };
    }

    case 'car_to_carpool': {
      const applicable = profile.commuteMode === 'car' && km > 0;
      const emittedLessG = round2(
        effectiveKm *
          EMISSION_FACTORS.carPm25GPerKm *
          EMISSION_FACTORS.carpoolAvoidedFraction,
      );
      const emittedLessKgCO2 = round2(
        effectiveKm *
          EMISSION_FACTORS.carKgCo2PerKm *
          EMISSION_FACTORS.carpoolAvoidedFraction,
      );
      const breathedLessUg = round1(
        calculateInhaledDoseUg(outdoorPm25 * 0.15, 'adult', 'light', 0.75),
      );
      return {
        swapId,
        titleEn: meta.titleEn,
        titleHi: meta.titleHi,
        applicable,
        emittedLessG,
        emittedLessKgCO2,
        breathedLessUg,
        basis: `${String(effectiveKm)} km car commute shared among 3 riders (cuts household tailpipe share by 2/3 using ARAI car estimates).`,
      };
    }

    case 'two_wheeler_to_metro': {
      const applicable =
        (profile.commuteMode === 'two_wheeler' || profile.commuteMode === 'auto') &&
        km > 0;
      const emittedLessG = round2(
        effectiveKm *
          (EMISSION_FACTORS.twoWheelerPm25GPerKm - EMISSION_FACTORS.metroPm25GPerKm),
      );
      const emittedLessKgCO2 = round2(
        effectiveKm *
          (EMISSION_FACTORS.twoWheelerKgCo2PerKm - EMISSION_FACTORS.metroKgCo2PerKm),
      );
      const breathedLessUg = round1(
        calculateInhaledDoseUg(outdoorPm25 * 0.65, 'adult', 'light', 0.75),
      );
      return {
        swapId,
        titleEn: meta.titleEn,
        titleHi: meta.titleHi,
        applicable,
        emittedLessG,
        emittedLessKgCO2,
        breathedLessUg,
        basis: `${String(effectiveKm)} km open two-wheeler/auto ride shifted to Metro (ARAI 2-wheeler estimate: -0.016 g PM2.5/km, -0.020 kg CO2/km; avoids ~65% open roadside PM2.5 exposure).`,
      };
    }

    case 'gas_to_induction': {
      const applicable = profile.cookingFuel === 'lpg' || profile.cookingFuel === 'png';
      const indoorGas = simulateIndoorAir({
        outdoorPm25,
        windowsOpen: false,
        roomVolumeM3,
        purifierCadrM3h: profile.purifierCadrM3h,
        indoorSourceUgPerHour: INDOOR_SOURCE_RATES_UG_PER_HOUR.ventedFryingWithExhaust,
      });
      const indoorInduction = simulateIndoorAir({
        outdoorPm25,
        windowsOpen: false,
        roomVolumeM3,
        purifierCadrM3h: profile.purifierCadrM3h,
        indoorSourceUgPerHour: INDOOR_SOURCE_RATES_UG_PER_HOUR.pressureCookerOrBoiling,
      });
      const deltaC = Math.max(0, indoorGas.indoorPm25 - indoorInduction.indoorPm25);
      const breathedLessUg = round1(
        calculateInhaledDoseUg(deltaC, 'adult', 'light', 1.5) * Math.min(2, memberCount),
      );
      return {
        swapId,
        titleEn: meta.titleEn,
        titleHi: meta.titleHi,
        applicable,
        emittedLessG: EMISSION_FACTORS.gasToInductionPm25GPerDay,
        emittedLessKgCO2: EMISSION_FACTORS.gasToInductionKgCo2PerDay,
        breathedLessUg,
        basis: `Shifting 1 daily meal from LPG/PNG to electric induction/pressure cooker (CEEW/IPCC estimate: -0.35 g PM2.5, -0.27 kg CO2/day; indoor PM2.5 drops by ${String(round1(deltaC))} ug/m3 for 1.5h).`,
      };
    }

    case 'biomass_to_lpg_induction': {
      const applicable = profile.cookingFuel === 'biomass';
      const indoorBiomass = simulateIndoorAir({
        outdoorPm25,
        windowsOpen: false,
        roomVolumeM3,
        purifierCadrM3h: profile.purifierCadrM3h,
        indoorSourceUgPerHour: INDOOR_SOURCE_RATES_UG_PER_HOUR.unventedFryingTadka * 2,
      });
      const indoorClean = simulateIndoorAir({
        outdoorPm25,
        windowsOpen: false,
        roomVolumeM3,
        purifierCadrM3h: profile.purifierCadrM3h,
        indoorSourceUgPerHour: INDOOR_SOURCE_RATES_UG_PER_HOUR.pressureCookerOrBoiling,
      });
      const deltaC = Math.max(0, indoorBiomass.indoorPm25 - indoorClean.indoorPm25);
      const breathedLessUg = round1(
        calculateInhaledDoseUg(deltaC, 'adult', 'light', 2.0) * memberCount,
      );
      return {
        swapId,
        titleEn: meta.titleEn,
        titleHi: meta.titleHi,
        applicable,
        emittedLessG: EMISSION_FACTORS.biomassToCleanPm25GPerDay,
        emittedLessKgCO2: EMISSION_FACTORS.biomassToCleanKgCo2PerDay,
        breathedLessUg,
        basis: `Replacing solid biomass cooking with clean LPG/induction (CEEW clean cooking estimate: -18.0 g PM2.5, -2.5 kg CO2/day across ${String(memberCount)} household members).`,
      };
    }

    case 'leaves_to_compost': {
      const emittedLessG = round2(
        EMISSION_FACTORS.leavesCompostMassKgPerDay *
          EMISSION_FACTORS.leafBurningPm25GPerKg,
      );
      const emittedLessKgCO2 = round2(
        EMISSION_FACTORS.leavesCompostMassKgPerDay *
          EMISSION_FACTORS.leafBurningKgCo2PerKg,
      );
      const breathedLessUg = round1(
        calculateInhaledDoseUg(40, 'adult', 'light', 1.0) * memberCount,
      );
      return {
        swapId,
        titleEn: meta.titleEn,
        titleHi: meta.titleHi,
        applicable: true,
        emittedLessG,
        emittedLessKgCO2,
        breathedLessUg,
        basis: `Composting 2 kg dry garden/RWA leaves instead of open burning (CPCB/EPA open-burn factor estimate: 8 g PM2.5/kg and 1.45 kg CO2/kg avoided).`,
      };
    }

    case 'incense_to_vented': {
      const indoorIncense = simulateIndoorAir({
        outdoorPm25,
        windowsOpen: false,
        roomVolumeM3,
        purifierCadrM3h: profile.purifierCadrM3h,
        indoorSourceUgPerHour: INDOOR_SOURCE_RATES_UG_PER_HOUR.incenseOrDiya,
      });
      const indoorNone = simulateIndoorAir({
        outdoorPm25,
        windowsOpen: false,
        roomVolumeM3,
        purifierCadrM3h: profile.purifierCadrM3h,
        indoorSourceUgPerHour: INDOOR_SOURCE_RATES_UG_PER_HOUR.none,
      });
      const deltaC = Math.max(0, indoorIncense.indoorPm25 - indoorNone.indoorPm25);
      const breathedLessUg = round1(
        calculateInhaledDoseUg(deltaC, 'adult', 'rest', 2.0) * memberCount,
      );
      return {
        swapId,
        titleEn: meta.titleEn,
        titleHi: meta.titleHi,
        applicable: true,
        emittedLessG: EMISSION_FACTORS.incenseAvoidedPm25GPerDay,
        emittedLessKgCO2: EMISSION_FACTORS.incenseAvoidedKgCo2PerDay,
        breathedLessUg,
        basis: `Avoiding 12,000 ug/h indoor incense/coil smoke in ${String(roomVolumeM3)} m3 home cuts indoor PM2.5 by ${String(round1(deltaC))} ug/m3 for 2h across ${String(memberCount)} members.`,
      };
    }

    case 'short_trip_walk_cycle': {
      const applicable =
        profile.commuteMode === 'car' ||
        profile.commuteMode === 'two_wheeler' ||
        profile.commuteMode === 'auto';
      const dist = EMISSION_FACTORS.shortTripKm;
      const emittedLessG = round2(dist * EMISSION_FACTORS.carPm25GPerKm);
      const emittedLessKgCO2 = round2(dist * EMISSION_FACTORS.carKgCo2PerKm);
      return {
        swapId,
        titleEn: meta.titleEn,
        titleHi: meta.titleHi,
        applicable,
        emittedLessG,
        emittedLessKgCO2,
        breathedLessUg: 0,
        basis: `Replacing a ${String(dist)} km motor errand with walking/cycling during a clean window (ARAI vehicle estimate: -0.025 g PM2.5/km, -0.175 kg CO2/km).`,
      };
    }
  }
}

export function evaluateHouseholdSwaps(
  profile: FamilyProfile,
  outdoorPm25: number,
): SwapImpact[] {
  const allSwapIds = Object.keys(SWAP_METADATA) as SwapId[];
  const impacts = allSwapIds.map((id) => calculateSwapImpact(id, profile, outdoorPm25));

  return impacts.sort((a, b) => {
    if (a.applicable !== b.applicable) return a.applicable ? -1 : 1;
    const scoreA = a.emittedLessG * 10 + a.breathedLessUg / 50;
    const scoreB = b.emittedLessG * 10 + b.breathedLessUg / 50;
    return scoreB - scoreA;
  });
}
