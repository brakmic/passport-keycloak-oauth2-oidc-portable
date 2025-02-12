/**
 * CustomStateStore
 *
 * This module provides a custom state store implementation for Passport OAuth2
 * strategy, specifically designed for Keycloak authentication. It extends the
 * default state store functionality to support PKCE by storing and managing
 * both the OAuth state and PKCE code verifier in the session.
 *
 * The store will:
 *   - Generate and store OAuth state if not provided
 *   - Store PKCE code_verifier alongside state
 *   - Verify state during callback
 *   - Clean up state after verification
 *   - Support session-based storage
 *
 * Usage:
 *   =========
 *   import { DefaultCustomStateStore } from './custom-state-store';
 *   import KeycloakStrategy from './strategy';
 *
 *   const stateStore = new DefaultCustomStateStore();
 *   
 *   passport.use(new KeycloakStrategy({
 *     // ... other options ...
 *     store: stateStore,
 *     state: true,
 *     useCustomStateStore: true
 *   }, callback));
 *   ==========
 *
 * Dependencies:
 *   - Express Request
 *   - passport-oauth2 StateStore interface
 *   - Node.js crypto module for state generation
 */
import { Request } from 'express';
import { randomBytes } from 'crypto';
import {
    StateStore,
    StateStoreStoreCallback,
    StateStoreVerifyCallback
} from 'passport-oauth2';

interface OAuthState {
  state: string;
  code_verifier?: string;
}

export class DefaultCustomStateStore implements StateStore {
  // Overload signatures
  store(req: Request, callback: StateStoreStoreCallback): void;
  store(req: Request, options: any, callback: StateStoreStoreCallback): void;
  store(req: Request, optionsOrCallback: any, maybeCallback?: StateStoreStoreCallback): void {
    let options: any;
    let callback: StateStoreStoreCallback;
    if (typeof maybeCallback === 'undefined') {
      // Only callback provided; use empty options.
      options = {};
      callback = optionsOrCallback;
    } else {
      options = optionsOrCallback || {};
      callback = maybeCallback;
    }
    
    // Generate state if not provided.
    if (!options.state) {
      options.state = randomBytes(8).toString('hex');
    }
    
    const stateObj: OAuthState = {
      state: options.state,
      code_verifier: (req as any).session.code_verifier, // store verifier if available
    };
    
    // Store the state object in the session.
    (req as any).session.oauthState = stateObj;
    return callback(null, stateObj.state);
  }
  
  // Overload signatures
  verify(req: Request, providedState: string, callback: StateStoreVerifyCallback): void;
  verify(req: Request, providedState: string, options: any, callback: StateStoreVerifyCallback): void;
  verify(req: Request, providedState: string, optionsOrCallback: any, maybeCallback?: StateStoreVerifyCallback): void {
    let _options: any;
    let callback: StateStoreVerifyCallback;
    if (typeof maybeCallback === 'undefined') {
      _options = {};
      callback = optionsOrCallback;
    } else {
      _options = optionsOrCallback || {};
      callback = maybeCallback;
    }
    
    const stateObj: OAuthState | undefined = (req as any).session.oauthState;
    if (!stateObj) {
      return callback(new Error('No state stored in session'), false, undefined);
    }
    
    // Optionally remove the state after retrieval.
    delete (req as any).session.oauthState;
    
    if (providedState !== stateObj.state) {
      return callback(new Error('State does not match'), false, providedState);
    }
    
    // Pass stateObj so that the token exchange can access code_verifier.
    return callback(null as unknown as Error, true, stateObj);
  }
}
