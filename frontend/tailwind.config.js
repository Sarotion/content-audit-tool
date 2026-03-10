/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#FFFFFF',
        surface: '#F7F7FE',         /* matches getfound.cz --gray-100 */
        card: '#FFFFFF',
        border: '#E2E2F0',          /* soft lavender-tinted border */
        'border-mid': '#9CA3AF',
        accent: '#B72C6A',          /* getfound.cz primary magenta */
        'accent-hover': '#9B1D55',  /* darker magenta on hover */
        'accent-light': '#FDF2F8',  /* very light pink tint */
        muted: '#6B7280',
        'text-primary': '#14143C',  /* getfound.cz gray-900 navy */
        'text-secondary': '#4B4B6B',
      },
      fontFamily: {
        /* Inter – closest to Bootstrap 5 system-ui stack, used on getfound.cz */
        display: ['Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontWeight: {
        300: '300',
        400: '400',
        500: '500',
        600: '600',
        700: '700',
      }
    }
  },
  plugins: []
}
