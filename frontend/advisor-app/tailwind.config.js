/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#f97316', light: '#fff1e6', container: '#d75d09', soft: '#ffd7bc' },
        amber: { DEFAULT: '#f6a43a' },
        success: { DEFAULT: '#4e9b6c' },
        error: { DEFAULT: '#d94141', container: '#fff0ef' },
        surface: { DEFAULT: '#fffdfb', container: '#fbf3eb', 'container-low': '#f7efe7', variant: '#fcf4ed' },
        outline: { DEFAULT: '#6f6257' },
        ink: { DEFAULT: '#1f1a16', muted: '#6f6257', soft: '#9d8f81' },
      },
      boxShadow: {
        card: '0 22px 44px -34px rgba(72, 41, 10, 0.34)',
      },
    },
  },
  plugins: [],
};
