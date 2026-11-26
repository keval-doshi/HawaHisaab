import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  computeCpcbAqi,
  computeDailyLedger,
  DEFAULT_OUTDOOR_PM25_UG_M3,
  findCleanWindows,
  type FamilyProfile,
} from '@hawahisaab/engine';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { NavBar } from './components/NavBar.js';
import { useAirForecast } from './hooks/useAirForecast.js';
import { useSelectedSwaps } from './hooks/useSelectedSwaps.js';
import { useSmogPlan } from './hooks/useSmogPlan.js';
import type { Language, TabId } from './i18n/types.js';
import { I18nProvider, useI18n } from './i18n/useI18n.js';
import {
  loadSavedLanguage,
  loadSavedProfile,
  saveLanguage,
  saveProfile,
} from './state/storage.js';

const OnboardingView = lazy(() => import('./views/OnboardingView.js'));
const TodayView = lazy(() => import('./views/TodayView.js'));
const IndoorLabView = lazy(() => import('./views/IndoorLabView.js'));
const SwapsView = lazy(() => import('./views/SwapsView.js'));
const HisaabView = lazy(() => import('./views/HisaabView.js'));
const MohallaView = lazy(() => import('./views/MohallaView.js'));

interface AppHeaderProps {
  showEditProfile: boolean;
  onEditProfile: () => void;
  onToggleLanguage: () => void;
}

function AppHeader({ showEditProfile, onEditProfile, onToggleLanguage }: AppHeaderProps) {
  const { t } = useI18n();
  return (
    <header className="app-header">
      <div className="brand-row">
        <h1 className="app-title">{t.appName}</h1>
        <div className="header-actions">
          {showEditProfile ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onEditProfile}
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
  );
}

function StatusCard({ message }: { message: string }) {
  return (
    <section className="card">
      <p className="meta-line">{message}</p>
    </section>
  );
}

/** Keeps the saved profile's language in sync with the header language toggle. */
function useProfile(language: Language) {
  const [profile, setProfile] = useState<FamilyProfile | null>(() => loadSavedProfile());

  useEffect(() => {
    setProfile((prev) => {
      if (!prev || prev.language === language) return prev;
      const updated = { ...prev, language };
      saveProfile(updated);
      return updated;
    });
  }, [language]);

  const updateProfile = useCallback((next: FamilyProfile) => {
    saveProfile(next);
    setProfile(next);
  }, []);

  return { profile, updateProfile };
}

interface AppContentProps {
  language: Language;
  onToggleLanguage: () => void;
}

function AppContent({ language, onToggleLanguage }: AppContentProps) {
  const { t } = useI18n();
  const { profile, updateProfile } = useProfile(language);
  const [editingProfile, setEditingProfile] = useState(() => profile === null);
  const [activeTab, setActiveTab] = useState<TabId>('today');

  const air = useAirForecast(profile?.location.lat, profile?.location.lon);
  const { forecast } = air;

  const cleanWindows = useMemo(
    () => (forecast ? findCleanWindows(forecast.hourly) : null),
    [forecast],
  );
  const aqi = useMemo(
    () =>
      forecast ? computeCpcbAqi(forecast.current.pm2_5, forecast.current.pm10) : null,
    [forecast],
  );
  const livePm25 = forecast
    ? (forecast.current.pm2_5 ?? DEFAULT_OUTDOOR_PM25_UG_M3)
    : null;
  const outdoorPm25 = livePm25 ?? DEFAULT_OUTDOOR_PM25_UG_M3;

  const smogPlan = useSmogPlan({
    profile,
    forecast,
    cleanWindows,
    enabled: !editingProfile,
  });
  const { selectedSwapIds, toggleSwap, resetToDefaults } = useSelectedSwaps(
    profile,
    livePm25,
  );

  const liveLedger = useMemo(() => {
    if (!profile || !forecast) return smogPlan.plan?.ledger ?? null;
    return computeDailyLedger(profile, forecast, selectedSwapIds);
  }, [profile, forecast, selectedSwapIds, smogPlan.plan]);

  const { clear: clearPlan } = smogPlan;
  const handleSaveProfile = useCallback(
    (nextProfile: FamilyProfile) => {
      updateProfile(nextProfile);
      setEditingProfile(false);
      setActiveTab('today');
      clearPlan();
      resetToDefaults(nextProfile);
    },
    [updateProfile, clearPlan, resetToDefaults],
  );

  const showMainApp = profile !== null && !editingProfile;

  function renderActiveView() {
    if (!showMainApp) {
      return (
        <OnboardingView
          initialProfile={profile}
          saving={smogPlan.loading}
          onSaveProfile={handleSaveProfile}
          onCancel={
            profile
              ? () => {
                  setEditingProfile(false);
                }
              : undefined
          }
        />
      );
    }

    switch (activeTab) {
      case 'today':
        return (
          <TodayView
            profile={profile}
            forecast={forecast}
            aqi={aqi}
            cleanWindows={cleanWindows}
            plan={smogPlan.plan}
            loadingAir={air.loading}
            loadingPlan={smogPlan.loading}
            error={air.error ?? smogPlan.error}
            onRefreshPlan={smogPlan.refresh}
          />
        );
      case 'lab':
        return <IndoorLabView profile={profile} outdoorPm25={outdoorPm25} />;
      case 'swaps':
        return (
          <SwapsView
            profile={profile}
            outdoorPm25={outdoorPm25}
            selectedSwapIds={selectedSwapIds}
            onToggleSwap={toggleSwap}
          />
        );
      case 'hisaab':
        return liveLedger ? (
          <HisaabView ledger={liveLedger} />
        ) : (
          <StatusCard message={t.today.loadingAir} />
        );
      case 'mohalla':
        return liveLedger ? (
          <MohallaView
            profile={profile}
            aqi={aqi}
            cleanWindows={cleanWindows}
            ledger={liveLedger}
          />
        ) : (
          <StatusCard message={t.today.loadingAir} />
        );
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t.skipToContent}
      </a>

      <AppHeader
        showEditProfile={showMainApp}
        onEditProfile={() => {
          setEditingProfile(true);
        }}
        onToggleLanguage={onToggleLanguage}
      />

      {showMainApp ? <NavBar activeTab={activeTab} onSelectTab={setActiveTab} /> : null}

      <main id="main-content" tabIndex={-1}>
        <ErrorBoundary resetKey={showMainApp ? activeTab : 'onboarding'}>
          <Suspense fallback={<StatusCard message={t.today.loadingPlan} />}>
            {renderActiveView()}
          </Suspense>
        </ErrorBoundary>
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
