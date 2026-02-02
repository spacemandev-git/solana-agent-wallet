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
agent-browser --help
agent-browser open https://example.com
agent-browser snapshot -i   # Should print interactive elements with @refs
agent-browser close
```

### Key commands reference

```bash
agent-browser open <url>          # Navigate to a page (must be a valid URL, not about:blank)
agent-browser snapshot -i         # Get interactive elements with refs (e.g., @e1, @e2)
agent-browser snapshot            # Full accessibility tree (shows ARIA labels with values)
agent-browser click @e1           # Click element by ref
agent-browser fill @e2 "text"     # Clear and type into input (see Shadow DOM note below)
agent-browser select @e3 "value"  # Select dropdown option
agent-browser eval '<js>'         # Run JavaScript in page context
agent-browser screenshot <path>   # Take a screenshot (path is required)
agent-browser wait 2000           # Wait milliseconds
agent-browser close               # Close browser and stop daemon
```

Use `--extension <path>` or set `AGENT_BROWSER_EXTENSIONS` to load browser extensions (like this wallet).

### CRITICAL: agent-browser daemon caching

agent-browser runs a background **daemon** process that keeps the browser alive between commands. This means:

1. **Extensions are loaded once** when the daemon starts. If you rebuild the extension, you MUST restart the daemon:
   ```bash
   agent-browser close   # Stops daemon + browser
   # Clear the Service Worker cache to force extension reload:
   PROFILE_DIR="$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"
   rm -rf "$PROFILE_DIR/Default/Service Worker"
   # Now re-launch with updated extension:
   AGENT_BROWSER_EXTENSIONS="/path/to/extension" agent-browser open https://example.com
   ```

2. **`--extension` is only honored on first launch.** If the daemon is already running, `--extension` / `AGENT_BROWSER_EXTENSIONS` is ignored with a warning. Always `agent-browser close` first.

3. **If you see stale behavior** (old extension code running despite rebuild), kill the daemon and clear the SW cache as shown above.

### CRITICAL: Shadow DOM input interaction

The wallet sidebar renders inside a **shadow DOM** (`<samui-agent-sidebar>`). Standard `agent-browser fill` and `agent-browser type` commands **do not work** with React inputs inside shadow DOM because they bypass React's synthetic event system.

**You MUST use `agent-browser eval` with the React value tracker trick to fill inputs:**

```bash
# Fill a single shadow DOM input by index (0-based)
# This resets React's internal value tracker so React sees the change
agent-browser eval $'(() => { const sr = document.querySelector(\'samui-agent-sidebar\').shadowRoot; const inp = sr.querySelectorAll(\'input\')[INDEX]; const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, \'value\').set; const tracker = inp._valueTracker; if (tracker) tracker.setValue(\'\'); nativeSet.call(inp, \'YOUR_VALUE\'); inp.dispatchEvent(new Event(\'input\', {bubbles: true})); return \'done\'; })()'

# Fill ALL password inputs at once (useful for create wallet form)
agent-browser eval $'(() => { const sr = document.querySelector(\'samui-agent-sidebar\').shadowRoot; const inputs = sr.querySelectorAll(\'input\'); const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, \'value\').set; const pw = \'YOUR_PASSWORD\'; for (const inp of inputs) { const tracker = inp._valueTracker; if (tracker) tracker.setValue(\'\'); nativeSet.call(inp, pw); inp.dispatchEvent(new Event(\'input\', {bubbles: true})); } return \'done\'; })()'

