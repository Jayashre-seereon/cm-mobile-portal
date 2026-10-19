/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: '#C11E38',
        'brand-deep': '#220B34',
        ink: '#262126',
        muted: '#746E77',
        line: '#E8DFDA',
        paper: '#FBF7F3',
        card: '#FFFFFF',
        surface: '#F6EFEB',
        success: '#2F9367',
        danger: '#D04F4F',
        info: '#3774D8',
        amber: '#CB9C48',
      },
      borderRadius: {
        '4xl': '32px',
      },
      boxShadow: {
        card: '0px 10px 20px rgba(90, 59, 31, 0.08)',
      },
    },
  },
  plugins: [],
};
