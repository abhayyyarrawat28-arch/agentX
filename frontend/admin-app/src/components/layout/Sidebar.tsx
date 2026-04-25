import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { queryKeys } from '../../services/queryKeys';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/agents', label: 'Agent Performance', icon: 'briefcase' },
  { to: '/registrations', label: 'Registrations', icon: 'clipboard' },
  { to: '/users', label: 'User Management', icon: 'users' },
  { to: '/products', label: 'Products', icon: 'box' },
  { to: '/config', label: 'Commission Config', icon: 'settings' },
  { to: '/logs', label: 'Audit Logs', icon: 'document' },
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
    case 'briefcase':
      return (
        <svg {...commonProps}>
          <path d="M8.5 6.5V5A1.5 1.5 0 0 1 10 3.5h4A1.5 1.5 0 0 1 15.5 5v1.5" />
          <rect x="4" y="6.5" width="16" height="11" rx="2" />
          <path d="M4 11.5h16" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg {...commonProps}>
          <rect x="6" y="4.5" width="12" height="16" rx="2" />
          <path d="M9 4.5h6v3H9z" />
          <path d="M9 11h6" />
          <path d="M9 15h4" />
        </svg>
      );
    case 'users':
      return (
        <svg {...commonProps}>
          <path d="M4 18v-1.5A3.5 3.5 0 0 1 7.5 13h3A3.5 3.5 0 0 1 14 16.5V18" />
          <circle cx="9" cy="7" r="2.5" />
          <path d="M14.5 18v-1a3 3 0 0 1 3-3h.5A3 3 0 0 1 21 17v1" />
          <circle cx="17.5" cy="8" r="2" />
        </svg>
      );
    case 'box':
      return (
        <svg {...commonProps}>
          <path d="m4.5 8 7.5-4 7.5 4-7.5 4-7.5-4Z" />
          <path d="M4.5 8v8l7.5 4 7.5-4V8" />
          <path d="M12 12v8" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4.5v2" />
          <path d="M12 17.5v2" />
          <path d="M4.5 12h2" />
          <path d="M17.5 12h2" />
          <path d="m6.7 6.7 1.4 1.4" />
          <path d="m15.9 15.9 1.4 1.4" />
          <path d="m17.3 6.7-1.4 1.4" />
          <path d="m8.1 15.9-1.4 1.4" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z" />
          <path d="M14 3.5V8h4" />
          <path d="M8.5 12h7" />
          <path d="M8.5 15.5h7" />
        </svg>
      );
  }
}

export default function Sidebar() {
  const location = useLocation();
  const navRef = useRef<HTMLDivElement | null>(null);

  const { data: pendingCount = 0 } = useQuery({
    queryKey: queryKeys.adminDashboard,
    queryFn: async () => {
      const res = await api.get('/admin/dashboard');
      return res.data.data;
    },
    staleTime: 2 * 60 * 1000,
    select: (data: any) => Number(data?.pendingRegistrations || 0),
  });

  useEffect(() => {
    const activeTab = navRef.current?.querySelector('.management-tab-active');
    if (activeTab instanceof HTMLElement) {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
  }, [location.pathname]);

  return (
    <nav className="management-tabs" aria-label="Admin sections">
      <div ref={navRef} className="management-tabs-scroll">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `management-tab ${isActive ? 'management-tab-active' : ''}`}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
            {item.to === '/registrations' && pendingCount > 0 && (
              <span className="inline-flex min-w-[1.5rem] justify-center rounded-full bg-[#1f2838] px-2 py-0.5 text-[11px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
