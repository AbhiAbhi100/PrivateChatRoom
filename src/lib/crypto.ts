// Browser-only crypto helpers

export async function deriveKey(password: string) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("private-chat-room"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function encryptText(
  text: string,
  password: string
) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password)

  const encoded = new TextEncoder().encode(text)

  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  )

  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(cipher)),
  }
}

export async function decryptText(
  encrypted: { iv: number[]; data: number[] },
  password: string
) {
  const key = await deriveKey(password)

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(encrypted.iv) },
    key,
    new Uint8Array(encrypted.data)
  )

  return new TextDecoder().decode(decrypted)
}
