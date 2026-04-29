/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gov-primary': '#b7202e',
        'gov-header': '#c8303f',
        'gov-bg': '#F3F4E5',
        'gov-success': '#059669',
        'gov-blue': '#1e3a8a',
        'gov-alert': '#dc2626',
        'gov-teal': '#0891b2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['monospace'],
      },
      boxShadow: {
        'gov-hover': '0 4px 12px rgba(183, 32, 46, 0.3)',
      }
    },
  },
  plugins: [],
}

