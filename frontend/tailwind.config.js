/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#FFFFFF',
        surface: '#F3F4F6',
        card: '#FFFFFF',
        border: '#D1D5DB',        /* was #E5E7EB – more visible card outlines */
        'border-mid': '#9CA3AF',  /* was #D1D5DB – stronger strokes where needed */
        accent: '#1B6840',
        'accent-hover': '#145433',
        'accent-light': '#ECFDF5',
        muted: '#6B7280',         /* was #9CA3AF – WCAG AA compliant (5.74:1 on white) */
        'text-primary': '#111827',
        'text-secondary': '#374151', /* was #6B7280 – stronger secondary text (~10:1) */
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
