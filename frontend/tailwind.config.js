/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#FFFFFF',
        surface: '#F9FAFB',
        card: '#FFFFFF',
        border: '#E5E7EB',
        'border-mid': '#D1D5DB',
        accent: '#1B6840',
        'accent-hover': '#145433',
        'accent-light': '#ECFDF5',
        muted: '#9CA3AF',
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
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