# Fill ALL fields at once in import mode (passwords + mnemonic)
# IMPORTANT: You MUST fill all fields in a SINGLE eval call when in import mode.
# If you fill passwords first in a separate call, the React re-render can reset
# the form back to "create" mode, losing the mnemonic textarea.
agent-browser eval $'(() => { const sr = document.querySelector(\'samui-agent-sidebar\').shadowRoot; const inputs = sr.querySelectorAll(\'input\'); const ta = sr.querySelector(\'textarea\'); const inputSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, \'value\').set; const taSet = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, \'value\').set; const pw = \'YOUR_PASSWORD\'; const mn = \'YOUR_MNEMONIC\'; for (const inp of inputs) { const t = inp._valueTracker; if (t) t.setValue(\'\'); inputSet.call(inp, pw); inp.dispatchEvent(new Event(\'input\', {bubbles: true})); } if (ta) { const t = ta._valueTracker; if (t) t.setValue(\'\'); taSet.call(ta, mn); ta.dispatchEvent(new Event(\'input\', {bubbles: true})); } return \'done\'; })()'
```

```bash
# Fill send tokens fields (recipient + amount) by ARIA label
agent-browser eval $'(() => { const sr = document.querySelector(\'samui-agent-sidebar\').shadowRoot; const inputs = sr.querySelectorAll(\'input\'); let recipientInp = null; let amountInp = null; for (const inp of inputs) { const label = inp.getAttribute(\'aria-label\') || \'\'; if (label.includes(\'Recipient\')) recipientInp = inp; if (label.includes(\'Amount\')) amountInp = inp; } const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, \'value\').set; if (recipientInp) { const t = recipientInp._valueTracker; if (t) t.setValue(\'\'); nativeSet.call(recipientInp, \'RECIPIENT_ADDRESS\'); recipientInp.dispatchEvent(new Event(\'input\', {bubbles: true})); } if (amountInp) { const t = amountInp._valueTracker; if (t) t.setValue(\'\'); nativeSet.call(amountInp, \'AMOUNT\'); amountInp.dispatchEvent(new Event(\'input\', {bubbles: true})); } return \'done\'; })()'
```

**Why this is necessary:** React tracks input values internally via `_valueTracker`. If you set the DOM value without resetting the tracker, React ignores the change and the component state stays empty. The pattern above resets the tracker, sets the native value, and dispatches an `input` event that React's delegated event system picks up.

**Important notes:**
- `agent-browser click @ref` works fine for buttons — only `fill`/`type` is broken for shadow DOM inputs.
- In import mode, fill passwords AND mnemonic in the **same eval call** to prevent React re-renders from resetting the form mode back to "create".
- `agent-browser fill @ref "text"` DOES work for the vault unlock screen (single password input). You can use either `fill` or `eval` for the unlock screen.
- For the send tokens form, use the ARIA-label based selector (shown above) to target the recipient and amount inputs specifically, avoiding accidental fills into other inputs on the page.

## Install the wallet extension

Download the pre-built unpacked extension from GitHub releases into the skill directory:

```bash
# SKILL_DIR is the directory containing this SKILL.md file.
# If you're reading this file, resolve it from the file path:
SKILL_DIR="$(cd "$(dirname "<path-to-this-SKILL.md>")" && pwd)"

# Download the latest release into the skill directory
curl -L -o "$SKILL_DIR/agent-ext.zip" \
  https://github.com/spacemandev-git/solana-agent-wallet/releases/latest/download/agent-ext.zip

# Extract next to the skill
mkdir -p "$SKILL_DIR/agent-ext"
unzip -o "$SKILL_DIR/agent-ext.zip" -d "$SKILL_DIR/agent-ext"

# Set the extension path for agent-browser
export AGENT_BROWSER_EXTENSIONS="$SKILL_DIR/agent-ext"
```

Releases page: https://github.com/spacemandev-git/solana-agent-wallet/releases

If the extension is already downloaded (the `agent-ext/` directory exists next to this file), skip the download and just set:

```bash
export AGENT_BROWSER_EXTENSIONS="$SKILL_DIR/agent-ext"
```

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
# NOTE: about:blank does NOT work — agent-browser prefixes https:// making it invalid.
# Use any real URL instead. The wallet sidebar injects on all pages.
agent-browser close 2>/dev/null  # Ensure no stale daemon
AGENT_BROWSER_EXTENSIONS="$SKILL_DIR/agent-ext" agent-browser open https://example.com
agent-browser wait 2000  # Wait for extension to inject
```

### Step 4: Unlock or create wallet

If the profile was restored, the wallet already exists but the vault is locked. Unlock it:

