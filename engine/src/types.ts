export interface HourlyAirPoint {
  time: string;
  pm2_5: number | null;
  pm10: number | null;
}

export interface AirLocation {
  lat: number;
  lon: number;
  name?: string;
  state?: string;
  timezone: string;
  timezoneAbbreviation: string;
}

export interface AirForecastResponse {
  location: AirLocation;
  fetchedAt: string;
  current: HourlyAirPoint;
  hourly: HourlyAirPoint[];
}

export interface GeocodeResult {
  id: number;
  name: string;
  state: string | null;
  countryCode: string;
  lat: number;
  lon: number;
  population: number | null;
}

export type AqiBand =
  'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';

export interface AqiResult {
  aqi: number;
  band: AqiBand;
  pm25SubIndex: number | null;
  pm10SubIndex: number | null;
  dominantPollutant: 'pm2_5' | 'pm10' | 'both';
}

export interface CleanWindow {
  startTime: string;
  endTime: string;
  hours: number;
  averagePm25: number;
  minPm25: number;
  maxPm25: number;
}

export interface WorstHour {
  time: string;
  pm2_5: number;
}

export interface CleanWindowsResult {
  best1h: CleanWindow | null;
  best2h: CleanWindow | null;
  best3h: CleanWindow | null;
  worstHours: WorstHour[];
}

export type AgeGroup = 'child_under_5' | 'child_5_12' | 'teen' | 'adult' | 'elderly';

export type ActivityLevel = 'rest' | 'light' | 'moderate' | 'vigorous';

export type HealthFlag = 'asthma' | 'heart' | 'pregnancy' | 'none';

export type CommuteMode =
  'car' | 'two_wheeler' | 'auto' | 'metro' | 'bus' | 'walk_cycle' | 'wfh';

export type CookingFuel = 'lpg' | 'png' | 'induction' | 'biomass';

export type HomeSize = 'small_1bhk' | 'medium_2bhk' | 'large_3bhk';

export interface FamilyMember {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  healthFlags: HealthFlag[];
  outdoorHoursPerDay: number;
}

export interface FamilyProfile {
  location: {
    label: string;
    lat: number;
    lon: number;
  };
  members: FamilyMember[];
  commuteMode: CommuteMode;
  commuteKmRoundTrip: number;
  cookingFuel: CookingFuel;
  homeSize: HomeSize;
  purifierCadrM3h: number;
  outdoorRoutine: string;
  language: 'en' | 'hi';
}

export interface IndoorSimulationInput {
  outdoorPm25: number;
  windowsOpen: boolean;
  roomVolumeM3: number;
  purifierCadrM3h: number;
  indoorSourceUgPerHour: number;
  penetrationFactor?: number;
  airChangesPerHour?: number;
  depositionRatePerHour?: number;
}

export interface IndoorSimulationResult {
  indoorPm25: number;
  baselineIndoorPm25: number;
  reductionUgPerM3: number;
  reductionPercent: number;
  assumptions: {
    penetrationFactor: number;
    airChangesPerHour: number;
    depositionRatePerHour: number;
    roomVolumeM3: number;
    indoorSourceUgPerHour: number;
    purifierCadrM3h: number;
  };
}

export type SwapId =
  | 'car_to_metro'
  | 'car_to_carpool'
  | 'two_wheeler_to_metro'
  | 'gas_to_induction'
  | 'biomass_to_lpg_induction'
  | 'leaves_to_compost'
  | 'incense_to_vented'
  | 'short_trip_walk_cycle';

export interface SwapImpact {
  swapId: SwapId;
  titleEn: string;
  titleHi: string;
  applicable: boolean;
  emittedLessG: number;
  emittedLessKgCO2: number;
  breathedLessUg: number;
  basis: string;
}

export interface MemberLedger {
  memberId: string;
  name: string;
  ageGroup: AgeGroup;
  baselineDoseUg: number;
  plannedDoseUg: number;
  breathedLessUg: number;
  basis: string;
}

export interface DailyLedger {
  members: MemberLedger[];
  totalBreathedLessUg: number;
  emittedLessG: number;
  emittedLessKgCO2: number;
  swapsBreakdown: SwapImpact[];
  emittedBasis: string;
}

export interface PlanItem {
  id: string;
  time: string;
  member: string;
  action: string;
  lowEmissionTip: string;
  why: string;
  breathedLessUg?: number;
}

export interface IndoorHack {
  id: string;
  hack: string;
  why: string;
  estimatedIndoorPm25?: number;
}

export interface PlanSwap {
  swapId: SwapId;
  why: string;
  emittedLessG?: number;
  emittedLessKgCO2?: number;
  breathedLessUg?: number;
}

export interface SmogDayPlan {
  source: 'gemini' | 'fallback';
  language: 'en' | 'hi';
  summary: string;
  items: PlanItem[];
  indoorHacks: IndoorHack[];
  swaps: PlanSwap[];
  aqi: AqiResult;
  cleanWindows: CleanWindowsResult;
  ledger: DailyLedger;
}
