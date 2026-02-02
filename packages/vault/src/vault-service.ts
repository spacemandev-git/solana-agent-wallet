import { browser } from '@wxt-dev/browser'

import { decrypt, encrypt } from './crypto.ts'

const SESSION_KEY = 'vault-password'
const AUTO_LOCK_MS = 5 * 60 * 1000

export class VaultService {
  private password: string | null = null
  private lockTimer: ReturnType<typeof setTimeout> | null = null

  async init(): Promise<void> {
    const stored = await browser.storage.session.get(SESSION_KEY)
    if (stored[SESSION_KEY]) {
      this.password = stored[SESSION_KEY] as string
      this.resetLockTimer()
    }
  }

  async unlock(password: string): Promise<void> {
    this.password = password
    await browser.storage.session.set({ [SESSION_KEY]: password })
    this.resetLockTimer()
  }

  async lock(): Promise<void> {
    this.password = null
    await browser.storage.session.remove(SESSION_KEY)
    this.clearLockTimer()
  }

  isLocked(): boolean {
    return this.password === null
  }

  async encrypt(data: string): Promise<string> {
    if (!this.password) {
      throw new Error('Vault is locked')
    }
    this.resetLockTimer()
    return encrypt(data, this.password)
  }

  async decrypt(packed: string): Promise<string> {
    if (!this.password) {
      throw new Error('Vault is locked')
    }
    this.resetLockTimer()
    return decrypt(packed, this.password)
  }

  private resetLockTimer(): void {
    this.clearLockTimer()
    this.lockTimer = setTimeout(() => {
      void this.lock()
    }, AUTO_LOCK_MS)
  }

  private clearLockTimer(): void {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer)
      this.lockTimer = null
    }
  }
}
