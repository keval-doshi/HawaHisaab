import type {
  AirForecastResponse,
  AqiResult,
  CleanWindowsResult,
  FamilyMember,
  FamilyProfile,
  SmogDayPlan,
} from '@hawahisaab/engine';
import { AqiBadge } from '../components/AqiBadge.js';
import { useI18n } from '../i18n/useI18n.js';

interface TodayViewProps {
  profile: FamilyProfile;
  forecast: AirForecastResponse | null;
  aqi: AqiResult | null;
  cleanWindows: CleanWindowsResult | null;
  plan: SmogDayPlan | null;
  loadingAir: boolean;
  loadingPlan: boolean;
  error: string | null;
  onRefreshPlan: () => void;
}

function findMostSensitiveMember(members: FamilyMember[]): FamilyMember | undefined {
  const rank = (m: FamilyMember): number => {
    let score = 0;
    if (m.healthFlags.includes('heart')) score += 10;
    if (m.healthFlags.includes('pregnancy')) score += 9;
    if (m.healthFlags.includes('asthma')) score += 8;
    if (m.ageGroup === 'child_under_5') score += 7;
    if (m.ageGroup === 'elderly') score += 6;
    if (m.ageGroup === 'child_5_12') score += 4;
    return score;
  };
  return [...members].sort((a, b) => rank(b) - rank(a))[0];
}

function formatRange(start: string, end: string): string {
  return `${start.slice(11, 16)}–${end.slice(11, 16)}`;
}

