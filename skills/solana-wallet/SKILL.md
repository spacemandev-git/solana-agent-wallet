---
name: solana-wallet
description: Manages a Solana wallet for AI agents to interact with Solana dApps. Creates wallets, signs transactions, connects to dApps via Wallet Standard.
allowed-tools: Bash(agent-browser:*)
---

# Solana Wallet for AI Agents

## Overview

This skill manages the Samui Agent Wallet browser extension, which provides Solana wallet functionality optimized for AI agent interaction. The wallet injects a sidebar into every page with full ARIA labels so `agent-browser snapshot -i` can see and interact with all wallet controls.

## Prerequisites

1. `agent-browser` CLI installed and working (see [Install agent-browser](#install-agent-browser) below)
2. Samui Agent Wallet extension (see [Install the wallet extension](#install-the-wallet-extension) below)

## Install agent-browser

[agent-browser](https://github.com/vercel-labs/agent-browser) is a headless browser automation CLI built for AI agents. It must be installed before using this skill.

### Install via npm

```bash
npm install -g agent-browser
agent-browser install  # Downloads Chromium
```

On Linux, install system dependencies as well:

```bash
agent-browser install --with-deps
```

### Install from source

```bash
git clone https://github.com/vercel-labs/agent-browser
cd agent-browser
pnpm install
pnpm build
pnpm build:native  # Requires Rust (https://rustup.rs)
pnpm link --global
agent-browser install
```

### Verify installation

```bash
agent-browser --version
agent-browser open https://example.com
agent-browser snapshot -i   # Should print interactive elements with @refs
agent-browser close
```

### Key commands reference

```bash
agent-browser open <url>          # Navigate to a page
agent-browser snapshot -i         # Get interactive elements with refs (e.g., @e1, @e2)
agent-browser click @e1           # Click element by ref
agent-browser fill @e2 "text"     # Clear and type into input
agent-browser select @e3 "value"  # Select dropdown option
agent-browser screenshot          # Take a screenshot
agent-browser wait 2000           # Wait milliseconds
agent-browser close               # Close browser
```

Use `--extension <path>` or set `AGENT_BROWSER_EXTENSIONS` to load browser extensions (like this wallet).

## Install the wallet extension

Download the pre-built unpacked extension from GitHub releases:

```bash
# Download the latest release
curl -L -o agent-ext.zip \
  https://github.com/spacemandev-git/solana-agent-wallet/releases/latest/download/agent-ext.zip

# Extract to a directory
mkdir -p /tmp/agent-ext
unzip -o agent-ext.zip -d /tmp/agent-ext

# Set the extension path for agent-browser
export AGENT_BROWSER_EXTENSIONS="/tmp/agent-ext"
```

Releases page: https://github.com/spacemandev-git/solana-agent-wallet/releases

### Build from source (alternative)

```bash
git clone https://github.com/spacemandev-git/solana-agent-wallet
cd solana-agent-wallet
bun install
bun run build --filter=agent-ext
export AGENT_BROWSER_EXTENSIONS="$(pwd)/apps/agent-ext/.output/chrome-mv3"
```

## Quick Start

After completing both install steps above, `AGENT_BROWSER_EXTENSIONS` should already be set.

```bash
# 1. Generate credentials
WALLET_PASSWORD=$(openssl rand -base64 32)
echo "WALLET_PASSWORD=$WALLET_PASSWORD"  # Store securely!

# Generate a 12-word mnemonic (requires node/npx)
MNEMONIC=$(npx @scure/bip39 generate 2>/dev/null || npx -y bip39-cli generate 2>/dev/null)
# If the above fails, you can also generate manually:
#   npx -y @scure/bip39 generate
# or provide your own 12/24-word mnemonic.
echo "MNEMONIC=$MNEMONIC"  # Back this up securely!

# 2. Open browser — the extension loads automatically via AGENT_BROWSER_EXTENSIONS
agent-browser open about:blank
agent-browser wait 2000  # Wait for extension to inject

# 3. Discover and navigate to the setup page
SETUP_URL=$(agent-browser eval "document.querySelector('meta[name=samui-agent-wallet-setup]')?.content")
agent-browser open "$SETUP_URL"
agent-browser wait 1000

# 4. Fill setup form (use snapshot to find the actual @refs)
agent-browser snapshot -i
agent-browser fill @<password-ref> "$WALLET_PASSWORD"
agent-browser fill @<confirm-ref> "$WALLET_PASSWORD"
agent-browser fill @<mnemonic-ref> "$MNEMONIC"
agent-browser click @<create-button-ref>
agent-browser wait 3000

# 5. Read the public key
agent-browser snapshot -i
# Look for element with aria-label="Wallet address: ..."
# Fund this address with SOL before using dApps.
```

**Important:** The `@<...-ref>` placeholders above are not literal. Run `agent-browser snapshot -i` and use the actual `@eN` refs from the output. The agent should snapshot, read the refs, then use them.

## Wallet Sidebar Elements

After setup, the sidebar appears on every page. Use `agent-browser snapshot -i` to find these elements:

| Element | ARIA Label | Action |
|---------|-----------|--------|
| Wallet address | `Wallet address: <full-address>` | Read address |
| SOL balance | `SOL balance: <amount>` | Read balance |
| Copy button | `Copy wallet address` | Click to copy |
| Network badge | `Network: <name>` | Read current network |
| Network dropdown | `Switch network` | Select network |
| Approve button | `Approve transaction` / `Approve connection` | Click to approve |
| Reject button | `Reject transaction` / `Reject connection` | Click to reject |
| Password input | `Vault password` | Fill to unlock |
| Unlock button | `Unlock wallet` | Click to unlock |

## Core Workflows

### Connect to a dApp

```bash
# Navigate to Solana dApp
agent-browser open https://jup.ag

# The dApp will show a "Connect Wallet" button
agent-browser snapshot -i
agent-browser click @<connect-wallet-ref>

# Wallet sidebar shows connection request
agent-browser snapshot -i
# Look for "Approve connection" button
agent-browser click @<approve-ref>

# Wallet is now connected
agent-browser snapshot -i  # Verify connection
```

### Approve a Transaction

```bash
# After initiating a transaction on the dApp...
agent-browser snapshot -i

# Look for "Approve transaction" button in sidebar
agent-browser click @<approve-ref>

# Wait for transaction confirmation
agent-browser wait 3000
agent-browser snapshot -i  # Check result
```

### Unlock Vault (after browser restart)

```bash
agent-browser snapshot -i
# Look for "Vault password" input
agent-browser fill @<password-ref> "$WALLET_PASSWORD"
agent-browser click @<unlock-ref>
agent-browser wait 1000
agent-browser snapshot -i  # Verify unlocked
```

### Switch Network

```bash
agent-browser snapshot -i
# Find "Switch network" dropdown
agent-browser select @<network-ref> "Devnet"
agent-browser wait 1000
agent-browser snapshot -i  # Verify network changed
```

## Setup from Scratch

For a complete automated setup, use the template script:

```bash
./templates/setup-wallet.sh /path/to/agent-ext "<mnemonic-phrase>"
```

## Security Notes

- The vault password is stored in `chrome.storage.session` (memory-only, cleared when browser closes)
- Secret keys are encrypted at rest with AES-256-GCM (PBKDF2 600k iterations)
- Auto-lock after 5 minutes of inactivity
- Store the wallet password securely (e.g., environment variable, secrets manager)
- Never log or expose the mnemonic phrase

## Deep-dive documentation

| Reference | Description |
|-----------|-------------|
| [references/wallet-setup.md](references/wallet-setup.md) | Detailed wallet creation and setup guide |
| [references/transaction-signing.md](references/transaction-signing.md) | Transaction signing flow and troubleshooting |

## Templates

| Template | Description |
|----------|-------------|
| [templates/setup-wallet.sh](templates/setup-wallet.sh) | Automated wallet setup script |