```bash
agent-browser snapshot -i
# If you see "Vault password" input → wallet exists, just unlock.
# You can use agent-browser fill for the unlock screen:
agent-browser fill @<password-ref> "$WALLET_PASSWORD"
agent-browser click @<unlock-ref>  # aria-label="Unlock wallet"
agent-browser wait 1000
agent-browser snapshot -i  # Verify: should show wallet address and balance
```

If there's no existing wallet (fresh install or lost profile), the sidebar automatically shows the wallet creation form. Create or import a wallet directly from the sidebar:

```bash
# Generate a password (or use saved one)
if [ -z "$WALLET_PASSWORD" ]; then
  WALLET_PASSWORD=$(openssl rand -base64 32)
fi

# The sidebar shows the creation form when no wallet exists.
agent-browser snapshot -i

# --- OPTION A: Create a new wallet (DEFAULT) ---
# Stay on the "Create" tab. The extension generates the mnemonic automatically.
# No need to provide a mnemonic — just fill the password fields.

# --- OPTION B: Import an existing wallet ---
# If you have a saved WALLET_MNEMONIC and want to restore:
# agent-browser click @<import-tab-ref>     # aria-label="Import existing wallet"
# agent-browser wait 500
# agent-browser snapshot -i
# Then fill the mnemonic textarea (see Shadow DOM note above for eval command).

# Fill password fields using eval (fill/type don't work in shadow DOM for creation form):
agent-browser eval $'(() => { const sr = document.querySelector(\'samui-agent-sidebar\').shadowRoot; const inputs = sr.querySelectorAll(\'input\'); const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, \'value\').set; const pw = \'YOUR_PASSWORD_HERE\'; for (const inp of inputs) { const tracker = inp._valueTracker; if (tracker) tracker.setValue(\'\'); nativeSet.call(inp, pw); inp.dispatchEvent(new Event(\'input\', {bubbles: true})); } return \'done\'; })()'

# Verify button is enabled (should NOT show [disabled])
agent-browser snapshot -i
agent-browser click @<create-button-ref>                     # aria-label="Create wallet" or "Import wallet"
agent-browser wait 5000

# CRITICAL: Read back the public key AND mnemonic from the success screen
# Use full snapshot (not -i) to see ARIA label values:
agent-browser snapshot
# The success screen shows:
#   - status "Wallet address: <public-key>"   → read the public key
#   - status "Wallet mnemonic: <12 words>"    → read the mnemonic — SAVE THIS!
# Both are shown for create AND import modes.

# Click "Continue to wallet" to proceed to the main wallet view
agent-browser click @<continue-ref>   # aria-label="Continue to wallet"
agent-browser wait 1000

# CRITICAL: Save credentials to persistent storage
WALLET_PUBLIC_KEY="<read from snapshot>"   # Replace with actual value
WALLET_MNEMONIC="<read from snapshot>"     # Replace with actual mnemonic
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

The sidebar appears on every page. Use `agent-browser snapshot -i` to find these elements:

### Wallet creation form (shown when no wallet exists)

| Element | ARIA Label | Action |
|---------|-----------|--------|
| Create tab | `Create new wallet` | Click to switch to create mode |
| Import tab | `Import existing wallet` | Click to switch to import mode |
| Password input | `Vault password` | Fill password (min 8 chars) |
| Confirm input | `Confirm vault password` | Fill confirm password |
| Mnemonic input | `Wallet mnemonic phrase` | Fill mnemonic (import mode only) |
| Create button | `Create wallet` / `Import wallet` | Click to create or import |

### Wallet creation success screen

| Element | ARIA Label | Action |
|---------|-----------|--------|
| Address display | `Wallet address: <public-key>` | Read the public key |
| Mnemonic display | `Wallet mnemonic: <words>` | Read mnemonic (shown for BOTH create and import) — SAVE THIS |
| Continue button | `Continue to wallet` | Click to proceed to wallet view |

### Vault unlock (shown when wallet exists but locked)

| Element | ARIA Label | Action |
|---------|-----------|--------|
| Password input | `Vault password` | Fill to unlock |
| Unlock button | `Unlock wallet` | Click to unlock |

### Main wallet view (shown when unlocked)

| Element | ARIA Label | Action |
|---------|-----------|--------|
| Wallet address | `Wallet address: <full-address>` | Read address |
| SOL balance | `SOL balance: <amount>` | Read balance (up to 8 decimals) |
| Copy button | `Copy wallet address` | Click to copy |
| Network badge | `Network: <name>` | Read current network |
| Token dropdown | `Select token to send` | Select SOL or an SPL token to send |
| Recipient input | `Recipient wallet address` | Fill with destination address |
| Amount input | `Amount to send` | Fill with amount (in token units, e.g. `0.08` SOL) |
| Send button | `Send tokens` | Click to send the selected token |
| Signature display | `Transaction signature: <sig>` | Read the on-chain signature (shown on success) |
| Send another button | `Send another transaction` | Click to reset and send again |
| Send error | `Send error: <message>` | Read error message (shown on failure) |
| Network dropdown | `Switch network` | Select network |
| RPC endpoint display | `Current RPC endpoint` | Read current RPC URL |
| Change RPC button | `Change RPC endpoint` | Click to show RPC input |
| RPC URL input | `RPC endpoint URL` | Fill with custom RPC URL |
| Save RPC button | `Save RPC endpoint` | Click to save custom RPC |
| Cancel RPC button | `Cancel RPC change` | Click to cancel |
| Approve button | `Approve transaction` / `Approve connection` | Click to approve |
| Reject button | `Reject transaction` / `Reject connection` | Click to reject |

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

# 3. Stop any existing daemon (ensures fresh extension load)
agent-browser close 2>/dev/null

# 4. Launch browser (use any real URL — about:blank does NOT work)
AGENT_BROWSER_EXTENSIONS="$SKILL_DIR/agent-ext" agent-browser open https://example.com
agent-browser wait 2000

# 5. Unlock vault (always required after browser launch — password is memory-only)
agent-browser snapshot -i
agent-browser fill @<password-ref> "$WALLET_PASSWORD"
agent-browser click @<unlock-ref>  # aria-label="Unlock wallet"
agent-browser wait 1000
agent-browser snapshot -i  # Verify wallet is showing address and balance
```

