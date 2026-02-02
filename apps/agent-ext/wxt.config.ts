import { defineConfig } from 'wxt'

export default defineConfig({
  manifest: {
    content_scripts: [
      {
        js: ['content-ui.js'],
        matches: ['<all_urls>'],
      },
    ],
    name: 'Samui Agent Wallet',
    permissions: ['storage'],
    web_accessible_resources: [
      {
        matches: ['*://*/*'],
        resources: ['injected.js', 'content-ui.js'],
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
