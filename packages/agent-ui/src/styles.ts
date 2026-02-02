export const sidebarStyles = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: #e2e8f0;
  }

  .sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 320px;
    height: 100vh;
    background: #1a1b23;
    border-left: 1px solid #2d2e3a;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .sidebar-header {
    padding: 16px;
    border-bottom: 1px solid #2d2e3a;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .sidebar-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #f1f5f9;
  }

  .sidebar-body {
    padding: 16px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .card {
    background: #252633;
    border-radius: 8px;
    padding: 12px;
  }

  .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
    margin-bottom: 4px;
  }

  .address {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: #e2e8f0;
    word-break: break-all;
  }

  .balance {
    font-size: 24px;
    font-weight: 700;
    color: #f1f5f9;
  }

  .balance-unit {
    font-size: 14px;
    font-weight: 400;
    color: #94a3b8;
    margin-left: 4px;
  }

  .network-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 500;
  }

  .network-badge.mainnet {
    background: #14532d;
    color: #4ade80;
  }

  .network-badge.devnet {
    background: #1e3a5f;
    color: #60a5fa;
  }

  .network-badge.testnet {
    background: #713f12;
    color: #fbbf24;
  }

  .network-badge.localnet {
    background: #3f3f46;
    color: #a1a1aa;
  }

  .network-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .btn {
    border: none;
    border-radius: 6px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    width: 100%;
    transition: opacity 0.15s;
  }

  .btn:hover {
    opacity: 0.9;
  }

  .btn-approve {
    background: #22c55e;
    color: #052e16;
  }

  .btn-reject {
    background: #ef4444;
    color: #fff;
  }

  .btn-secondary {
    background: #2d2e3a;
    color: #e2e8f0;
  }

  .btn-copy {
    background: none;
    border: 1px solid #2d2e3a;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 11px;
    color: #94a3b8;
    cursor: pointer;
  }

  .btn-copy:hover {
    border-color: #4b5563;
    color: #e2e8f0;
  }

  .btn-row {
    display: flex;
    gap: 8px;
  }

  .btn-row .btn {
    flex: 1;
  }

  .input {
    width: 100%;
    padding: 10px 12px;
    background: #252633;
    border: 1px solid #2d2e3a;
    border-radius: 6px;
    color: #e2e8f0;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
  }

  .input:focus {
    border-color: #6366f1;
  }

  .request-card {
    background: #252633;
    border: 1px solid #3b3c4f;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .request-type {
    font-size: 14px;
    font-weight: 600;
    color: #f1f5f9;
  }

  .request-detail {
    font-size: 12px;
    color: #94a3b8;
    word-break: break-all;
  }

  .select {
    width: 100%;
    padding: 8px 12px;
    background: #252633;
    border: 1px solid #2d2e3a;
    border-radius: 6px;
    color: #e2e8f0;
    font-size: 13px;
    outline: none;
    cursor: pointer;
    appearance: none;
    box-sizing: border-box;
  }

  .select:focus {
    border-color: #6366f1;
  }

  .lock-overlay {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 32px 16px;
  }

  .lock-icon {
    font-size: 48px;
    margin-bottom: 8px;
  }

  .lock-title {
    font-size: 18px;
    font-weight: 600;
    color: #f1f5f9;
  }

  .empty-state {
    text-align: center;
    color: #64748b;
    padding: 24px 0;
    font-size: 13px;
  }
`
