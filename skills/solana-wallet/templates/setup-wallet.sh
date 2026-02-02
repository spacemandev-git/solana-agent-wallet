#!/usr/bin/env bash
set -euo pipefail

# Usage: ./setup-wallet.sh <extension-path> <mnemonic>
# Example: ./setup-wallet.sh /tmp/agent-ext "word1 word2 ... word12"

EXTENSION_PATH="${1:?Usage: setup-wallet.sh <extension-path> <mnemonic>}"
MNEMONIC="${2:?Usage: setup-wallet.sh <extension-path> <mnemonic>}"

# Generate a random password
WALLET_PASSWORD=$(openssl rand -base64 32)

echo "=== Samui Agent Wallet Setup ==="
echo "Extension: $EXTENSION_PATH"
echo "Password: $WALLET_PASSWORD"
echo "================================"
echo ""
echo "IMPORTANT: Save the password above securely!"
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
agent-browser snapshot -i

# Fill in the form
# Note: refs may vary - use snapshot output to find correct refs
echo "Filling setup form..."
agent-browser find label "Password" fill "$WALLET_PASSWORD"
agent-browser find label "Confirm" fill "$WALLET_PASSWORD"
agent-browser find label "Mnemonic" fill "$MNEMONIC"

# Click create
agent-browser find label "Create wallet" click

# Wait for wallet creation
sleep 3

# Verify setup
agent-browser snapshot -i

echo ""
echo "=== Setup Complete ==="
echo "Password: $WALLET_PASSWORD"
echo "Check the snapshot output above for your public key."
echo ""
echo "To use in future sessions:"
echo "  export AGENT_BROWSER_EXTENSIONS=\"$EXTENSION_PATH\""
echo "  export WALLET_PASSWORD=\"$WALLET_PASSWORD\""
