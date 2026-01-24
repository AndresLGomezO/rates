// PostCSS config for monorepo
// Plugins are installed at workspace root and should be hoisted by pnpm
module.exports = {
  plugins: {
    tailwindcss: require('tailwindcss'),
    autoprefixer: require('autoprefixer'),
  },
};