### Connect to a dApp

The wallet auto-approves `connect` requests. On many dApps (like Jupiter), the wallet connects automatically once detected. If not:

```bash
# Navigate to Solana dApp
agent-browser open https://jup.ag
agent-browser wait 3000

# Check if already connected (look for wallet address in the page)
agent-browser snapshot -i

# If not connected, click the dApp's "Connect Wallet" button
agent-browser click @<connect-wallet-ref>
agent-browser wait 2000

# A wallet selector may appear — click "Samui" in the list
agent-browser snapshot -i
agent-browser click @<samui-ref>
agent-browser wait 2000

# Verify connection (look for wallet address shown by the dApp)
agent-browser snapshot -i
```

### Perform a Swap on Jupiter

```bash
# 1. Navigate and ensure wallet is connected (see above)
agent-browser open https://jup.ag
agent-browser wait 3000

# 2. Select sell token (e.g., SOL)
agent-browser snapshot -i
agent-browser click @<sell-select-token-ref>    # First "Select token" button
agent-browser wait 1000
agent-browser snapshot -i
agent-browser click @<sol-button-ref>           # Click "SOL" in the token list
agent-browser wait 1000

# 3. Select buy token (e.g., USDC)
agent-browser snapshot -i
agent-browser click @<buy-select-token-ref>     # Second "Select token" button
agent-browser wait 1000
agent-browser snapshot -i
agent-browser click @<usdc-button-ref>          # Click "USDC" in the token list
agent-browser wait 1000

# 4. Enter amount
agent-browser snapshot -i
agent-browser fill @<amount-textbox-ref> "0.01"
agent-browser wait 3000   # Wait for quote to load

# 5. Click Swap
agent-browser snapshot -i
agent-browser click @<swap-button-ref>          # aria-label="Swap"
agent-browser wait 5000

# 6. Approve the transaction in the wallet sidebar
agent-browser snapshot -i
# Look for "Approve transaction" button in the sidebar
agent-browser click @<approve-ref>              # aria-label="Approve transaction"
agent-browser wait 15000  # Transaction takes time to confirm on-chain

# 7. Verify result
agent-browser snapshot -i   # Check balances updated
agent-browser screenshot /tmp/swap-result.png
```

