/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        /** Brand primary — buttons, links, charts */
        accent: '#224BBD',
        primary: '#224BBD',
        /** Sidebar nav selection, secondary chrome */
        secondary: '#214ABC',
        sidebar: '#224BBD',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
