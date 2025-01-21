import OAuth2Strategy = require('passport-oauth2');
import { InternalOAuthError, StrategyOptionsWithRequest } from 'passport-oauth2';
import { Request } from 'express';

/**
 * Simplified Profile interface for user information.
 */
interface Profile {
  provider: string;
  id: string;
  displayName?: string;
  username?: string;
  emails?: { value: string }[];
  _raw?: string;
  _json?: any;
}

/**
 * Callback function to verify the user when passReqToCallback is true.
 */
type VerifyCallbackWithRequest = (
  req: Request,
  accessToken: string,
  refreshToken: string,
  profile: Profile,
  done: (err: any, user?: any) => void
) => void;

/**
 * Base options for KeycloakStrategy.
 */
interface BaseKeycloakStrategyOptions {
  authorizationURL?: string; // Optional
  tokenURL?: string;         // Optional
  realm: string;
  authServerURL: string;
  clientID: string;
  callbackURL: string;
  sslRequired?: 'all' | 'external' | 'none';
  scope?: string;
  customHeaders?: Record<string, string>;
  scopeSeparator?: string;
  sessionKey?: string;
  store?: OAuth2Strategy.StateStore;
  state?: any;
  skipUserProfile?: any;
  pkce?: boolean; // Enable PKCE
  proxy?: any;    // Proxy settings
}

/**
 * Combined KeycloakStrategyOptions type.
 * - `publicClient` is optional and determines if the client is public or confidential.
 * - `clientSecret` is optional but required for confidential clients.
 */
interface KeycloakStrategyOptions extends BaseKeycloakStrategyOptions {
  publicClient?: boolean;
  clientSecret?: string;
}

/**
 * `KeycloakStrategy` class extending `OAuth2Strategy`.
 */
class KeycloakStrategy extends OAuth2Strategy {
  protected options: KeycloakStrategyOptions;
  private _userProfileURL: string;

  /**
   * Constructs a new `KeycloakStrategy`.
   * 
   * @param options - Configuration options for the strategy.
   * @param verify - Callback function to verify the user.
   */
  constructor(options: KeycloakStrategyOptions, verify: VerifyCallbackWithRequest) {
    const realm = encodeURIComponent(options.realm || 'master');
    const publicClient = options.publicClient === true; // Explicitly true or false
    const _sslRequired = options.sslRequired || 'external';

    // Validate required options
    if (!options.authServerURL) {
      throw new Error('Keycloak authServerURL is required.');
    }
    if (!options.callbackURL) {
      throw new Error('Keycloak callbackURL is required.');
    }

    // Enforce clientSecret requirements based on publicClient flag
    if (!publicClient && !options.clientSecret) {
      throw new Error('Keycloak clientSecret is required for confidential clients.');
    }

    // Construct authorization and token URLs
    const authorizationURL = `${options.authServerURL}/realms/${realm}/protocol/openid-connect/auth`;
    const tokenURL = `${options.authServerURL}/realms/${realm}/protocol/openid-connect/token`;

    // Define scopes
    const requiredScopes = ['openid', 'profile', 'email'];
    const existingScopes = options.scope
      ? Array.isArray(options.scope)
        ? options.scope
        : options.scope.split(' ')
      : [];
    const scope = Array.from(new Set([...requiredScopes, ...existingScopes])).join(' ');

    // Conditionally set clientSecret:
    // - For public clients, default to an empty string.
    // - For confidential clients, use the provided clientSecret.
    const clientSecret = publicClient ? '' : options.clientSecret!;

    // Assign constructed URLs and scope back to options for testing purposes
    options.authorizationURL = authorizationURL;
    options.tokenURL = tokenURL;
    options.scope = scope;

    // Build the full options for OAuth2Strategy
    const strategyOptions: StrategyOptionsWithRequest = {
      clientID: options.clientID,
      clientSecret: clientSecret,
      callbackURL: options.callbackURL,
      authorizationURL: authorizationURL,
      tokenURL: tokenURL,
      scope: scope,
      passReqToCallback: true, // Must be true to access the request in verify callback
      // Include other optional properties if present
      customHeaders: options.customHeaders,
      scopeSeparator: options.scopeSeparator,
      sessionKey: options.sessionKey,
      store: options.store,
      state: options.state,
      skipUserProfile: options.skipUserProfile,
      pkce: options.pkce,
      proxy: options.proxy,
    };

    // Initialize the parent OAuth2Strategy with the constructed options
    super(strategyOptions, verify);

    this.options = options;
    this._userProfileURL = `${options.authServerURL}/realms/${realm}/protocol/openid-connect/userinfo`;
    this.name = 'keycloak';
  }

  /**
   * Override the authorizationParams method to include PKCE parameters.
   * 
   * @param options - Additional options for authorization.
   * @returns Authorization parameters including PKCE if enabled.
   */
  authorizationParams(options: any): any {
    const params: any = super.authorizationParams(options);

    if (options.code_challenge) {
      params.code_challenge = options.code_challenge;
      params.code_challenge_method = 'S256';
    }

    return params;
  }

  /**
   * Override the tokenParams method to include code_verifier from session.
   * 
   * @param options - Additional options for token exchange.
   * @returns Token parameters including code_verifier if present.
   */
  tokenParams(options: any): any {
    const params: any = {};

    if (options.req && options.req.session && options.req.session.code_verifier) {
      params.code_verifier = options.req.session.code_verifier;
    }

    return params;
  }

  /**
   * Retrieve user profile from Keycloak.
   * 
   * @param accessToken - The access token.
   * @param done - Callback to handle the retrieved profile.
   */
  userProfile(accessToken: string, done: Function): void {
    this._oauth2.useAuthorizationHeaderforGET(true);
    this._oauth2.get(this._userProfileURL, accessToken, (err: any, body?: string | Buffer) => {
      if (err) {
        return done(new InternalOAuthError('Failed to fetch user profile', err));
      }

      if (!body) {
        return done(new Error('Empty profile response'));
      }

      try {
        const bodyString = typeof body === 'string' ? body : body.toString();
        const json = JSON.parse(bodyString);

        const profile: Profile = {
          provider: 'keycloak',
          id: json.sub,
          displayName: json.name || '',
          username: json.preferred_username || '',
          emails: json.email ? [{ value: json.email }] : [],
        };

        profile._raw = bodyString;
        profile._json = json;

        done(null, profile);
      } catch (_e) {
        done(new Error('Failed to parse user profile'));
      }
    });
  }
}

export default KeycloakStrategy;