### Send SOL or SPL Tokens

The wallet sidebar includes a built-in transfer UI. Sends are direct — no approval popup is needed since the agent controls the wallet. The token dropdown shows SOL and all SPL tokens held by the wallet (both Token Program and Token-2022).

```bash
# 1. Ensure wallet is unlocked (see "Launch browser" above)
agent-browser snapshot -i

# 2. Select the token to send (SOL is selected by default)
# To send an SPL token instead of SOL:
agent-browser select @<token-dropdown-ref> "<mint-or-label>"   # aria-label="Select token to send"
agent-browser wait 500

# 3. Fill recipient address and amount (shadow DOM inputs — use eval)
agent-browser eval $'(() => { const sr = document.querySelector(\'samui-agent-sidebar\').shadowRoot; const inputs = sr.querySelectorAll(\'input\'); let recipientInp = null; let amountInp = null; for (const inp of inputs) { const label = inp.getAttribute(\'aria-label\') || \'\'; if (label.includes(\'Recipient\')) recipientInp = inp; if (label.includes(\'Amount\')) amountInp = inp; } const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, \'value\').set; if (recipientInp) { const t = recipientInp._valueTracker; if (t) t.setValue(\'\'); nativeSet.call(recipientInp, \'RECIPIENT_ADDRESS_HERE\'); recipientInp.dispatchEvent(new Event(\'input\', {bubbles: true})); } if (amountInp) { const t = amountInp._valueTracker; if (t) t.setValue(\'\'); nativeSet.call(amountInp, \'AMOUNT_HERE\'); amountInp.dispatchEvent(new Event(\'input\', {bubbles: true})); } return \'done\'; })()'

# 4. Verify fields are filled and button is enabled
agent-browser snapshot -i
# The "Send tokens" button should NOT show [disabled]

# 5. Click Send
agent-browser click @<send-button-ref>   # aria-label="Send tokens"

# 6. Wait for transaction to complete (5-15 seconds on mainnet)
agent-browser wait 10000

# 7. Verify result
agent-browser snapshot
# On success: shows "Sent! Signature: <sig>" with aria-label="Transaction signature: <sig>"
# On failure: shows error message with aria-label="Send error: <message>"

# 8. (Optional) Send another transaction
agent-browser click @<send-another-ref>   # aria-label="Send another transaction"
```

**Notes:**
- The recipient and amount inputs are inside shadow DOM, so `agent-browser fill` does not work. Use the `eval` trick shown above (same pattern as wallet creation).
- The amount is in token units (e.g., `0.08` for 0.08 SOL, `100` for 100 of an SPL token). The extension converts to the correct on-chain representation using the token's decimals.
- After a successful send, the balance updates on the next refresh cycle (every 5 seconds) or immediately if you trigger a snapshot.
- To send an SPL token, select it from the dropdown first. The dropdown shows the token symbol (or abbreviated mint address) and current balance.

### Approve a Transaction

When a dApp initiates a transaction, it appears in the wallet sidebar:

```bash
# After initiating a transaction on the dApp...
agent-browser snapshot -i

# Look for "Approve transaction" button in sidebar
agent-browser click @<approve-ref>   # aria-label="Approve transaction"

# Wait for transaction confirmation (can take 5-15 seconds on mainnet)
agent-browser wait 10000
agent-browser snapshot -i  # Check result
```

**How approval works internally:**
1. dApp sends `signAndSendTransaction` to the extension background
2. Background creates a pending request and broadcasts to the sidebar
3. Sidebar shows "Approve / Reject" buttons
4. On approve: the sign service decrypts the private key, signs the transaction, sends it to the RPC, and resolves the dApp's promise
5. On reject: the dApp receives an error

### Switch Network

```bash
agent-browser snapshot -i
# Find "Switch network" dropdown
agent-browser select @<network-ref> "Devnet"
agent-browser wait 1000
agent-browser snapshot -i  # Verify network changed
```

