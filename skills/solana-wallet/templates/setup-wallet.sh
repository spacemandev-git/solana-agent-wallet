#!/usr/bin/env bash
set -euo pipefail

# Usage: ./setup-wallet.sh [extension-path] [mnemonic]
# Example: ./setup-wallet.sh
# Example: ./setup-wallet.sh ./agent-ext
# Example: ./setup-wallet.sh ./agent-ext "word1 word2 ... word12"
#
# If no extension path is given, defaults to agent-ext/ next to this script's
# parent SKILL.md (i.e. the skill directory).
#
# If no mnemonic is provided, one will be generated.
# If a mnemonic is provided, the wallet will be restored from it.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

EXTENSION_PATH="${1:-$SKILL_DIR/agent-ext}"
MNEMONIC="${2:-}"

# Download extension if not present
if [ ! -d "$EXTENSION_PATH" ]; then
  echo "Extension not found at $EXTENSION_PATH — downloading from GitHub releases..."
  curl -L -o "$SKILL_DIR/agent-ext.zip" \
    https://github.com/spacemandev-git/solana-agent-wallet/releases/latest/download/agent-ext.zip
  mkdir -p "$EXTENSION_PATH"
  unzip -o "$SKILL_DIR/agent-ext.zip" -d "$EXTENSION_PATH"
fi

WALLET_DIR="$HOME/.solana-agent-wallet"
WALLET_CREDENTIALS="$WALLET_DIR/credentials.env"
WALLET_PROFILE_BACKUP="$WALLET_DIR/browser-profile"

# Check for existing credentials
if [ -f "$WALLET_CREDENTIALS" ]; then
  echo "Found existing wallet credentials at $WALLET_CREDENTIALS"
  echo "To create a fresh wallet, remove the file first:"
  echo "  rm $WALLET_CREDENTIALS"
  echo ""
  # shellcheck source=/dev/null
  source "$WALLET_CREDENTIALS"
  echo "Existing wallet public key: $WALLET_PUBLIC_KEY"

  # If we have a profile backup, restore it and just unlock
  if [ -d "$WALLET_PROFILE_BACKUP" ]; then
    PROFILE_DIR="$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"
    mkdir -p "$PROFILE_DIR"
    rsync -a "$WALLET_PROFILE_BACKUP/" "$PROFILE_DIR/"
    echo "Restored browser profile. Use WALLET_PASSWORD to unlock."
    exit 0
  fi

  echo "No profile backup found. Will recreate wallet from saved mnemonic."
  MNEMONIC="$WALLET_MNEMONIC"
fi

# Generate or validate mnemonic
if [ -z "$MNEMONIC" ]; then
  echo "Generating new mnemonic..."
  MNEMONIC=$(npx -y @scure/bip39 generate 2>/dev/null || npx -y bip39-cli generate 2>/dev/null || "")
  if [ -z "$MNEMONIC" ]; then
    echo "ERROR: Could not generate mnemonic. Install @scure/bip39:"
    echo "  npm install -g @scure/bip39"
    exit 1
  fi
fi

# Generate a random password
WALLET_PASSWORD=$(openssl rand -base64 32)

echo "=== Samui Agent Wallet Setup ==="
echo "Extension: $EXTENSION_PATH"
echo ""

# Set extension path
export AGENT_BROWSER_EXTENSIONS="$EXTENSION_PATH"

# Open browser
agent-browser open about:blank

# Wait for extension to load
sleep 2

# Find setup page URL from meta tag
SETUP_URL=$(agent-browser eval "document.querySelector('meta[name=samui-agent-wallet-setup]')?.content" 2>/dev/null || echo "")

if [ -z "$SETUP_URL" ]; then
  echo "Could not find setup page meta tag. Extension may not be loaded."
  echo "Try loading the extension manually and navigating to its setup.html page."
  exit 1
fi

echo "Setup URL: $SETUP_URL"

# Navigate to setup page
agent-browser open "$SETUP_URL"
sleep 1

# Take snapshot to find form fields
echo "Finding form fields..."
agent-browser snapshot -i

# Fill in the form
echo "Filling setup form..."
agent-browser find label "Password" fill "$WALLET_PASSWORD"
agent-browser find label "Confirm" fill "$WALLET_PASSWORD"
agent-browser find label "Mnemonic" fill "$MNEMONIC"

# Click create
agent-browser find label "Create wallet" click

# Wait for wallet creation
sleep 3

# Read back the success screen to get public key and confirm mnemonic
echo ""
echo "Reading wallet details from success screen..."
SNAPSHOT=$(agent-browser snapshot -i 2>&1)
echo "$SNAPSHOT"

# Try to extract the public key from aria-label
WALLET_PUBLIC_KEY=$(echo "$SNAPSHOT" | grep -oP 'Wallet address: \K[A-Za-z0-9]+' || echo "UNKNOWN")

echo ""
echo "=== Wallet Created ==="
echo ""
echo "CRITICAL: Save these credentials. They are the ONLY way to recover your wallet."
echo ""
echo "  Public Key: $WALLET_PUBLIC_KEY"
echo "  Password:   $WALLET_PASSWORD"
echo "  Mnemonic:   $MNEMONIC"
echo ""

# Save credentials to persistent storage
mkdir -p "$WALLET_DIR"
cat > "$WALLET_CREDENTIALS" << CREDS
WALLET_PASSWORD=$WALLET_PASSWORD
WALLET_MNEMONIC=$MNEMONIC
WALLET_PUBLIC_KEY=$WALLET_PUBLIC_KEY
CREDS
chmod 600 "$WALLET_CREDENTIALS"
echo "Credentials saved to: $WALLET_CREDENTIALS (mode 600)"

# Back up the browser profile
PROFILE_DIR="$(node -e 'console.log(require("os").tmpdir())')/agent-browser-ext-${AGENT_BROWSER_SESSION:-default}"
mkdir -p "$WALLET_PROFILE_BACKUP"
rsync -a "$PROFILE_DIR/" "$WALLET_PROFILE_BACKUP/"
echo "Browser profile backed up to: $WALLET_PROFILE_BACKUP"

echo ""
echo "=== Next Steps ==="
echo ""
echo "1. Fund the wallet: send SOL to $WALLET_PUBLIC_KEY"
echo "2. To use in future sessions:"
echo "   source $WALLET_CREDENTIALS"
echo "   export AGENT_BROWSER_EXTENSIONS=\"$EXTENSION_PATH\""
echo "3. The wallet sidebar will appear on any page automatically."
echo "4. After browser restart, unlock with: WALLET_PASSWORD"
