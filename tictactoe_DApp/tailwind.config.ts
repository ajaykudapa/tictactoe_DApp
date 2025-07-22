/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        push: {
          primary: '#D53A94',
          secondary: '#674C9F',
          dark: '#292C3E',
          light: '#F4F5FA',
          border: '#E5E7EB',
          text: {
            primary: '#1E1E1E',
            secondary: '#657795'
          }
        }
      }
    },
  },
  plugins: [],
}