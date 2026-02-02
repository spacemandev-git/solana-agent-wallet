# Solana Agent Wallet

A Solana wallet browser extension built for AI agents. It injects a sidebar with full ARIA labels into every page so agent automation tools like [agent-browser](https://github.com/vercel-labs/agent-browser) can see and interact with all wallet controls via the accessibility tree.

## What is this?

This is an **agent skill** — a self-contained package that gives an AI agent the ability to manage a Solana wallet, connect to dApps, and sign transactions, all through a headless browser.

The skill file ([`skills/solana-wallet/SKILL.md`](skills/solana-wallet/SKILL.md)) contains everything an AI agent needs to:

1. Install `agent-browser` and the wallet extension
2. Create a wallet with a generated mnemonic
3. **Persist the wallet** across browser restarts (profile backup + credential storage)
4. **Restore a wallet from mnemonic** if all data is lost
5. Connect to any Solana dApp (Jupiter, Raydium, Marinade, etc.)
6. Approve or reject connection and transaction requests
7. Switch networks (Mainnet, Devnet, Testnet, Localnet)
8. Unlock the vault after browser restarts

## Using the Skill

Point your AI agent at the skill file:

```
skills/solana-wallet/SKILL.md
```

The SKILL.md is also included in every [GitHub release](https://github.com/spacemandev-git/solana-agent-wallet/releases) alongside the unpacked extension zip.

### Quick manual setup

```bash
# 1. Install agent-browser
npm install -g agent-browser
agent-browser install

# 2. Download the wallet extension
curl -L -o agent-ext.zip \
  https://github.com/spacemandev-git/solana-agent-wallet/releases/latest/download/agent-ext.zip
mkdir -p /tmp/agent-ext
unzip -o agent-ext.zip -d /tmp/agent-ext
export AGENT_BROWSER_EXTENSIONS="/tmp/agent-ext"

# 3. Launch browser and set up wallet
agent-browser open about:blank
agent-browser wait 2000
SETUP_URL=$(agent-browser eval "document.querySelector('meta[name=samui-agent-wallet-setup]')?.content")
agent-browser open "$SETUP_URL"
```

From there, use `agent-browser snapshot -i` to discover interactive elements and fill the setup form. See the full [SKILL.md](skills/solana-wallet/SKILL.md) for detailed workflows.

### Important: Wallet persistence

The browser profile is stored in a **temp directory** that can be wiped on reboot. The skill instructs the agent to:

- Save the **mnemonic** and **password** to `~/.solana-agent-wallet/credentials.env`
- Back up the **browser profile** to `~/.solana-agent-wallet/browser-profile/`
- Restore the profile before each browser launch

If all data is lost, the wallet can be recreated from the saved mnemonic (same mnemonic = same keypair = same address). See the [SKILL.md](skills/solana-wallet/SKILL.md) "CRITICAL: Wallet Persistence" section for full details.

## Architecture

```
solana-agent-wallet/
├── apps/agent-ext/          # WXT browser extension (Chrome MV3)
├── packages/vault/          # AES-256-GCM encryption with PBKDF2 key derivation
├── packages/agent-ui/       # Shadow DOM sidebar with ARIA labels
├── packages/background/     # Extension messaging, services, DB
├── packages/wallet-standard/ # Solana Wallet Standard registration
├── packages/db/             # IndexedDB storage (Dexie)
├── packages/env/            # Environment configuration
├── packages/keypair/        # Key derivation from mnemonic
└── skills/solana-wallet/    # Agent skill (SKILL.md + references + templates)
```

Key design decisions:

- **Shadow DOM sidebar** — injected into every page, isolated from host page styles, visible to Playwright's accessibility tree
- **ARIA labels on all controls** — agents discover elements via `agent-browser snapshot -i` without needing CSS selectors
- **Vault encryption** — secret keys encrypted at rest with AES-256-GCM (PBKDF2, 600k iterations). Password held in `chrome.storage.session` (memory-only)
- **No popup windows** — signing requests appear in the sidebar so headless automation works without window switching

## Building from Source

```bash
git clone https://github.com/spacemandev-git/solana-agent-wallet
cd solana-agent-wallet
bun install
bun run build --filter=agent-ext
```

The unpacked extension is at `apps/agent-ext/.output/chrome-mv3`.

## Releases

Pre-built extensions and the SKILL.md are published to [GitHub Releases](https://github.com/spacemandev-git/solana-agent-wallet/releases) on every `agent-ext-v*` tag.

## License

Based on [Samui Wallet](https://samui.build) by [beeman](https://x.com/beeman_nl) and [tobeycodes](https://x.com/tobeycodes).
