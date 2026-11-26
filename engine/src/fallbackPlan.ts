import { computeCpcbAqi } from './aqi.js';
import { HOME_VOLUME_M3, INDOOR_SOURCE_RATES_UG_PER_HOUR } from './constants.js';
import { simulateIndoorAir } from './indoor.js';
import { computeDailyLedger } from './ledger.js';
import type {
  AirForecastResponse,
  FamilyMember,
  FamilyProfile,
  IndoorHack,
  PlanItem,
  PlanSwap,
  SmogDayPlan,
} from './types.js';
import { findCleanWindows } from './windows.js';

function formatHourRange(startIso: string, endIso: string): string {
  return `${startIso.slice(11, 16)}–${endIso.slice(11, 16)}`;
}

function isSensitive(member: FamilyMember): boolean {
  return (
    member.ageGroup === 'child_under_5' ||
    member.ageGroup === 'elderly' ||
    member.healthFlags.some((flag) => flag !== 'none')
  );
}

export function buildFallbackPlan(
  profile: FamilyProfile,
  forecast: AirForecastResponse,
): SmogDayPlan {
  const currentPm25 = forecast.current.pm2_5 ?? 120;
  const currentPm10 = forecast.current.pm10;
  const aqi = computeCpcbAqi(currentPm25, currentPm10) ?? {
    aqi: 100,
    band: 'Satisfactory',
    pm25SubIndex: 100,
    pm10SubIndex: null,
    dominantPollutant: 'pm2_5',
  };

  const cleanWindows = findCleanWindows(forecast.hourly);
  const ledger = computeDailyLedger(profile, forecast);
  const roomVolumeM3 = HOME_VOLUME_M3[profile.homeSize];

  const indoorClosed = simulateIndoorAir({
    outdoorPm25: currentPm25,
    windowsOpen: false,
    roomVolumeM3,
    purifierCadrM3h: profile.purifierCadrM3h,
    indoorSourceUgPerHour: INDOOR_SOURCE_RATES_UG_PER_HOUR.pressureCookerOrBoiling,
  });

  const bestWindowLabel = cleanWindows.best2h
    ? formatHourRange(cleanWindows.best2h.startTime, cleanWindows.best2h.endTime)
    : cleanWindows.best1h
      ? formatHourRange(cleanWindows.best1h.startTime, cleanWindows.best1h.endTime)
      : '13:00–15:00';

  const worstHourLabel = cleanWindows.worstHours[0]
    ? cleanWindows.worstHours[0].time.slice(11, 16)
    : '08:00';

  const isHi = profile.language === 'hi';

  const summary = isHi
    ? `आज का CPCB AQI ${String(aqi.aqi)} (${aqi.band}) है; सबसे कम प्रदूषण वाला समय ${bestWindowLabel} है जबकि ${worstHourLabel} के आसपास बाहर जाने से बचें। इन उपायों से आपका परिवार ${String(ledger.totalBreathedLessUg)} µg PM2.5 कम सांस लेगा और ${String(ledger.emittedLessG)} g PM2.5 व ${String(ledger.emittedLessKgCO2)} kg CO₂ का उत्सर्जन बचाएगा।`
    : `Today's CPCB AQI is ${String(aqi.aqi)} (${aqi.band}); plan outdoor errands in the ${bestWindowLabel} window and avoid peak smog around ${worstHourLabel}. Together your family avoids inhaling ${String(ledger.totalBreathedLessUg)} µg PM2.5 and prevents ${String(ledger.emittedLessG)} g PM2.5 and ${String(ledger.emittedLessKgCO2)} kg CO₂ emissions.`;

  const items: PlanItem[] = profile.members.map((member, index) => {
    const memberLedger = ledger.members.find((m) => m.memberId === member.id);
    const sensitive = isSensitive(member);

    if (sensitive) {
      return {
        id: `item-${String(index + 1)}`,
        time: bestWindowLabel,
        member: member.name,
        action: isHi
          ? `${member.name} को ${worstHourLabel} के समय घर के अंदर रखें और केवल ${bestWindowLabel} में हल्की सैर कराएं।`
          : `Keep ${member.name} indoors during peak smog (${worstHourLabel}) and limit outdoor time to ${bestWindowLabel}.`,
        lowEmissionTip: isHi
          ? 'घर के पास पत्ते या कचरा न जलाएं और कमरे के दरवाज़े-खिड़कियां बंद रखें।'
          : 'Keep bedroom doors and windows sealed during peak hours and avoid burning incense indoors.',
        why: isHi
          ? 'संवेदनशील सदस्य (बच्चे/बुजुर्ग/अस्थमा/हृदय/गर्भावस्था) उच्च PM2.5 से जल्दी प्रभावित होते हैं।'
          : 'Sensitive family members experience sharper respiratory and cardiac stress during peak PM2.5 hours.',
        breathedLessUg: memberLedger?.breathedLessUg ?? 0,
      };
    }

    return {
      id: `item-${String(index + 1)}`,
      time: bestWindowLabel,
      member: member.name,
      action: isHi
        ? `${member.name} की बाहरी गतिविधियां या सफ़र ${bestWindowLabel} में करें; पीक समय में N95 मास्क पहनें।`
        : `Schedule ${member.name}'s outdoor routine during ${bestWindowLabel}; wear a fitted N95 mask for peak-hour travel.`,
      lowEmissionTip: isHi
        ? profile.commuteMode === 'car'
          ? 'अकेले कार के बजाय मेट्रो या कारपूल चुनें।'
          : 'छोटे कामों के लिए स्वच्छ समय में पैदल या साइकिल से जाएं।'
        : profile.commuteMode === 'car'
          ? 'Swap solo car travel for Metro or a 3-person carpool today.'
          : 'Walk or cycle short errands inside the clean window instead of taking a motor vehicle.',
      why: isHi
        ? `स्वच्छ समय में PM2.5 कम रहता है, जिससे ${String(memberLedger?.breathedLessUg ?? 0)} µg PM2.5 की बचत होती है।`
        : `Moving activity out of peak hours cuts inhaled PM2.5 by ${String(memberLedger?.breathedLessUg ?? 0)} µg.`,
      breathedLessUg: memberLedger?.breathedLessUg ?? 0,
    };
  });

  const indoorHacks: IndoorHack[] = [
    {
      id: 'hack-windows',
      hack: isHi
        ? `पीक स्मॉग (${worstHourLabel}) में खिड़कियां बंद रखें और ${bestWindowLabel} में 15 मिनट क्रॉस-वेंटिलेशन करें।`
        : `Keep windows shut during peak smog (${worstHourLabel}) and air out briefly during ${bestWindowLabel}.`,
      why: isHi
        ? `खिड़कियां बंद करने से घर के अंदर PM2.5 लगभग ${String(indoorClosed.indoorPm25)} µg/m³ तक सीमित रहता है।`
        : `Sealing infiltration drops steady-state indoor PM2.5 to ~${String(indoorClosed.indoorPm25)} µg/m³ (a ${String(indoorClosed.reductionPercent)}% reduction).`,
      estimatedIndoorPm25: indoorClosed.indoorPm25,
    },
    {
      id: 'hack-cooking',
      hack: isHi
        ? 'तड़का/तलने के बजाय प्रेशर कुकर या इंडक्शन का उपयोग करें और एग्जॉस्ट फैन चलाएं।'
        : 'Use a pressure cooker or induction cooktop for one meal and run the kitchen exhaust while tempering.',
      why: isHi
        ? 'बिना एग्जॉस्ट के तलने से कमरे में 18,000 µg/घंटा तक PM2.5 बढ़ सकता है।'
        : 'Unvented frying adds ~18,000 µg/h indoors, whereas covered pressure cooking cuts indoor particulate buildup.',
      estimatedIndoorPm25: indoorClosed.indoorPm25,
    },
    {
      id: 'hack-incense',
      hack: isHi
        ? 'घर के अंदर अगरबत्ती, धूप या मच्छर कॉइल न जलाएं; दीया हवादार बालकनी में रखें।'
        : 'Skip indoor incense sticks and mosquito coils; keep diyas near a vented balcony or entrance.',
      why: isHi
        ? 'बंद कमरे में धूप/कॉइल का धुआं बाहर की धुंध से भी ज़्यादा PM2.5 बना सकता है।'
        : 'Closed-room incense and coils emit 12,000–25,000 µg/h of fine smoke right where family members breathe.',
      estimatedIndoorPm25: indoorClosed.indoorPm25,
    },
  ];

  const swaps: PlanSwap[] = ledger.swapsBreakdown.map((swap) => ({
    swapId: swap.swapId,
    why: swap.basis,
    emittedLessG: swap.emittedLessG,
    emittedLessKgCO2: swap.emittedLessKgCO2,
    breathedLessUg: swap.breathedLessUg,
  }));

  return {
    source: 'fallback',
    language: profile.language,
    summary,
    items,
    indoorHacks,
    swaps,
    aqi,
    cleanWindows,
    ledger,
  };
}
