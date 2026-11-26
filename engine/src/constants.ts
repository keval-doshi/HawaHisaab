import type { ActivityLevel, AgeGroup, AqiBand, HomeSize, SwapId } from './types.js';

export interface AqiBreakpoint {
  band: AqiBand;
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

/**
 * India CPCB National Air Quality Index (NAQI) 24-hour concentration breakpoints
 * for PM2.5 (ug/m3). Official breakpoint table adapted for continuous decimal inputs
 * (each band starts immediately above the previous upper bound).
 *
 * ESTIMATE / OFFICIAL BREAKPOINTS:
 * Source: https://cpcb.nic.in/National-Air-Quality-Index/
 * Source: https://app.cpcbccr.com/ccr_docs/About_AQI.pdf
 */
export const CPCB_PM25_BREAKPOINTS: readonly AqiBreakpoint[] = [
  { band: 'Good', cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
  { band: 'Satisfactory', cLow: 30, cHigh: 60, iLow: 51, iHigh: 100 },
  { band: 'Moderate', cLow: 60, cHigh: 90, iLow: 101, iHigh: 200 },
  { band: 'Poor', cLow: 90, cHigh: 120, iLow: 201, iHigh: 300 },
  { band: 'Very Poor', cLow: 120, cHigh: 250, iLow: 301, iHigh: 400 },
  { band: 'Severe', cLow: 250, cHigh: 380, iLow: 401, iHigh: 500 },
] as const;

/**
 * India CPCB National Air Quality Index (NAQI) 24-hour concentration breakpoints
 * for PM10 (ug/m3).
 *
 * ESTIMATE / OFFICIAL BREAKPOINTS:
 * Source: https://cpcb.nic.in/National-Air-Quality-Index/
 * Source: https://app.cpcbccr.com/ccr_docs/About_AQI.pdf
 */
export const CPCB_PM10_BREAKPOINTS: readonly AqiBreakpoint[] = [
  { band: 'Good', cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { band: 'Satisfactory', cLow: 50, cHigh: 100, iLow: 51, iHigh: 100 },
  { band: 'Moderate', cLow: 100, cHigh: 250, iLow: 101, iHigh: 200 },
  { band: 'Poor', cLow: 250, cHigh: 350, iLow: 201, iHigh: 300 },
  { band: 'Very Poor', cLow: 350, cHigh: 430, iLow: 301, iHigh: 400 },
  { band: 'Severe', cLow: 430, cHigh: 510, iLow: 401, iHigh: 500 },
] as const;

/**
 * Waking hours range (06:00 inclusive to 22:00 exclusive, covering 6am–10pm).
 * ESTIMATE / ASSUMPTION for Indian household daily schedule.
 * Source: https://cpcb.nic.in/National-Air-Quality-Index/
 */
export const WAKING_HOURS = {
  startHour: 6,
  endHour: 22,
} as const;

/**
 * Short-term mean inhalation rates (m3/h) by age group and activity level.
 *
 * ESTIMATE derived from US EPA Exposure Factors Handbook (2011 Edition),
 * Chapter 6: Inhalation Rates, Tables 6-1 and 6-2 (converted from m3/min and m3/day).
 * Source: https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6
 */
export const INHALATION_RATES_M3_PER_HOUR: Record<
  AgeGroup,
  Record<ActivityLevel, number>
> = {
  child_under_5: {
    rest: 0.24,
    light: 0.48,
    moderate: 0.9,
    vigorous: 1.5,
  },
  child_5_12: {
    rest: 0.3,
    light: 0.6,
    moderate: 1.2,
    vigorous: 2.2,
  },
  teen: {
    rest: 0.33,
    light: 0.72,
    moderate: 1.5,
    vigorous: 2.8,
  },
  adult: {
    rest: 0.3,
    light: 0.72,
    moderate: 1.56,
    vigorous: 2.9,
  },
  elderly: {
    rest: 0.28,
    light: 0.66,
    moderate: 1.38,
    vigorous: 2.3,
  },
};

/**
 * Typical Indian urban living-space volume estimates (m3, assuming ~2.8m ceiling).
 * ESTIMATE / ASSUMPTION for residential indoor modeling.
 * Source: https://www.epa.gov/indoor-air-quality-iaq/ventilation-and-air-filtration
 */
export const HOME_VOLUME_M3: Record<HomeSize, number> = {
  small_1bhk: 85,
  medium_2bhk: 140,
  large_3bhk: 220,
};

/**
 * Steady-state indoor PM2.5 mass-balance published typical defaults.
 * All values are labeled ESTIMATE / ASSUMPTION for Indian urban homes.
 *
 * - airChangesClosed: 0.5 h^-1 (closed apartment infiltration)
 * - airChangesOpen: 3.0 h^-1 (cross-ventilated open windows)
 * - penetrationClosed: 0.75 (fraction of outdoor PM2.5 infiltrating closed shell)
 * - penetrationOpen: 0.95 (fraction entering when windows are open)
 * - depositionRate: 0.40 h^-1 (PM2.5 indoor surface deposition rate)
 * Source: https://www.epa.gov/indoor-air-quality-iaq
 * Source: https://www.epa.gov/indoor-air-quality-iaq/air-cleaners-and-air-filters-home
 */
export const INDOOR_DEFAULTS = {
  airChangesClosed: 0.5,
  airChangesOpen: 3.0,
  penetrationClosed: 0.75,
  penetrationOpen: 0.95,
  depositionRate: 0.4,
  defaultRoomVolumeM3: 45,
} as const;

/**
 * Typical indoor PM2.5 emission rates S (ug/h) for common Indian household activities.
 * ESTIMATE / ASSUMPTION from peer-reviewed cooking & incense measurements.
 * Source: https://www.ceew.in/publications/clean-cooking
 * Source: https://pubmed.ncbi.nlm.nih.gov/12456795/
 */
export const INDOOR_SOURCE_RATES_UG_PER_HOUR = {
  none: 0,
  pressureCookerOrBoiling: 1500,
  unventedFryingTadka: 18000,
  ventedFryingWithExhaust: 6000,
  incenseOrDiya: 12000,
  mosquitoCoil: 25000,
} as const;

/**
 * Estimated N95/FFP2 well-fitted mask filtration fraction (0.80 = 80% reduction).
 * ESTIMATE / ASSUMPTION accounting for real-world fit leakage.
 * Source: https://www.cdc.gov/niosh/npptl/topics/respirators/disp_part/n95list1.html
 */
export const MASK_REDUCTION_FRACTION = 0.8;

/**
 * India-specific emission factors for daily household swaps.
 * Every factor is an ESTIMATE based on ARAI Indian vehicle factors, India GHG Program,
 * CEEW clean cooking research, and CPCB biomass-burning factors.
 *
 * Source (ARAI vehicles): https://www.araiindia.com/pdf/Emission_Factor_development_for_Indian_Vehicles_Air_Quality_Monitoring_Project-CBSE_2007.pdf
 * Source (India GHG / transport): https://indiaghgp.org/
 * Source (Clean cooking): https://www.ceew.in/publications/clean-cooking
 * Source (Open waste/leaf burning): https://cpcb.nic.in/
 */
export const EMISSION_FACTORS = {
  // ESTIMATE: Indian petrol/mixed car ~175 g CO2/km and ~0.025 g PM2.5/km (exhaust + tyre/brake wear)
  carKgCo2PerKm: 0.175,
  carPm25GPerKm: 0.025,
  // ESTIMATE: Indian petrol two-wheeler ~55 g CO2/km and ~0.018 g PM2.5/km
  twoWheelerKgCo2PerKm: 0.055,
  twoWheelerPm25GPerKm: 0.018,
  // ESTIMATE: Urban metro per passenger-km on Indian electricity grid (~35 g CO2/km, ~0.002 g PM2.5/km local)
  metroKgCo2PerKm: 0.035,
  metroPm25GPerKm: 0.002,
  // ESTIMATE: 3-person carpool retains 1/3 of per-household tailpipe share (avoids 2/3)
  carpoolAvoidedFraction: 2 / 3,
  // ESTIMATE: Shifting 1 daily cooking session from LPG/PNG to electric induction
  gasToInductionPm25GPerDay: 0.35,
  gasToInductionKgCo2PerDay: 0.27,
  // ESTIMATE: Shifting solid biomass cooking to LPG/induction (household daily avoidance)
  biomassToCleanPm25GPerDay: 18.0,
  biomassToCleanKgCo2PerDay: 2.5,
  // ESTIMATE: Composting 2 kg dry leaves instead of open burning (~8 g PM2.5/kg, ~1.45 kg CO2/kg)
  leavesCompostMassKgPerDay: 2.0,
  leafBurningPm25GPerKg: 8.0,
  leafBurningKgCo2PerKg: 1.45,
  // ESTIMATE: Skipping/venting heavy indoor incense or mosquito coil daily
  incenseAvoidedPm25GPerDay: 0.3,
  incenseAvoidedKgCo2PerDay: 0.04,
  // ESTIMATE: Replacing 2.5 km short motor trip with walking or cycling
  shortTripKm: 2.5,
} as const;

export const SWAP_METADATA: Record<SwapId, { titleEn: string; titleHi: string }> = {
  car_to_metro: {
    titleEn: 'Take Metro instead of Car',
    titleHi: 'कार के बजाय मेट्रो का उपयोग करें',
  },
  car_to_carpool: {
    titleEn: 'Share a 3-person Carpool',
    titleHi: '3 लोगों के साथ कारपूल करें',
  },
  two_wheeler_to_metro: {
    titleEn: 'Take Metro instead of Two-Wheeler',
    titleHi: 'दोपहिया के बजाय मेट्रो लें',
  },
  gas_to_induction: {
    titleEn: 'Cook one meal on Induction / Electric Pressure Cooker',
    titleHi: 'एक समय का खाना इंडक्शन / इलेक्ट्रिक कुकर पर पकाएं',
  },
  biomass_to_lpg_induction: {
    titleEn: 'Switch solid-fuel chulha to LPG / Induction',
    titleHi: 'चूल्हे के बजाय एलपीजी / इंडक्शन अपनाएं',
  },
  leaves_to_compost: {
    titleEn: 'Compost dry leaves instead of burning',
    titleHi: 'सूखे पत्तों को जलाने के बजाय खाद बनाएं',
  },
  incense_to_vented: {
    titleEn: 'Swap indoor coil/heavy incense for vented diya or electric',
    titleHi: 'घर के अंदर कॉइल/तेज़ धूप की जगह हवादार दीया या इलेक्ट्रिक विकल्प चुनें',
  },
  short_trip_walk_cycle: {
    titleEn: 'Walk or cycle short 2.5 km errands in clean window',
    titleHi: 'स्वच्छ समय में 2.5 किमी तक पैदल या साइकिल से जाएं',
  },
};
