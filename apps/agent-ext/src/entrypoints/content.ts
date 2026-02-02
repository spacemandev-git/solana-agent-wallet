import { handlers } from '@workspace/background/content'

export default defineContentScript({
  async main() {
    handlers()

    await injectScript('/injected.js', {
      keepInDom: true,
    })

    // Inject meta tag for agent-browser discovery
    const meta = document.createElement('meta')
    meta.name = 'samui-agent-wallet-setup'
    meta.content = browser.runtime.getURL('/setup.html')
    document.head.appendChild(meta)
  },
  matches: ['<all_urls>'],
})
