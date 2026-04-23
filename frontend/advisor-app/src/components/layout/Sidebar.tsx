import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/calculator/forward', label: 'Forward Calculator', icon: 'calculator' },
  { to: '/calculator/reverse', label: 'Reverse Planner', icon: 'trend' },
  { to: '/calculator/mdrt', label: 'MDRT Tracker', icon: 'target' },
  { to: '/calculator/activity', label: 'Activity Predictor', icon: 'activity' },
  { to: '/policies', label: 'My Policies', icon: 'document' },
  { to: '/customers', label: 'My Customers', icon: 'users' },
];

function NavIcon({ name }: { name: string }) {
  const commonProps = {
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  } as const;

  switch (name) {
    case 'dashboard':
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="4" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="4" width="7" height="5" rx="1.5" />
          <rect x="13.5" y="12" width="7" height="8" rx="1.5" />
          <rect x="3.5" y="14" width="7" height="6" rx="1.5" />
        </svg>
      );
    case 'calculator':
      return (
        <svg {...commonProps}>
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <path d="M8 7.5h8" />
          <path d="M8 11.5h2" />
          <path d="M12 11.5h2" />
          <path d="M16 11.5h0" />
          <path d="M8 15.5h2" />
          <path d="M12 15.5h2" />
          <path d="M16 15.5h0" />
        </svg>
      );
    case 'trend':
      return (
        <svg {...commonProps}>
          <path d="M4 18h16" />
          <path d="M6 15.5 10 11l3 3 5-6" />
          <path d="M18 8h-3V5" />
        </svg>
      );
    case 'target':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 4v3" />
          <path d="M20 12h-3" />
        </svg>
      );
    case 'activity':
      return (
        <svg {...commonProps}>
          <path d="M5 18V9" />
          <path d="M12 18V5" />
          <path d="M19 18v-7" />
        </svg>
      );
    case 'document':
      return (
        <svg {...commonProps}>
          <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z" />
          <path d="M14 3.5V8h4" />
          <path d="M8.5 12h7" />
          <path d="M8.5 15.5h7" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <path d="M4 18v-7.5A2.5 2.5 0 0 1 6.5 8h11A2.5 2.5 0 0 1 20 10.5V18" />
          <circle cx="9" cy="6" r="2" />
          <circle cx="15" cy="6" r="2" />
        </svg>
      );
  }
}

export default function Sidebar() {
  const location = useLocation();
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const activeTab = navRef.current?.querySelector('.management-tab-active');
    if (activeTab instanceof HTMLElement) {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
  }, [location.pathname]);

  return (
    <nav className="management-tabs" aria-label="Agent sections">
      <div ref={navRef} className="management-tabs-scroll">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `management-tab ${isActive ? 'management-tab-active' : ''}`
            }
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
