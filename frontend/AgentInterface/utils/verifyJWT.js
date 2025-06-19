import CryptoJS from "crypto-js";

/**
 * Verifies an HS256 JWT and returns the payload
 * @param {string} token - The JWT (e.g., a.b.c)
 * @param {string} secret - The shared secret used to sign
 * @returns {object} payload
 * @throws {Error} if invalid
 */
export function verifyJWT(token, secret) {
  if (!token || typeof token !== "string") throw new Error("Invalid token");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("JWT must have 3 parts");

  const [headerB64, payloadB64, signatureB64] = parts;

  const data = `${headerB64}.${payloadB64}`;
  const hash = CryptoJS.HmacSHA256(data, secret);
  const expectedSignature = CryptoJS.enc.Base64.stringify(hash)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  if (signatureB64 !== expectedSignature) throw new Error("Invalid signature");

  const payloadJson = atob(
    payloadB64
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(payloadB64.length + ((4 - (payloadB64.length % 4)) % 4), "=")
  );

  try {
    return JSON.parse(payloadJson);
  } catch {
    throw new Error("Invalid payload JSON");
  }
}
