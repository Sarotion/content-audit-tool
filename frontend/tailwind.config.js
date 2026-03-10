/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#FFFFFF',
        surface: '#F7F7FE',
        card: '#FFFFFF',
        border: '#E9E9F9',
        'border-mid': '#D1D1E8',
        accent: '#B72C6A',
        'accent-hover': '#9B1E56',
        'accent-light': '#F9EDF3',
        yellow: '#F5D127',
        muted: '#83839C',
        'text-primary': '#14143C',
        'text-secondary': '#4A4A6A',
      },
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      }
    }
  },
  plugins: []
}
