const PBKDF2_ITERATIONS = 600_000
const SALT_LENGTH = 16
const IV_LENGTH = 12

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])

  return crypto.subtle.deriveKey(
    {
      hash: 'SHA-256',
      iterations: PBKDF2_ITERATIONS,
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
    },
    keyMaterial,
    { length: 256, name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypts data with AES-256-GCM using a PBKDF2-derived key.
 * Returns a base64 string containing salt (16 bytes) + iv (12 bytes) + ciphertext.
 */
export async function encrypt(data: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(password, salt)

  const encoder = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt({ iv, name: 'AES-GCM' }, key, encoder.encode(data))

  const packed = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.byteLength)
  packed.set(salt, 0)
  packed.set(iv, SALT_LENGTH)
  packed.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH)

  return btoa(String.fromCharCode(...packed))
}

/**
 * Decrypts a base64 packed blob (salt + iv + ciphertext) using the password.
 */
export async function decrypt(packed: string, password: string): Promise<string> {
  const raw = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0))
  const salt = raw.slice(0, SALT_LENGTH)
  const iv = raw.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const ciphertext = raw.slice(SALT_LENGTH + IV_LENGTH)

  const key = await deriveKey(password, salt)
  const plaintext = await crypto.subtle.decrypt({ iv, name: 'AES-GCM' }, key, ciphertext)

  return new TextDecoder().decode(plaintext)
}
