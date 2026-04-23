import { useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/authStore';

const SEARCH_ITEMS = [
  { label: 'Dashboard', description: 'Performance summary', to: '/dashboard', keywords: ['dashboard', 'performance', 'summary'] },
  { label: 'Forward Calculator', description: 'Project incentive earnings', to: '/calculator/forward', keywords: ['forward', 'calculator', 'income', 'projection'] },
  { label: 'Reverse Planner', description: 'Plan from target income', to: '/calculator/reverse', keywords: ['reverse', 'planner', 'target', 'goal'] },
  { label: 'MDRT Tracker', description: 'Track qualification progress', to: '/calculator/mdrt', keywords: ['mdrt', 'tracker', 'qualification'] },
  { label: 'Activity Predictor', description: 'Map meetings to income', to: '/calculator/activity', keywords: ['activity', 'predictor', 'meetings', 'income'] },
  { label: 'My Policies', description: 'Review policy book', to: '/policies', keywords: ['policies', 'policy', 'book'] },
  { label: 'Record New Sale', description: 'Create policy entries', to: '/policies/create', keywords: ['new sale', 'create policy', 'bulk sale'] },
  { label: 'My Customers', description: 'Manage policy holders', to: '/customers', keywords: ['customers', 'policy holders', 'holders'] },
];

const HELP_LINKS = [
  { label: 'Performance Summary', to: '/dashboard' },
  { label: 'Forward Calculator', to: '/calculator/forward' },
  { label: 'My Policies', to: '/policies' },
  { label: 'My Customers', to: '/customers' },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return SEARCH_ITEMS.slice(0, 6);
    return SEARCH_ITEMS.filter(item =>
      item.label.toLowerCase().includes(normalized) ||
      item.description.toLowerCase().includes(normalized) ||
      item.keywords.some(keyword => keyword.includes(normalized))
    ).slice(0, 6);
  }, [searchQuery]);

  const openItem = (to: string) => {
    setSearchQuery('');
    setSearchOpen(false);
    setHelpOpen(false);
    navigate(to);
  };

  return (
    <div className="app-shell">
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-inner">
          <div className="brand-badge">
            <div className="brand-glyph" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div>
              <h1 className="text-base font-bold">Canara HSBC Life</h1>
              <p className="brand-caption">Agent Incentive Platform</p>
            </div>
          </div>

          <div className="dashboard-search">
            <div className="dashboard-search-shell dashboard-search-interactive">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <circle cx="11" cy="11" r="6" />
                <path d="m20 20-4.2-4.2" />
              </svg>
              <div className="dashboard-search-input-wrap">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && filteredItems[0]) {
                      event.preventDefault();
                      openItem(filteredItems[0].to);
                    }
                    if (event.key === 'Escape') {
                      setSearchQuery('');
                    }
                  }}
                  className="dashboard-search-input"
                  placeholder="Search dashboard, planners, policies, customers"
                  aria-label="Search agent sections"
                />
                {searchOpen && filteredItems.length > 0 && (
                  <div className="dashboard-search-results" role="listbox">
                    {filteredItems.map(item => (
                      <button
                        key={item.to}
                        type="button"
                        className="dashboard-search-result"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          openItem(item.to);
                        }}
                      >
                        <span className="dashboard-search-result-label">{item.label}</span>
                        <span className="dashboard-search-result-description">{item.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="top-icon-button"
              onClick={() => openItem('/policies?status=lapsed')}
              aria-label="Open agent action queue"
              title="Open agent action queue"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
                <path d="M6 8a6 6 0 1 1 12 0v4l1.5 2.5H4.5L6 12.5V8Z" />
                <path d="M10 18.5a2 2 0 0 0 4 0" />
              </svg>
            </button>
            <div className="topbar-popover-wrap">
              <button
                type="button"
                className="top-icon-button"
                onClick={() => setHelpOpen(current => !current)}
                aria-label="Open agent quick links"
                title="Open agent quick links"
                aria-expanded={helpOpen}
              >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
                <circle cx="12" cy="12" r="8" />
                <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.75-2.5 2.1-2.5 4" />
                <path d="M12 17h.01" />
              </svg>
              </button>
              {helpOpen && (
                <div className="topbar-popover" role="dialog" aria-label="Agent quick links">
                  <p className="topbar-popover-title">Quick links</p>
                  {HELP_LINKS.map(link => (
                    <button key={link.to} type="button" className="topbar-popover-link" onClick={() => openItem(link.to)}>
                      {link.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden sm:block text-right mr-1">
              <p className="text-sm font-semibold text-white leading-none">{user?.name || 'Agent'}</p>
              <p className="text-[11px] text-white/75 mt-1">{user?.employeeId || 'Agent'}</p>
            </div>
            <div className="avatar-badge">{(user?.name || 'A').charAt(0).toUpperCase()}</div>
            <button onClick={() => { logout(); navigate('/login'); }} className="topbar-text-button">
              Sign Out
            </button>
          </div>
        </div>

        <div className="dashboard-nav-wrap">
          <Sidebar />
        </div>
      </header>

      <main className="management-page">
        <div className="management-page-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
