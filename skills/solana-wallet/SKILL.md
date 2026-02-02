---
name: solana-wallet
description: Manages a Solana wallet for AI agents to interact with Solana dApps. Creates wallets, signs transactions, connects to dApps via Wallet Standard.
allowed-tools: Bash(agent-browser:*)
---

# Solana Wallet for AI Agents

## Overview

This skill manages the Samui Agent Wallet browser extension, which provides Solana wallet functionality optimized for AI agent interaction. The wallet injects a sidebar into every page with full ARIA labels so `agent-browser snapshot -i` can see and interact with all wallet controls.

## CRITICAL: Wallet Persistence

**The browser profile used by agent-browser is stored in a temp directory and CAN BE WIPED at any time (OS reboot, cleanup, etc).** When the profile is lost, the wallet and all its data are gone. You MUST follow these rules:

1. **Always save the mnemonic** — after creating a wallet, read the mnemonic from the success screen and store it in a persistent location (file, env var, secrets manager). The mnemonic is the ONLY way to restore a wallet.
2. **Always save the password** — store it alongside the mnemonic. You need it to unlock the vault on every browser launch.
3. **Back up the browser profile** after setup — copy the temp profile directory to a stable location so the wallet persists across browser restarts without re-creating it.
4. **Restore the profile before launching** — before each `agent-browser open`, copy the backed-up profile back to the temp location.
5. **If the profile is lost**, you can re-create the wallet from the saved mnemonic and password. The same mnemonic always produces the same keypair.

### Profile location

agent-browser stores the extension profile at:

```
$TMPDIR/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}
```

On macOS this is typically `/var/folders/.../T/agent-browser-ext-default`.
On Linux this is typically `/tmp/agent-browser-ext-default`.

To find the exact path:

```bash
echo "$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"
```

### Backup and restore

```bash
# Choose a persistent location for the profile backup
WALLET_PROFILE_BACKUP="$HOME/.solana-agent-wallet/browser-profile"

# --- BACKUP (run after wallet setup, and periodically) ---
PROFILE_DIR="$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"
mkdir -p "$WALLET_PROFILE_BACKUP"
rsync -a "$PROFILE_DIR/" "$WALLET_PROFILE_BACKUP/"

# --- RESTORE (run before launching agent-browser) ---
PROFILE_DIR="$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"
if [ -d "$WALLET_PROFILE_BACKUP" ] && [ ! -d "$PROFILE_DIR" ]; then
  mkdir -p "$PROFILE_DIR"
  rsync -a "$WALLET_PROFILE_BACKUP/" "$PROFILE_DIR/"
fi
```

### Credential storage

After creating a wallet, persist the credentials to a file:

```bash
WALLET_CREDENTIALS="$HOME/.solana-agent-wallet/credentials.env"
mkdir -p "$(dirname "$WALLET_CREDENTIALS")"
cat > "$WALLET_CREDENTIALS" << 'CREDS'
WALLET_PASSWORD=<the password>
WALLET_MNEMONIC=<the 12 or 24 word mnemonic>
WALLET_PUBLIC_KEY=<the public key>
CREDS
chmod 600 "$WALLET_CREDENTIALS"
```

To load them later:

```bash
source "$HOME/.solana-agent-wallet/credentials.env"
```

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

### Step 1: Check for existing wallet

Before creating a new wallet, check if you have saved credentials:

```bash
WALLET_CREDENTIALS="$HOME/.solana-agent-wallet/credentials.env"
if [ -f "$WALLET_CREDENTIALS" ]; then
  source "$WALLET_CREDENTIALS"
  echo "Found existing wallet: $WALLET_PUBLIC_KEY"
  echo "Mnemonic and password loaded from credentials file."
fi
```

### Step 2: Restore profile if available

```bash
WALLET_PROFILE_BACKUP="$HOME/.solana-agent-wallet/browser-profile"
PROFILE_DIR="$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"

if [ -d "$WALLET_PROFILE_BACKUP" ]; then
  mkdir -p "$PROFILE_DIR"
  rsync -a "$WALLET_PROFILE_BACKUP/" "$PROFILE_DIR/"
  echo "Restored browser profile from backup."
fi
```

### Step 3: Launch browser

```bash
agent-browser open about:blank
agent-browser wait 2000  # Wait for extension to inject
```

### Step 4: Unlock or create wallet

If the profile was restored, the wallet already exists but the vault is locked. Unlock it:

```bash
agent-browser snapshot -i
# If you see "Vault password" input → wallet exists, just unlock:
agent-browser fill @<password-ref> "$WALLET_PASSWORD"
agent-browser click @<unlock-ref>
agent-browser wait 1000
agent-browser snapshot -i  # Verify: should show wallet address and balance
```

If there's no existing wallet (fresh install or lost profile), create one:

