/**
 * Helpers Module
 *
 * This module provides utility functions for OAuth2/OIDC authentication flows,
 * specifically focused on PKCE (Proof Key for Code Exchange) implementation
 * and state management for Keycloak authentication.
 *
 * Functions:
 *   - generatePkcePair: Creates PKCE verifier/challenge pairs
 *   - getDefaultCustomStateStore: Provides default state store instance
 *
 * Usage:
 *   =========
 *   import { generatePkcePair, getDefaultCustomStateStore } from './helpers';
 *
 *   // Generate PKCE pair
 *   const { code_verifier, code_challenge } = generatePkcePair();
 *
 *   // Get default state store
 *   const stateStore = getDefaultCustomStateStore();
 *   ==========
 *
 * Dependencies:
 *   - crypto: Node.js native crypto module
 *   - passport-oauth2: StateStore interface
 *   - custom-state-store: DefaultCustomStateStore implementation
 */
import { createHash, randomBytes } from 'crypto';
import { StateStore } from 'passport-oauth2';
import { DefaultCustomStateStore } from './custom-state-store';

// Performs Base64-URL encoding.
const base64URLEncode = (buffer: Buffer): string => {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Generates a PKCE pair.
const generatePkcePair = (): { code_verifier: string; code_challenge: string } => {
  // 32 bytes = 256 bits of entropy, resulting in 43 base64url chars
  // Compliant with RFC 7636 Section 4.1 (min 43, max 128 chars)
  // https://datatracker.ietf.org/doc/html/rfc7636#section-4.1
  const code_verifier = base64URLEncode(randomBytes(32));
  const hash = createHash('sha256').update(code_verifier).digest();
  const code_challenge = base64URLEncode(hash);
  return { code_verifier, code_challenge };
}

// Returns the default State Store
const getDefaultCustomStateStore = (): StateStore => {
  return new DefaultCustomStateStore();
}

export {
  generatePkcePair,
  getDefaultCustomStateStore,
}
