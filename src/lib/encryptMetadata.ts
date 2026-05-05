// Simple AES encryption/decryption helpers for agent metadata
// Uses Web Crypto API (browser) or Node.js crypto (SSR)

export async function encryptMetadata(metadata: object, key: string): Promise<string> {
  const text = JSON.stringify(metadata);
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    // Browser: AES-GCM
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const algo = { name: 'AES-GCM', iv };
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(key).slice(0, 32),
      algo,
      false,
      ['encrypt']
    );
    const ciphertext = await window.crypto.subtle.encrypt(algo, cryptoKey, enc.encode(text));
    // Return iv + ciphertext as base64
    const buf = new Uint8Array(iv.length + ciphertext.byteLength);
    buf.set(iv, 0);
    buf.set(new Uint8Array(ciphertext), iv.length);
    return btoa(String.fromCharCode(...buf));
  } else {
    // Node.js: crypto
    const { createCipheriv, randomBytes } = await import('crypto');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(key).slice(0, 32), iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }
}

export async function decryptMetadata(data: string, key: string): Promise<object> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    // Browser
    const buf = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const iv = buf.slice(0, 12);
    const algo = { name: 'AES-GCM', iv };
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(key).slice(0, 32),
      algo,
      false,
      ['decrypt']
    );
    const plaintext = await window.crypto.subtle.decrypt(algo, cryptoKey, buf.slice(12));
    return JSON.parse(new TextDecoder().decode(plaintext));
  } else {
    // Node.js
    const { createDecipheriv } = await import('crypto');
    const buf = Buffer.from(data, 'base64');
    const iv = buf.slice(0, 12);
    const tag = buf.slice(12, 28);
    const encrypted = buf.slice(28);
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key).slice(0, 32), iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }
}
