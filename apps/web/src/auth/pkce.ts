// ─── PKCE Helpers (RFC 7636) ──────────────────────────────────────────────────
// These run entirely in the browser using the SubtleCrypto API – no library needed.

/** Generate a cryptographically random code_verifier (43-128 chars, URL-safe) */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/** Derive the code_challenge from a verifier using S256 method */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/** Generate a random state parameter to prevent CSRF */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function base64UrlEncode(buffer: Uint8Array): string {
  let str = '';
  buffer.forEach((byte) => (str += String.fromCharCode(byte)));
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