export default function TodayView({
  profile,
  forecast,
  aqi,
  cleanWindows,
  plan,
  loadingAir,
  loadingPlan,
  error,
  onRefreshPlan,
}: TodayViewProps) {
  const { t } = useI18n();
  const sensitiveMember = findMostSensitiveMember(profile.members);

  const sensitiveGuidance = !aqi
    ? ''
    : aqi.aqi > 200
      ? t.today.sensitiveHigh
      : aqi.aqi > 100
        ? t.today.sensitiveModerate
        : t.today.sensitiveGood;

  const cleanHourSet = new Set<string>();
  if (cleanWindows?.best2h) {
    cleanHourSet.add(cleanWindows.best2h.startTime);
    const secondHour = cleanWindows.best2h.startTime.slice(0, 11);
    const h = Number(cleanWindows.best2h.startTime.slice(11, 13)) + 1;
    cleanHourSet.add(`${secondHour}${String(h).padStart(2, '0')}:00`);
  } else if (cleanWindows?.best1h) {
    cleanHourSet.add(cleanWindows.best1h.startTime);
  }

  const worstHourSet = new Set((cleanWindows?.worstHours ?? []).map((w) => w.time));

  const maxForecastPm25 = Math.max(
    60,
    ...(forecast?.hourly.map((p) => p.pm2_5 ?? 0).filter((n) => Number.isFinite(n)) ?? [
      100,
    ]),
  );

  return (
    <div>
      {error ? (
        <p className="status-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="card" aria-labelledby="aqi-card-heading" aria-live="polite">
        <div className="card-header-row">
          <h2 id="aqi-card-heading">{t.today.aqiHeading}</h2>
          <span className="meta-line">{profile.location.label}</span>
        </div>

        {loadingAir ? (
          <p className="meta-line">{t.today.loadingAir}</p>
        ) : aqi && forecast ? (
          <>
            <div className="aqi-hero">
              <div className="aqi-number-block">
                <span className="aqi-value" data-testid="today-aqi-value">
                  {String(aqi.aqi)}
                </span>
                <span className="meta-line">{t.today.aqiLabel}</span>
              </div>
              <AqiBadge band={aqi.band} />
            </div>

            <div className="pill-stats">
              <span className="stat-pill">
                {t.today.pm25Label}:{' '}
                <strong>
                  {forecast.current.pm2_5 !== null
                    ? `${forecast.current.pm2_5.toFixed(1)} µg/m³`
                    : '—'}
                </strong>
              </span>
              <span className="stat-pill">
                {t.today.pm10Label}:{' '}
                <strong>
                  {forecast.current.pm10 !== null
                    ? `${forecast.current.pm10.toFixed(1)} µg/m³`
                    : '—'}
                </strong>
              </span>
              <span className="stat-pill">
                {t.today.dominantLabel}:{' '}
                <strong>{aqi.dominantPollutant.toUpperCase()}</strong>
              </span>
            </div>

            {sensitiveMember ? (
              <div className="callout-box">
                <strong>
                  {t.today.sensitiveTitle}: {sensitiveMember.name} (
                  {t.ageGroups[sensitiveMember.ageGroup]})
                </strong>
                <p>{sensitiveGuidance}</p>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {forecast && cleanWindows ? (
        <section className="card" aria-labelledby="forecast-strip-heading">
          <h2 id="forecast-strip-heading">{t.today.forecastHeading}</h2>

          <div className="window-chips">
            {cleanWindows.best1h ? (
              <div className="window-chip window-chip-clean">
                <span className="chip-kicker">{t.today.best1h}</span>
                <strong>
                  {formatRange(
                    cleanWindows.best1h.startTime,
                    cleanWindows.best1h.endTime,
                  )}
                </strong>
                <span>{String(cleanWindows.best1h.averagePm25)} µg/m³</span>
              </div>
            ) : null}
            {cleanWindows.best2h ? (
              <div className="window-chip window-chip-clean">
                <span className="chip-kicker">{t.today.best2h}</span>
                <strong>
                  {formatRange(
                    cleanWindows.best2h.startTime,
                    cleanWindows.best2h.endTime,
                  )}
                </strong>
                <span>{String(cleanWindows.best2h.averagePm25)} µg/m³</span>
              </div>
            ) : null}
            {cleanWindows.best3h ? (
              <div className="window-chip window-chip-clean">
                <span className="chip-kicker">{t.today.best3h}</span>
                <strong>
                  {formatRange(
                    cleanWindows.best3h.startTime,
                    cleanWindows.best3h.endTime,
                  )}
                </strong>
                <span>{String(cleanWindows.best3h.averagePm25)} µg/m³</span>
              </div>
            ) : null}
            {cleanWindows.worstHours[0] ? (
              <div className="window-chip window-chip-peak">
                <span className="chip-kicker">{t.today.avoidPeak}</span>
                <strong>{cleanWindows.worstHours[0].time.slice(11, 16)}</strong>
                <span>{String(cleanWindows.worstHours[0].pm2_5)} µg/m³</span>
              </div>
            ) : null}
          </div>

          <div className="hourly-strip" role="list" aria-label={t.today.forecastHeading}>
            {forecast.hourly.slice(0, 48).map((point) => {
              const val = point.pm2_5 ?? 0;
              const pct = Math.max(8, Math.round((val / maxForecastPm25) * 100));
              const isClean = cleanHourSet.has(point.time);
              const isWorst = worstHourSet.has(point.time);
              return (
                <div
                  key={point.time}
                  role="listitem"
                  className={`hour-bar-col ${isClean ? 'hour-clean' : ''} ${isWorst ? 'hour-worst' : ''}`}
                  aria-label={`${point.time.slice(5, 16)} PM2.5 ${String(val)} micrograms per cubic meter${isClean ? `, ${t.today.cleanWindowLabel}` : ''}${isWorst ? `, ${t.today.worstHourLabel}` : ''}`}
                >
                  <span className="hour-tag" aria-hidden="true">
                    {isClean ? '★' : isWorst ? '▲' : ''}
                  </span>
                  <div className="hour-bar-track">
                    <div
                      className="hour-bar-fill"
                      style={{ height: `${String(pct)}%` }}
                    />
                  </div>
                  <span className="hour-label">{point.time.slice(11, 13)}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="card" aria-labelledby="plan-timeline-heading">
        <div className="card-header-row">
          <h2 id="plan-timeline-heading">{t.today.planHeading}</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRefreshPlan}
            disabled={loadingPlan}
          >
            {t.today.refreshPlan}
          </button>
        </div>

        {loadingPlan ? (
          <p className="meta-line">{t.today.loadingPlan}</p>
        ) : plan ? (
          <>
            <p className="source-pill" data-testid="plan-source">
              {plan.source === 'gemini' ? t.today.sourceGemini : t.today.sourceFallback}
            </p>
            <p className="plan-summary" data-testid="plan-summary">
              {plan.summary}
            </p>

            <ol className="timeline-list">
              {plan.items.map((item) => (
                <li key={item.id} className="timeline-item">
                  <div className="timeline-meta">
                    <span className="time-pill">{item.time}</span>
                    <strong>{item.member}</strong>
                    {typeof item.breathedLessUg === 'number' ? (
                      <span className="saved-pill">
                        −{String(item.breathedLessUg)} µg {t.today.breathedLessTag}
                      </span>
                    ) : null}
                  </div>
                  <p className="timeline-action">{item.action}</p>
                  <p className="meta-line">
                    <strong>{t.today.tipLabel}:</strong> {item.lowEmissionTip}
                  </p>
                  <p className="meta-line">
                    <strong>{t.today.whyLabel}:</strong> {item.why}
                  </p>
                </li>
              ))}
            </ol>

            <h3>{t.today.indoorHacksHeading}</h3>
            <ul className="hacks-list">
              {plan.indoorHacks.map((hack) => (
                <li key={hack.id} className="hack-item">
                  <p className="timeline-action">{hack.hack}</p>
                  <p className="meta-line">
                    <strong>{t.today.whyLabel}:</strong> {hack.why}
                  </p>
                  {typeof hack.estimatedIndoorPm25 === 'number' ? (
                    <p className="meta-line">
                      {t.today.estIndoorLabel}:{' '}
                      <strong>{String(hack.estimatedIndoorPm25)} µg/m³</strong>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </div>
  );
}
