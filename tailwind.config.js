/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef6ff',
          100: '#d9ebff',
          500: '#5477ff',
          600: '#335cf4',
          700: '#2140d0',
        },
      },
      boxShadow: {
        glow: '0 12px 38px rgba(84, 119, 255, 0.24)',
      },
    },
  },
  plugins: [],
};
