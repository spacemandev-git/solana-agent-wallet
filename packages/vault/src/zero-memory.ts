/**
 * Zeros out a Uint8Array to prevent sensitive data from lingering in memory.
 */
export function zeroMemory(arr: Uint8Array): void {
  arr.fill(0)
}
