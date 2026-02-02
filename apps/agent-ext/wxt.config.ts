import { defineConfig } from 'wxt'

export default defineConfig({
  vite: () => ({
    build: {
      target: 'esnext',
    },
    esbuild: {
      charset: 'ascii',
    },
  }),
  manifest: {
    name: 'Samui Agent Wallet',
    permissions: ['storage'],
    web_accessible_resources: [
      {
        matches: ['*://*/*'],
        resources: ['injected.js'],
      },
    ],
  },
  modules: ['@wxt-dev/auto-icons', '@wxt-dev/module-react'],
  react: {
    vite: {
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    },
  },
  srcDir: 'src',
})
