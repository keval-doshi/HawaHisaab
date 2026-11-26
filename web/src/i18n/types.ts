import type {
  AgeGroup,
  AqiBand,
  CommuteMode,
  CookingFuel,
  HealthFlag,
  HomeSize,
} from '@hawahisaab/engine';

export type Language = 'en' | 'hi';

export type TabId = 'today' | 'lab' | 'swaps' | 'hisaab' | 'mohalla';

export interface Translations {
  appName: string;
  tagline: string;
  skipToContent: string;
  langToggleLabel: string;
  switchToLang: string;
  editProfile: string;
  errorBoundary: {
    title: string;
    message: string;
    reload: string;
  };
  nav: Record<TabId, string>;
  aqiBands: Record<AqiBand, string>;
  ageGroups: Record<AgeGroup, string>;
  healthFlags: Record<HealthFlag, string>;
  commuteModes: Record<CommuteMode, string>;
  cookingFuels: Record<CookingFuel, string>;
  homeSizes: Record<HomeSize, string>;
  location: {
    heading: string;
    useMyLocation: string;
    locating: string;
    orSearch: string;
    cityLabel: string;
    cityPlaceholder: string;
    search: string;
    searching: string;
    noResults: string;
    selected: string;
    tooShort: string;
    geoUnsupported: string;
    geoDenied: string;
    geoFailed: string;
  };
  onboarding: {
    title: string;
    subtitle: string;
    stepLocation: string;
    stepMembers: string;
    addMember: string;
    removeMember: string;
    memberName: string;
    memberNamePlaceholder: string;
    ageGroup: string;
    healthConditions: string;
    outdoorHours: string;
    stepLifestyle: string;
    commuteMode: string;
    commuteKm: string;
    cookingFuel: string;
    homeSize: string;
    purifierCadr: string;
    purifierNoneHint: string;
    routineLabel: string;
    routinePlaceholder: string;
    freeTextCounter: string;
    freeTextTooLong: string;
    saveAndGenerate: string;
    saving: string;
    validationMissingLocation: string;
    validationMissingMember: string;
  };
  today: {
    aqiHeading: string;
    aqiLabel: string;
    pm25Label: string;
    pm10Label: string;
    dominantLabel: string;
    sensitiveTitle: string;
    sensitiveHigh: string;
    sensitiveModerate: string;
    sensitiveGood: string;
    forecastHeading: string;
    cleanWindowLabel: string;
    worstHourLabel: string;
    best1h: string;
    best2h: string;
    best3h: string;
    avoidPeak: string;
    planHeading: string;
    sourceGemini: string;
    sourceFallback: string;
    refreshPlan: string;
    loadingAir: string;
    loadingPlan: string;
    indoorHacksHeading: string;
    estIndoorLabel: string;
    breathedLessTag: string;
    tipLabel: string;
    whyLabel: string;
  };
  lab: {
    title: string;
    subtitle: string;
    roomSizeLabel: string;
    windowsLabel: string;
    windowsClosed: string;
    windowsOpen: string;
    cadrLabel: string;
    sourceLabel: string;
    sources: {
      none: string;
      pressure: string;
      ventedFry: string;
      unventedFry: string;
      incense: string;
      coil: string;
    };
    estimatedIndoor: string;
    baselineIndoor: string;
    doseSaved: string;
    assumptionsTitle: string;
    outdoorRef: string;
  };
  swaps: {
    title: string;
    subtitle: string;
    recommended: string;
    optional: string;
    breathedLess: string;
    emittedLess: string;
    includeInHisaab: string;
    included: string;
    whyThis: string;
  };
  hisaab: {
    title: string;
    subtitle: string;
    breathedColTitle: string;
    emittedColTitle: string;
    householdTotal: string;
    perMember: string;
    baselineLabel: string;
    plannedLabel: string;
    whyThis: string;
    activeSwapsHeading: string;
    noSwapsSelected: string;
  };
  mohalla: {
    title: string;
    subtitle: string;
    householdsLabel: string;
    breathedSaved: string;
    pmEmittedSaved: string;
    co2Saved: string;
    shareHeading: string;
    copyText: string;
    copied: string;
    shareWhatsApp: string;
    advisoryTemplate: string;
  };
}
