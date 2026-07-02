/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FBFAF7',
        sakura: '#E8B4B8',
        sage: '#A8C3A0',
        terra: '#D98E73',
        ink: '#3A3733',
        muted: '#8B857C',
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      transitionTimingFunction: {
        koneko: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      boxShadow: {
        soft: '0 8px 30px rgba(58,55,51,0.06)',
      },
    },
  },
  plugins: [],
}
