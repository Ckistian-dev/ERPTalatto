/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    theme: {
      extend: {
        fontFamily: {
          emoji: ['"Segoe UI Emoji"', 'Noto Color Emoji', 'sans-serif'],
        },
      },
    }    
  },
  plugins: [],
}


