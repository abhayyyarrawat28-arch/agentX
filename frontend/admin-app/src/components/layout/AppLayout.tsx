import { useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/authStore';

const SEARCH_ITEMS = [
  { label: 'Dashboard', description: 'Operations summary', to: '/dashboard', keywords: ['dashboard', 'operations', 'summary'] },
  { label: 'Agent Performance', description: 'Review agent performance', to: '/agents', keywords: ['agents', 'performance', 'agent'] },
  { label: 'Registrations', description: 'Pending approvals and reviews', to: '/registrations', keywords: ['registrations', 'approval', 'pending'] },
  { label: 'User Management', description: 'Create and manage users', to: '/users', keywords: ['users', 'user management', 'access'] },
  { label: 'Products', description: 'Manage product definitions', to: '/products', keywords: ['products', 'inventory', 'commission'] },
  { label: 'Commission Config', description: 'Plan-wise commissions, bonuses, and thresholds', to: '/config', keywords: ['config', 'commission', 'threshold', 'plan', 'renewal'] },
  { label: 'Audit Logs', description: 'Review system activity', to: '/logs', keywords: ['logs', 'audit', 'activity'] },
];

const HELP_LINKS = [
  { label: 'Pending Registrations', to: '/registrations' },
  { label: 'Agent Performance', to: '/agents' },
  { label: 'Commission Config', to: '/config' },
  { label: 'Audit Logs', to: '/logs' },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return SEARCH_ITEMS;
    return SEARCH_ITEMS.filter(item =>
      item.label.toLowerCase().includes(normalized) ||
      item.description.toLowerCase().includes(normalized) ||
      item.keywords.some(keyword => keyword.includes(normalized))
    );
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
              <h2 className="text-base font-bold">Canara HSBC Life</h2>
              <p className="brand-caption">Admin Control Center</p>
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
                  placeholder="Search users, agents, registrations, products"
                  aria-label="Search admin sections"
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
              onClick={() => openItem('/registrations')}
              aria-label="Open pending approvals"
              title="Open pending approvals"
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
                aria-label="Open admin quick links"
                title="Open admin quick links"
                aria-expanded={helpOpen}
              >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
                <circle cx="12" cy="12" r="8" />
                <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.75-2.5 2.1-2.5 4" />
                <path d="M12 17h.01" />
              </svg>
              </button>
              {helpOpen && (
                <div className="topbar-popover" role="dialog" aria-label="Admin quick links">
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
              <p className="text-sm font-semibold text-white leading-none">{user?.name || 'Admin'}</p>
              <p className="text-[11px] text-white/75 mt-1">{user?.employeeId || 'Admin'}</p>
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
