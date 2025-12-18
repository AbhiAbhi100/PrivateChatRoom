// Browser-only crypto helpers using room code as encryption key

export async function deriveKey(roomCode: string) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(roomCode),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

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
  );
}

export async function encryptText(text: string, roomCode: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(roomCode);

  const encoded = new TextEncoder().encode(text);

  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(cipher)),
  };
}

export async function decryptText(
  encrypted: { iv: number[]; data: number[] },
  roomCode: string
) {
  const key = await deriveKey(roomCode);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(encrypted.iv) },
    key,
    new Uint8Array(encrypted.data)
  );

  return new TextDecoder().decode(decrypted);
}
