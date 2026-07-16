/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14213D',        // متن اصلی / تیره‌ترین رنگ برند
        navy: {
          50: '#EEF3F8',
          100: '#D7E3EF',
          400: '#3C6E9E',
          600: '#1F4B73',
          700: '#163A5A',
          900: '#0F2A42',
        },
        amber: {
          100: '#FBEACC',
          400: '#E2A63B',
          600: '#C4881F',
        },
        status: {
          pending: '#8A7A56',
          confirmed: '#3C6E9E',
          processing: '#7C5CBF',
          shipping: '#C4881F',
          delivered: '#2E7D5B',
          cancelled: '#C1443D',
          quote: '#0E7C6B',
        },
        canvas: '#F5F7FA',
      },
      fontFamily: {
        display: ['Vazirmatn', 'sans-serif'],
        body: ['Vazirmatn', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
