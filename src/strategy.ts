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
 * Options for configuring the Keycloak strategy with passReqToCallback set to true.
 */
interface KeycloakStrategyOptions {
  authorizationURL?: string; // Optional
  tokenURL?: string;         // Optional
  realm: string;
  authServerURL: string;
  clientID: string;
  clientSecret: string; // Must always be a string
  callbackURL: string;
  publicClient?: boolean;
  sslRequired?: 'all' | 'external' | 'none';
  scope?: string;
  customHeaders?: Record<string, string>;
  scopeSeparator?: string;
  sessionKey?: string;
  store?: OAuth2Strategy.StateStore;
  state?: any;
  skipUserProfile?: any;
  pkce?: boolean;
  proxy?: any;
}

/**
 * `KeycloakStrategy` class extending `OAuth2Strategy`.
 */
class KeycloakStrategy extends OAuth2Strategy {
  protected options: KeycloakStrategyOptions;
  private _userProfileURL: string;

  constructor(options: KeycloakStrategyOptions, verify: VerifyCallbackWithRequest) {
    const realm = encodeURIComponent(options.realm || 'master');
    const publicClient = options.publicClient !== false; // Default to true
    const _sslRequired = options.sslRequired || 'external';
  
    if (!options.authServerURL) {
      throw new Error('Keycloak authServerURL is required.');
    }
    if (!options.callbackURL) {
      throw new Error('Keycloak callbackURL is required.');
    }
    if (!options.clientSecret && !publicClient) {
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
  
    // Extend options to include URLs and scope
    options.authorizationURL = authorizationURL;
    options.tokenURL = tokenURL;
    options.scope = scope;
  
    // Build the full options for OAuth2Strategy
    const strategyOptions: StrategyOptionsWithRequest = {
      clientID: options.clientID,
      clientSecret: options.clientSecret, // Now guaranteed to be a string
      callbackURL: options.callbackURL,
      authorizationURL,
      tokenURL,
      scope,
      passReqToCallback: true, // Must be true
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
  
    super(strategyOptions, verify);
  
    this.options = options;
    this._userProfileURL = `${options.authServerURL}/realms/${realm}/protocol/openid-connect/userinfo`;
    this.name = 'keycloak';
  }
  

  /**
   * Override the authorizationParams method to include PKCE parameters.
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
