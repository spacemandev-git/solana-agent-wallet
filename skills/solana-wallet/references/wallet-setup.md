# Wallet Setup Guide

## CRITICAL: Persistence

The browser profile is stored in a temp directory that can be wiped at any time. You MUST:

1. **Save the mnemonic** — it is displayed on the success screen after wallet creation with `aria-label="Wallet mnemonic: <words>"`. This is the ONLY way to restore the wallet keypair.
2. **Save the password** — needed to unlock the vault on every browser launch.
3. **Back up the browser profile** — so the wallet data persists across browser restarts.

All credentials should be stored at `~/.solana-agent-wallet/credentials.env` (mode 600).
The profile backup should be at `~/.solana-agent-wallet/browser-profile/`.

## Extension Installation

### From GitHub Releases

1. Download `agent-ext.zip` from the latest release into the skill directory
2. Extract next to the SKILL.md (e.g., `skills/solana-wallet/agent-ext/`)
3. Set the environment variable:
   ```bash
   export AGENT_BROWSER_EXTENSIONS="$SKILL_DIR/agent-ext"
   ```

### From Source

```bash
cd solana-agent-wallet
bun install
bun run build --filter=agent-ext
export AGENT_BROWSER_EXTENSIONS="$(pwd)/apps/agent-ext/.output/chrome-mv3"
```

## Discovering the Setup Page

When the extension loads on any page, it injects a `<meta>` tag:

```html
<meta name="samui-agent-wallet-setup" content="chrome-extension://<id>/setup.html">
```

To find this programmatically:

```bash
agent-browser open about:blank
agent-browser eval "document.querySelector('meta[name=samui-agent-wallet-setup]')?.content"
```

Use the returned URL to navigate to the setup page.

## Setup Form Fields

The setup page has these ARIA-labeled fields:

| Field | ARIA Label | Notes |
|-------|-----------|-------|
| Password | `Vault password` | Minimum 8 characters |
| Confirm password | `Confirm vault password` | Must match password |
| Mnemonic | `Wallet mnemonic phrase` | 12 or 24 space-separated words |
| Create button | `Create wallet` | Submits the form |

## Success Screen Fields

After wallet creation, the success screen displays:

| Field | ARIA Label | Notes |
|-------|-----------|-------|
| Public key | `Wallet address: <full-address>` | The wallet's Solana address |
| Mnemonic | `Wallet mnemonic: <words>` | **SAVE THIS** — needed to restore wallet |

The agent MUST read both values from the success screen and persist them.

## Generating a Mnemonic

If you need to generate a new mnemonic:

```bash
npx -y @scure/bip39 generate
```

The same mnemonic always derives the same keypair. If you have a saved mnemonic from a previous wallet, use it to restore the exact same address.

For testing, you can use well-known test mnemonics (devnet only).

## Post-Setup: Save Everything

After wallet creation, immediately:

```bash
# 1. Save credentials
mkdir -p "$HOME/.solana-agent-wallet"
cat > "$HOME/.solana-agent-wallet/credentials.env" << CREDS
WALLET_PASSWORD=<the password you used>
WALLET_MNEMONIC=<the mnemonic from the success screen>
WALLET_PUBLIC_KEY=<the public key from the success screen>
CREDS
chmod 600 "$HOME/.solana-agent-wallet/credentials.env"

# 2. Back up the browser profile
PROFILE_DIR="$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"
mkdir -p "$HOME/.solana-agent-wallet/browser-profile"
rsync -a "$PROFILE_DIR/" "$HOME/.solana-agent-wallet/browser-profile/"
```

## Restoring a Wallet

### From profile backup (fast — no re-creation needed)

```bash
PROFILE_DIR="$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"
rsync -a "$HOME/.solana-agent-wallet/browser-profile/" "$PROFILE_DIR/"
# Then launch browser and unlock with password
```

### From mnemonic (when profile backup is also lost)

Run through the setup form again using the saved mnemonic. The same mnemonic produces the same keypair, so you get the same wallet address back.

## Post-Setup: Fund the Wallet

The address needs to be funded with SOL before you can sign transactions.

For devnet testing:
```bash
solana airdrop 2 <public-key> --url devnet
```

For mainnet, transfer SOL from another wallet or exchange.

## Verifying Setup

After setup, navigate to any page and check the sidebar:

```bash
agent-browser open https://example.com
agent-browser snapshot -i
# Should see: Wallet address, SOL balance, Network badge
```

## Every Session Checklist

1. Load credentials: `source ~/.solana-agent-wallet/credentials.env`
2. Restore profile: `rsync -a ~/.solana-agent-wallet/browser-profile/ $PROFILE_DIR/`
3. Launch browser: `agent-browser open about:blank`
4. Unlock vault: fill password input, click unlock
5. Verify: `agent-browser snapshot -i` shows wallet address
