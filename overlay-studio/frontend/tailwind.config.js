/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        /**
         * Poptek brand — `poptek-rail` / `poptek-action` avoid `accent` naming quirks in Tailwind.
         * Rail #214ABC (darker) · CTAs #224BBD (lighter)
         */
        poptek: {
          rail: '#214ABC',
          action: '#224BBD',
        },
        accent: '#224BBD',
        primary: '#224BBD',
        secondary: '#214ABC',
        sidebar: '#214ABC',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
