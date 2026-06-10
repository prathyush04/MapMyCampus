/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
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
