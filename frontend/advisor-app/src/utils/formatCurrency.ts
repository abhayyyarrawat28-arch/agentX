export const formatCurrency = (v: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export const formatChartCurrency = (v: number): string => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
};

export const CHART_COLORS = {
  primary: '#f97316',
  container: '#ffb06a',
  light: '#ffe6d2',
  amber: '#f6a43a',
  green: '#4e9b6c',
  red: '#d94141',
  outline: '#8f7968',
  surface: '#f7efe7',
};

export const PRODUCT_COLORS: Record<string, string> = {
  'Term Plan': '#f97316',
  'Savings Plan': '#ffbe76',
  'ULIP': '#5d936c',
  'Endowment': '#39455d',
};

export const STATUS_COLORS: Record<string, string> = {
  active: '#4e9b6c',
  lapsed: '#d94141',
  surrendered: '#8f7968',
  qualified: '#4e9b6c',
  'on-track': '#f6a43a',
  'at-risk': '#d94141',
};

export const STATUS_BADGES: Record<string, string> = {
  active: 'badge-active',
  lapsed: 'badge-lapsed',
  surrendered: 'badge-surrendered',
  matured: 'badge-matured',
  cancelled: 'badge-cancelled',
};
