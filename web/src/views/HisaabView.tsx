import type { DailyLedger } from '@hawahisaab/engine';
import { useI18n } from '../i18n/useI18n.js';

interface HisaabViewProps {
  ledger: DailyLedger;
}

export default function HisaabView({ ledger }: HisaabViewProps) {
  const { t, language } = useI18n();

  return (
    <section className="card" aria-labelledby="hisaab-heading">
      <h2 id="hisaab-heading">{t.hisaab.title}</h2>
      <p className="meta-line">{t.hisaab.subtitle}</p>

      <div className="hisaab-columns">
        <div className="ledger-column">
          <h3>{t.hisaab.breathedColTitle}</h3>

          <div className="ledger-total-box">
            <span className="metric-label">{t.hisaab.householdTotal}</span>
            <strong className="metric-value" data-testid="hisaab-breathed-total">
              {String(ledger.totalBreathedLessUg)} µg PM2.5
            </strong>
          </div>

          <h4>{t.hisaab.perMember}</h4>
          <ul className="ledger-list">
            {ledger.members.map((member) => (
              <li key={member.memberId} className="ledger-item">
                <div className="card-header-row">
                  <strong>
                    {member.name} ({t.ageGroups[member.ageGroup]})
                  </strong>
                  <span className="saved-pill">−{String(member.breathedLessUg)} µg</span>
                </div>
                <p className="meta-line">
                  {t.hisaab.baselineLabel}: {String(member.baselineDoseUg)} µg →{' '}
                  {t.hisaab.plannedLabel}: {String(member.plannedDoseUg)} µg
                </p>
                <details className="basis-details">
                  <summary>{t.hisaab.whyThis}</summary>
                  <p className="meta-line">{member.basis}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>

        <div className="ledger-column">
          <h3>{t.hisaab.emittedColTitle}</h3>

          <div className="ledger-total-box">
            <span className="metric-label">{t.hisaab.householdTotal}</span>
            <strong className="metric-value" data-testid="hisaab-emitted-total">
              {String(ledger.emittedLessG)} g PM2.5
            </strong>
            <strong className="metric-subvalue">
              {String(ledger.emittedLessKgCO2)} kg CO₂
            </strong>
            <details className="basis-details">
              <summary>{t.hisaab.whyThis}</summary>
              <p className="meta-line">{ledger.emittedBasis}</p>
            </details>
          </div>

          <h4>{t.hisaab.activeSwapsHeading}</h4>
          {ledger.swapsBreakdown.length === 0 ? (
            <p className="meta-line">{t.hisaab.noSwapsSelected}</p>
          ) : (
            <ul className="ledger-list">
              {ledger.swapsBreakdown.map((swap) => (
                <li key={swap.swapId} className="ledger-item">
                  <div className="card-header-row">
                    <strong>{language === 'hi' ? swap.titleHi : swap.titleEn}</strong>
                    <span className="saved-pill">
                      −{String(swap.emittedLessG)} g · −{String(swap.emittedLessKgCO2)} kg
                      CO₂
                    </span>
                  </div>
                  <details className="basis-details">
                    <summary>{t.hisaab.whyThis}</summary>
                    <p className="meta-line">{swap.basis}</p>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