```bash
# Generate credentials (or use saved mnemonic to restore)
if [ -z "$WALLET_PASSWORD" ]; then
  WALLET_PASSWORD=$(openssl rand -base64 32)
fi
if [ -z "$WALLET_MNEMONIC" ]; then
  WALLET_MNEMONIC=$(npx -y @scure/bip39 generate 2>/dev/null || npx -y bip39-cli generate 2>/dev/null)
fi

# Navigate to setup page
SETUP_URL=$(agent-browser eval "document.querySelector('meta[name=samui-agent-wallet-setup]')?.content")
agent-browser open "$SETUP_URL"
agent-browser wait 1000

# Fill setup form (use snapshot to find the actual @refs)
agent-browser snapshot -i
agent-browser fill @<password-ref> "$WALLET_PASSWORD"
agent-browser fill @<confirm-ref> "$WALLET_PASSWORD"
agent-browser fill @<mnemonic-ref> "$WALLET_MNEMONIC"
agent-browser click @<create-button-ref>
agent-browser wait 3000

# CRITICAL: Read back the mnemonic and public key from the success screen
agent-browser snapshot -i
# The success screen shows:
#   - aria-label="Wallet address: <public-key>"  → read the public key
#   - aria-label="Wallet mnemonic: <words>"       → read the mnemonic to confirm
# Save WALLET_PUBLIC_KEY from the "Wallet address: ..." aria-label value.

# CRITICAL: Save credentials to persistent storage
WALLET_PUBLIC_KEY="<read from snapshot>"  # Replace with actual value from aria-label
mkdir -p "$HOME/.solana-agent-wallet"
cat > "$HOME/.solana-agent-wallet/credentials.env" << CREDS
WALLET_PASSWORD=$WALLET_PASSWORD
WALLET_MNEMONIC=$WALLET_MNEMONIC
WALLET_PUBLIC_KEY=$WALLET_PUBLIC_KEY
CREDS
chmod 600 "$HOME/.solana-agent-wallet/credentials.env"

# CRITICAL: Back up the browser profile
PROFILE_DIR="$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"
mkdir -p "$HOME/.solana-agent-wallet/browser-profile"
rsync -a "$PROFILE_DIR/" "$HOME/.solana-agent-wallet/browser-profile/"
echo "Wallet created. Profile and credentials backed up."
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

On the setup success screen only:

| Element | ARIA Label | Action |
|---------|-----------|--------|
| Mnemonic display | `Wallet mnemonic: <words>` | Read mnemonic — SAVE THIS |

## Core Workflows

### Launch browser (every session)

This is the standard sequence to run at the start of every session:

```bash
# 1. Load saved credentials
source "$HOME/.solana-agent-wallet/credentials.env" 2>/dev/null || true

# 2. Restore browser profile from backup
WALLET_PROFILE_BACKUP="$HOME/.solana-agent-wallet/browser-profile"
PROFILE_DIR="$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"
if [ -d "$WALLET_PROFILE_BACKUP" ]; then
  mkdir -p "$PROFILE_DIR"
  rsync -a "$WALLET_PROFILE_BACKUP/" "$PROFILE_DIR/"
fi

# 3. Launch browser
agent-browser open about:blank
agent-browser wait 2000

# 4. Unlock vault (always required after browser launch — password is memory-only)
agent-browser snapshot -i
agent-browser fill @<password-ref> "$WALLET_PASSWORD"
agent-browser click @<unlock-ref>
agent-browser wait 1000
agent-browser snapshot -i  # Verify wallet is showing address and balance
```

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

### Switch Network

```bash
agent-browser snapshot -i
# Find "Switch network" dropdown
agent-browser select @<network-ref> "Devnet"
agent-browser wait 1000
agent-browser snapshot -i  # Verify network changed
```

### Restore wallet from mnemonic (when profile is completely lost)

If the browser profile backup is also gone, you can recreate the wallet from the saved mnemonic:

```bash
source "$HOME/.solana-agent-wallet/credentials.env"

# Launch browser (no profile to restore — starting fresh)
agent-browser open about:blank
agent-browser wait 2000

# Navigate to setup page
SETUP_URL=$(agent-browser eval "document.querySelector('meta[name=samui-agent-wallet-setup]')?.content")
agent-browser open "$SETUP_URL"
agent-browser wait 1000

# Re-create wallet with the SAME mnemonic → produces the SAME keypair
agent-browser snapshot -i
agent-browser fill @<password-ref> "$WALLET_PASSWORD"
agent-browser fill @<confirm-ref> "$WALLET_PASSWORD"
agent-browser fill @<mnemonic-ref> "$WALLET_MNEMONIC"
agent-browser click @<create-button-ref>
agent-browser wait 3000

# Back up the new profile
PROFILE_DIR="$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"
rsync -a "$PROFILE_DIR/" "$HOME/.solana-agent-wallet/browser-profile/"
echo "Wallet restored from mnemonic. Profile backed up."
```

## Setup from Scratch

For a complete automated setup, use the template script:

```bash
./templates/setup-wallet.sh /path/to/agent-ext
# Optionally pass an existing mnemonic to restore:
./templates/setup-wallet.sh /path/to/agent-ext "word1 word2 ... word12"
```

## Security Notes

- The vault password is stored in `chrome.storage.session` (memory-only, cleared when browser closes)
- Secret keys are encrypted at rest with AES-256-GCM (PBKDF2 600k iterations)
- Auto-lock after 5 minutes of inactivity
- **Always store the mnemonic and password in a persistent, secure location** — these are the only way to recover the wallet
- The credentials file at `~/.solana-agent-wallet/credentials.env` has mode 600 (owner-only read/write)
- The same mnemonic always derives the same keypair, so the wallet address is recoverable

## Deep-dive documentation

| Reference | Description |
|-----------|-------------|
| [references/wallet-setup.md](references/wallet-setup.md) | Detailed wallet creation and setup guide |
| [references/transaction-signing.md](references/transaction-signing.md) | Transaction signing flow and troubleshooting |

## Templates

| Template | Description |
|----------|-------------|
| [templates/setup-wallet.sh](templates/setup-wallet.sh) | Automated wallet setup script |