### Set Custom RPC Endpoint

You can set a custom Solana RPC endpoint (e.g., a private Helius, QuickNode, or Triton endpoint) to avoid rate limits or use a specific network:

```bash
agent-browser snapshot -i
# Find "Change RPC endpoint" button in the sidebar
agent-browser click @<change-rpc-ref>   # aria-label="Change RPC endpoint"
agent-browser wait 500

agent-browser snapshot -i
# Fill the RPC URL input (this is inside shadow DOM, use eval)
agent-browser eval $'(() => { const sr = document.querySelector(\'samui-agent-sidebar\').shadowRoot; const inp = sr.querySelector(\'input[type="url"]\'); const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, \'value\').set; const tracker = inp._valueTracker; if (tracker) tracker.setValue(\'\'); nativeSet.call(inp, \'YOUR_RPC_URL_HERE\'); inp.dispatchEvent(new Event(\'input\', {bubbles: true})); return \'done\'; })()'

# Save the endpoint
agent-browser snapshot -i
agent-browser click @<save-rpc-ref>     # aria-label="Save RPC endpoint"
agent-browser wait 1000

# Verify the new endpoint is shown
agent-browser snapshot -i   # Should show the new RPC URL under "RPC Endpoint"
```

The custom RPC endpoint is persisted in the wallet's IndexedDB. It survives page navigation and browser restarts (as long as the profile is preserved). Both balance fetching and transaction signing use this endpoint.

**Note:** The mainnet-beta → publicnode fallback still applies. If your custom endpoint contains `mainnet-beta`, the extension will override it with publicnode to avoid 403 errors. Use a custom RPC that doesn't include `mainnet-beta` in the URL.

### Restore wallet from mnemonic (when profile is completely lost)

If the browser profile backup is also gone, you can recreate the wallet from the saved mnemonic. The sidebar automatically shows the creation/import form when no wallet exists:

```bash
source "$HOME/.solana-agent-wallet/credentials.env"

# Launch browser (no profile to restore — starting fresh)
agent-browser close 2>/dev/null
AGENT_BROWSER_EXTENSIONS="$SKILL_DIR/agent-ext" agent-browser open https://example.com
agent-browser wait 2000

# The sidebar shows the creation form automatically. Switch to import mode.
agent-browser snapshot -i
agent-browser click @<import-tab-ref>     # aria-label="Import existing wallet"
agent-browser wait 500
agent-browser snapshot -i

# Fill ALL fields in a SINGLE eval call (passwords + mnemonic)
# IMPORTANT: Must be a single call — separate calls cause React re-renders that reset mode to "create"
agent-browser eval $'(() => { const sr = document.querySelector(\'samui-agent-sidebar\').shadowRoot; const inputs = sr.querySelectorAll(\'input\'); const ta = sr.querySelector(\'textarea\'); const inputSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, \'value\').set; const taSet = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, \'value\').set; const pw = \'YOUR_PASSWORD_HERE\'; const mn = \'YOUR_MNEMONIC_HERE\'; for (const inp of inputs) { const t = inp._valueTracker; if (t) t.setValue(\'\'); inputSet.call(inp, pw); inp.dispatchEvent(new Event(\'input\', {bubbles: true})); } if (ta) { const t = ta._valueTracker; if (t) t.setValue(\'\'); taSet.call(ta, mn); ta.dispatchEvent(new Event(\'input\', {bubbles: true})); } return \'done\'; })()'

# Re-create wallet with the SAME mnemonic → produces the SAME keypair
agent-browser click @<import-button-ref>                     # aria-label="Import wallet"
agent-browser wait 5000

# Click continue to proceed to wallet view
agent-browser snapshot -i
agent-browser click @<continue-ref>   # aria-label="Continue to wallet"
agent-browser wait 1000

# Back up the new profile
PROFILE_DIR="$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"
rsync -a "$PROFILE_DIR/" "$HOME/.solana-agent-wallet/browser-profile/"
echo "Wallet restored from mnemonic. Profile backed up."
```

## Troubleshooting

