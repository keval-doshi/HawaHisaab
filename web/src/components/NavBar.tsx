import type { TabId } from '../i18n/types.js';
import { useI18n } from '../i18n/useI18n.js';

interface NavBarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

const TABS: readonly TabId[] = ['today', 'lab', 'swaps', 'hisaab', 'mohalla'];

export function NavBar({ activeTab, onSelectTab }: NavBarProps) {
  const { t } = useI18n();

  return (
    <nav className="nav-tabs" aria-label="Main navigation">
      {TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            className={`nav-tab ${isActive ? 'nav-tab-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              onSelectTab(tab);
            }}
          >
            {t.nav[tab]}
          </button>
        );
      })}
    </nav>
  );
}
