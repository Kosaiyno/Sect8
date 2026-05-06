import 'server-only';

function trimWrappingQuotes(value: string) {
  const normalized = value.trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"'))
    || (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    return normalized.slice(1, -1).trim();
  }

  return normalized;
}

export function normalizeServerPrivateKey(rawValue: string | null | undefined, envName: string) {
  const trimmed = trimWrappingQuotes(String(rawValue || ''));
  if (!trimmed) {
    throw new Error(`Missing ${envName}. Add a funded 64-byte hex private key in Vercel without brackets or extra quotes.`);
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.includes('redacted')
    || lower.includes('private_key')
    || lower.includes('your_')
    || lower.includes('placeholder')
    || trimmed.includes('<')
    || trimmed.includes('[')
    || trimmed.includes(']')
  ) {
    throw new Error(`${envName} is set to a placeholder or masked value. Paste the real private key in Vercel as plain hex, with or without 0x.`);
  }

  const withoutPrefix = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-fA-F]{64}$/.test(withoutPrefix)) {
    throw new Error(`${envName} must be a 64-byte hex private key. Remove spaces, brackets, and labels, then try again.`);
  }

  return `0x${withoutPrefix}`;
}