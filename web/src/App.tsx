import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  computeCpcbAqi,
  computeDailyLedger,
  evaluateHouseholdSwaps,
  findCleanWindows,
  type AirForecastResponse,
  type FamilyProfile,
  type SmogDayPlan,
  type SwapId,
} from '@hawahisaab/engine';
import { fetchAirForecast, requestSmogPlan } from './api/client.js';
import { NavBar } from './components/NavBar.js';
import type { Language, TabId } from './i18n/types.js';
import { I18nProvider, useI18n } from './i18n/useI18n.js';
import {
  loadSavedLanguage,
  loadSavedProfile,
  loadSelectedSwaps,
  saveLanguage,
  saveProfile,
  saveSelectedSwaps,
} from './state/storage.js';

const OnboardingView = lazy(() => import('./views/OnboardingView.js'));
const TodayView = lazy(() => import('./views/TodayView.js'));
const IndoorLabView = lazy(() => import('./views/IndoorLabView.js'));
const SwapsView = lazy(() => import('./views/SwapsView.js'));
const HisaabView = lazy(() => import('./views/HisaabView.js'));
const MohallaView = lazy(() => import('./views/MohallaView.js'));

function AppContent({
  language,
  onToggleLanguage,
}: {
  language: Language;
  onToggleLanguage: () => void;
}) {
  const { t } = useI18n();
  const [profile, setProfile] = useState<FamilyProfile | null>(() => loadSavedProfile());
  const [editingProfile, setEditingProfile] = useState<boolean>(
    () => loadSavedProfile() === null,
  );
  const [activeTab, setActiveTab] = useState<TabId>('today');

  const [forecast, setForecast] = useState<AirForecastResponse | null>(null);
  const [plan, setPlan] = useState<SmogDayPlan | null>(null);
  const [loadingAir, setLoadingAir] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planNonce, setPlanNonce] = useState(0);

  const [selectedSwapIds, setSelectedSwapIds] = useState<SwapId[]>(
    () => loadSelectedSwaps() ?? [],
  );

  // Sync profile language when language toggle changes
  useEffect(() => {
    setProfile((prev) => {
      if (!prev || prev.language === language) return prev;
      const updated = { ...prev, language };
      saveProfile(updated);
      return updated;
    });
  }, [language]);

  // Fetch air forecast whenever profile location changes
  const lat = profile?.location.lat;
  const lon = profile?.location.lon;
  useEffect(() => {
    if (lat === undefined || lon === undefined) return;

    let cancelled = false;
    setLoadingAir(true);
    setError(null);

    void fetchAirForecast(lat, lon)
      .then((data) => {
        if (!cancelled) {
          setForecast(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setForecast(null);
          setError(err instanceof Error ? err.message : 'Unable to fetch air forecast.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAir(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  const cleanWindows = useMemo(
    () => (forecast ? findCleanWindows(forecast.hourly) : null),
    [forecast],
  );

  const aqi = useMemo(
    () =>
      forecast ? computeCpcbAqi(forecast.current.pm2_5, forecast.current.pm10) : null,
    [forecast],
  );

  // Initialize default applicable swaps if user has not customized them yet
  useEffect(() => {
    if (!profile || !forecast || selectedSwapIds.length > 0) return;
    if (loadSelectedSwaps() !== null) return;
    const defaults = evaluateHouseholdSwaps(profile, forecast.current.pm2_5 ?? 120)
      .filter((s) => s.applicable)
      .slice(0, 4)
      .map((s) => s.swapId);
    setSelectedSwapIds(defaults);
    saveSelectedSwaps(defaults);
  }, [profile, forecast, selectedSwapIds.length]);

  // Fetch Smog Day Plan once when profile + forecast + cleanWindows are ready
  useEffect(() => {
    if (!profile || !forecast || !cleanWindows || editingProfile) return;

    let cancelled = false;
    setLoadingPlan(true);
    setError(null);

    void requestSmogPlan(profile, forecast, cleanWindows)
      .then((result) => {
        if (!cancelled) {
          setPlan(result);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to generate plan.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPlan(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profile, forecast, cleanWindows, editingProfile, planNonce]);

  const liveLedger = useMemo(() => {
    if (!profile || !forecast) {
      return plan?.ledger ?? null;
    }
    return computeDailyLedger(profile, forecast, selectedSwapIds);
  }, [profile, forecast, selectedSwapIds, plan]);

  const handleSaveProfile = useCallback((nextProfile: FamilyProfile) => {
    saveProfile(nextProfile);
    setProfile(nextProfile);
    setEditingProfile(false);
    setActiveTab('today');
    setPlan(null);
    const defaultSwaps = evaluateHouseholdSwaps(nextProfile, 150)
      .filter((s) => s.applicable)
      .slice(0, 4)
      .map((s) => s.swapId);
    setSelectedSwapIds(defaultSwaps);
    saveSelectedSwaps(defaultSwaps);
  }, []);

  const handleToggleSwap = useCallback((swapId: SwapId) => {
    setSelectedSwapIds((prev) => {
      const next = prev.includes(swapId)
        ? prev.filter((id) => id !== swapId)
        : [...prev, swapId];
      saveSelectedSwaps(next);
      return next;
    });
  }, []);

  const outdoorPm25 = forecast?.current.pm2_5 ?? 120;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t.skipToContent}
      </a>

      <header className="app-header">
        <div className="brand-row">
          <h1 className="app-title">{t.appName}</h1>
          <div className="header-actions">
            {profile && !editingProfile ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditingProfile(true);
                }}
              >
                {t.editProfile}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-label={t.langToggleLabel}
              onClick={onToggleLanguage}
            >
              {t.switchToLang}
            </button>
          </div>
        </div>
        <p className="app-subtitle">{t.tagline}</p>
      </header>

      {profile && !editingProfile ? (
        <NavBar activeTab={activeTab} onSelectTab={setActiveTab} />
      ) : null}

      <main id="main-content" tabIndex={-1}>
        <Suspense
          fallback={
            <section className="card">
              <p className="meta-line">{t.today.loadingPlan}</p>
            </section>
          }
        >
          {editingProfile || !profile ? (
            <OnboardingView
              initialProfile={profile}
              saving={loadingPlan}
              onSaveProfile={handleSaveProfile}
              onCancel={
                profile
                  ? () => {
                      setEditingProfile(false);
                    }
                  : undefined
              }
            />
          ) : activeTab === 'today' ? (
            <TodayView
              profile={profile}
              forecast={forecast}
              aqi={aqi}
              cleanWindows={cleanWindows}
              plan={plan}
              loadingAir={loadingAir}
              loadingPlan={loadingPlan}
              error={error}
              onRefreshPlan={() => {
                setPlanNonce((n) => n + 1);
              }}
            />
          ) : activeTab === 'lab' ? (
            <IndoorLabView profile={profile} outdoorPm25={outdoorPm25} />
          ) : activeTab === 'swaps' ? (
            <SwapsView
              profile={profile}
              outdoorPm25={outdoorPm25}
              selectedSwapIds={selectedSwapIds}
              onToggleSwap={handleToggleSwap}
            />
          ) : activeTab === 'hisaab' && liveLedger ? (
            <HisaabView ledger={liveLedger} />
          ) : activeTab === 'mohalla' && liveLedger ? (
            <MohallaView
              profile={profile}
              aqi={aqi}
              cleanWindows={cleanWindows}
              ledger={liveLedger}
            />
          ) : (
            <section className="card">
              <p className="meta-line">{t.today.loadingAir}</p>
            </section>
          )}
        </Suspense>
      </main>
    </div>
  );
}

export function App() {
  const [language, setLanguage] = useState<Language>(() => loadSavedLanguage());

  const handleToggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'hi' : 'en';
      saveLanguage(next);
      return next;
    });
  }, []);

  return (
    <I18nProvider language={language} setLanguage={setLanguage}>
      <AppContent language={language} onToggleLanguage={handleToggleLanguage} />
    </I18nProvider>
  );
}
