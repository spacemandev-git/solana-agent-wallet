# Wallet Setup Guide

## Extension Installation

### From GitHub Releases

1. Download `agent-ext.zip` from the latest release
2. Extract to a directory (e.g., `/tmp/agent-ext`)
3. Set the environment variable:
   ```bash
   export AGENT_BROWSER_EXTENSIONS="/tmp/agent-ext"
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

## Generating a Mnemonic

If you need to generate a new mnemonic:

```bash
# Using openssl for entropy (then convert to BIP39)
# Or use a tool like:
npx @scure/bip39 generate
```

For testing, you can use well-known test mnemonics (devnet only).

## Post-Setup

After wallet creation, the setup page displays the public key. This address needs to be funded with SOL before you can sign transactions.

For devnet testing:
```bash
# Airdrop SOL on devnet
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
