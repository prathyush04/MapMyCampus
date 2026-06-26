/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
        'soft': '0 10px 40px -10px rgba(0,0,0,0.08)',
      },
      colors: {
        campus: {
          blue:   '#1d4ed8',
          green:  '#15803d',
          amber:  '#b45309',
          red:    '#b91c1c',
          purple: '#7c3aed',
          teal:   '#0f766e',
        },
      },
    },
  },
  plugins: [],
};