### Balance shows 0 despite having SOL

The Solana public RPC (`api.mainnet-beta.solana.com`) returns **403 Forbidden** when called from browser extension origins. The extension uses `solana-rpc.publicnode.com` as a fallback, but if the wallet was created with an older version, the DB may still store the old endpoint.

**Fix:** The latest extension build handles this automatically by falling back to publicnode when mainnet-beta is detected. Ensure you're running the latest build.

### "Pending Wallet Signature" hangs after approving

This was a bug where the approve handler incorrectly routed the signing request back through the background's request-creation handler (creating a circular dependency). Fixed in the latest build — the approve handler now calls the sign service directly.

### Extension not loading / stale code running

agent-browser uses a background daemon that caches the browser process. If you rebuild the extension but see old behavior:

```bash
# 1. Stop the daemon
agent-browser close

# 2. Clear the Service Worker cache
PROFILE_DIR="$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"
rm -rf "$PROFILE_DIR/Default/Service Worker"

# 3. Re-launch with extension
AGENT_BROWSER_EXTENSIONS="/path/to/extension" agent-browser open https://example.com
```

### Sidebar overlaps page content

The extension injects CSS to constrain page width to `calc(100vw - 320px)`. This works on most sites. If a site uses `100vw` in CSS, some elements may still extend behind the sidebar. The sidebar has `z-index: 2147483647` so it always renders on top.

### Transaction fails with "Access forbidden"

The Solana public mainnet RPC rate-limits or blocks requests from certain origins. The extension falls back to `solana-rpc.publicnode.com` for mainnet. If you need a custom RPC, use the "Change RPC endpoint" button in the sidebar to set your own endpoint (see [Set Custom RPC Endpoint](#set-custom-rpc-endpoint)).

### Wallet connect not detected by dApp

Some dApps discover wallets via the `wallet-standard:app-ready` event. If the wallet loads after the dApp's discovery phase, try refreshing the page:

```bash
agent-browser open <dapp-url>   # Re-navigate triggers fresh discovery
agent-browser wait 3000
agent-browser snapshot -i       # Check if wallet is detected
```

## Architecture Notes

### Page layout

The sidebar is `position: fixed; right: 0; width: 320px; height: 100vh`. The extension injects a `<style>` tag that constrains `body` and its direct children to `calc(100vw - 320px)` width with `overflow-x: hidden` to prevent content from rendering behind the sidebar.

### Message flow (transaction signing)

```
dApp → injected.js → content bridge → background.ts
  → AgentRequestService.create() (stores promise, broadcasts to tabs)
  → content-ui sidebar shows Approve/Reject
  → On approve: AgentSignService signs tx → AgentRequestService.resolve()
  → background.ts resolves the original promise → result flows back to dApp
```

### RPC endpoint handling

The Solana public RPC (`api.mainnet-beta.solana.com`) returns 403 from browser extension origins (both content scripts and service workers). The extension handles this by:
1. Setting the default env to `solana-rpc.publicnode.com`
2. Falling back to publicnode whenever `mainnet-beta` is detected in the endpoint URL
3. Both `background.ts` (balance) and `agent-sign.ts` (transaction sending) apply this fallback
4. Users/agents can set a custom RPC endpoint via the sidebar UI — it updates the active network's endpoint in IndexedDB and is used for all subsequent RPC calls

### Proxy service isolation

The extension uses `@webext-core/proxy-service` with service name `'AgentRequestService'` (not `'RequestService'`). This avoids conflicts with the standard wallet's `RequestService` which requires `browser.windows` permission (unavailable in agent-ext). The standard actions are NOT imported — all signing goes through `AgentSignService` directly.

## Setup from Scratch

For a complete automated setup, use the template script. It defaults to using the `agent-ext/` directory next to SKILL.md and will download the extension automatically if not present:

```bash
./templates/setup-wallet.sh
# Or specify a custom extension path:
./templates/setup-wallet.sh /path/to/agent-ext
# Or restore from an existing mnemonic:
./templates/setup-wallet.sh "$SKILL_DIR/agent-ext" "word1 word2 ... word12"
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
