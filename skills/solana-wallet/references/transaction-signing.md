# Transaction Signing Flow

## How Signing Works

1. A dApp initiates a transaction (e.g., swap on Jupiter, transfer on Phantom)
2. The dApp calls the Wallet Standard API (signAndSendTransaction, signTransaction, etc.)
3. The extension intercepts the request via the injected script
4. The request is forwarded to the background service worker
5. The AgentRequestService sends the request to the content-ui sidebar
6. The sidebar shows an approval panel with "Approve transaction" and "Reject transaction" buttons
7. The agent clicks approve/reject
8. On approve, the background service signs the transaction using the decrypted key and submits to the configured RPC

## Signing Request Types

| Type | Sidebar Label | Description |
|------|-------------|-------------|
| `connect` | "Connection Request" | dApp wants to connect |
| `signAndSendTransaction` | "Sign & Send Transaction" | Sign and submit to network |
| `signTransaction` | "Sign Transaction" | Sign without submitting |
| `signMessage` | "Sign Message" | Sign an arbitrary message |
| `signIn` | "Sign In Request" | Sign-in with Solana |

## Approval Flow

```bash
# 1. Trigger transaction on dApp (e.g., click "Swap" on Jupiter)
agent-browser click @<swap-button>

# 2. Wait for approval dialog to appear in sidebar
agent-browser wait 1000
agent-browser snapshot -i

# 3. Look for approval buttons
# You'll see: button "Approve transaction" and button "Reject transaction"
agent-browser click @<approve-ref>

# 4. Wait for transaction confirmation
agent-browser wait 3000
agent-browser snapshot -i
```

## Troubleshooting

### "Vault is locked" error
The vault auto-locks after 5 minutes. Unlock it:
```bash
agent-browser snapshot -i
agent-browser fill @<password-ref> "$WALLET_PASSWORD"
agent-browser click @<unlock-ref>
```

### Transaction fails
- Check the network matches the dApp (mainnet vs devnet)
- Ensure sufficient SOL balance for the transaction + fees
- Check the sidebar shows the correct network badge

### No approval dialog appears
- Verify the wallet is connected to the dApp first
- Check that the sidebar is visible (`agent-browser snapshot -i` should show sidebar elements)
- The extension may need a page refresh

### RPC endpoint issues
The extension reads the RPC URL from the active network setting. Default is mainnet (`https://api.mainnet-beta.solana.com`). Switch networks via the dropdown if needed.
