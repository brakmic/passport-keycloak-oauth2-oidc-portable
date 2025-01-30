import OAuth2Strategy, { InternalOAuthError, StrategyOptionsWithRequest } from 'passport-oauth2';
import { Request } from 'express';

// Extend StrategyOptionsWithRequest with stateStore
declare module 'passport-oauth2' {
  interface StrategyOptionsWithRequest {
    stateStore?: OAuth2Strategy.StateStore;
  }
}

interface Profile {
  provider: string;
  id: string;
  displayName?: string;
  username?: string;
  emails?: { value: string }[];
  _raw?: string;
  _json?: any;
  _id_token?: string | null; // captured id_token
}

type VerifyCallbackWithRequest = (
  req: Request,
  accessToken: string,
  refreshToken: string,
  profile: Profile,
  done: (err: any, user?: any) => void
) => void;

interface BaseKeycloakStrategyOptions {
  authorizationURL?: string;
  tokenURL?: string;
  realm: string;
  authServerURL: string;
  clientID: string;
  callbackURL: string;
  sslRequired?: 'all' | 'external' | 'none';
  scope?: string;
  customHeaders?: Record<string, string>;
  scopeSeparator?: string;
  sessionKey?: string;
  stateStore?: OAuth2Strategy.StateStore;
  state?: any;
  skipUserProfile?: any;
  pkce?: boolean;
  proxy?: any;
}

interface KeycloakStrategyOptions extends BaseKeycloakStrategyOptions {
  publicClient?: boolean;
  clientSecret?: string;
}

class KeycloakStrategy extends OAuth2Strategy {
  protected options: KeycloakStrategyOptions;
  private _userProfileURL: string;

  constructor(options: KeycloakStrategyOptions, verify: VerifyCallbackWithRequest) {
    const realm = encodeURIComponent(options.realm || 'master');
    const publicClient = options.publicClient === true;

    if (!options.authServerURL) {
      throw new Error('Keycloak authServerURL is required.');
    }
    if (!options.callbackURL) {
      throw new Error('Keycloak callbackURL is required.');
    }
    if (!publicClient && !options.clientSecret) {
      throw new Error('Keycloak clientSecret is required for confidential clients.');
    }

    const authorizationURL = `${options.authServerURL}/realms/${realm}/protocol/openid-connect/auth`;
    const tokenURL = `${options.authServerURL}/realms/${realm}/protocol/openid-connect/token`;

    // Merge required + user-provided scopes
    const requiredScopes = ['openid', 'profile', 'email'];
    const existingScopes = options.scope
      ? Array.isArray(options.scope)
        ? options.scope
        : options.scope.split(' ')
      : [];
    const mergedScopes = Array.from(new Set([...requiredScopes, ...existingScopes])).join(' ');

    // For a public client => no secret
    const clientSecret = publicClient ? '' : options.clientSecret || '';

    options.authorizationURL = authorizationURL;
    options.tokenURL = tokenURL;
    options.scope = mergedScopes;

    const strategyOptions: StrategyOptionsWithRequest = {
      clientID: options.clientID,
      clientSecret,
      callbackURL: options.callbackURL,
      authorizationURL,
      tokenURL,
      scope: mergedScopes,
      passReqToCallback: true,
      skipUserProfile: false, // we want userProfile for e.g. displayName, emails
      pkce: options.pkce,
      customHeaders: options.customHeaders,
      scopeSeparator: options.scopeSeparator,
      state: options.state,
      stateStore: options.stateStore,
      proxy: options.proxy,
    };

    // Final verify callback
    super(strategyOptions, (req: Request, accessToken: string, refreshToken: string, profile: Profile, done: (err: any, user?: any) => void) => {
      // After the token request, we store the results on (this._oauth2 as any)._keycloakResults
      // If there's an id_token, attach it
      const tokenData = (this._oauth2 as any)._keycloakResults;
      if (tokenData && tokenData.id_token) {
        profile._id_token = tokenData.id_token;
      }
      return verify(req, accessToken, refreshToken, profile, done);
    });

    this.options = options;
    this._userProfileURL = `${options.authServerURL}/realms/${realm}/protocol/openid-connect/userinfo`;
    this.name = 'keycloak';

    // Patch the protected _request(...) method
    this._patchRequestForIdToken();
  }

  /**
   * Patches this._oauth2._request so we can parse the token response if it's the token endpoint.
   * We cast this._oauth2 to "any" to bypass TS's "protected property" restriction.
   */
  private _patchRequestForIdToken(): void {
    const tokenEndpoint = this.options.tokenURL || '';
    const oauth2Any = this._oauth2 as any;

    // The original protected method
    const originalRequest = oauth2Any._request;

    // We replace it
    oauth2Any._request = (
      method: string,
      url: string,
      headers: Record<string, string>,
      post_body: any,
      access_token: string | null,
      callback: (err: any, body?: any, res?: any) => void
    ) => {
      // If the request is going to the token endpoint, parse the response
      if (url === tokenEndpoint && method.toUpperCase() === 'POST') {
        const newCallback = (err: any, body?: string, res?: any) => {
          if (err) {
            return callback(err, body, res);
          }
          if (!body) {
            return callback(null, body, res);
          }
          try {
            const parsed = JSON.parse(body);

            // Store the entire object so the final verify can see id_token
            oauth2Any._keycloakResults = parsed;
          } catch (_parseErr) {
            // If not JSON, ignore
          }
          callback(null, body, res);
        };

        return originalRequest.call(
          this._oauth2,
          method,
          url,
          headers,
          post_body,
          access_token,
          newCallback
        );
      } else {
        // Otherwise, normal request
        return originalRequest.call(
          this._oauth2,
          method,
          url,
          headers,
          post_body,
          access_token,
          callback
        );
      }
    };
  }

  /**
   * Overridden to handle PKCE code_challenge
   */
  authorizationParams(options: any): any {
    const params: any = super.authorizationParams(options);
    if (options.req && options.req.session && options.req.session.code_challenge) {
      params.code_challenge = options.req.session.code_challenge;
      params.code_challenge_method = 'S256';
    }
    return params;
  }

  /**
   * Overridden to pass code_verifier from session if present.
   */
  tokenParams(options: any): any {
    const params: any = super.tokenParams(options);
    if (options.req && options.req.session && options.req.session.code_verifier) {
      params.code_verifier = options.req.session.code_verifier;
    }
    return params;
  }

  /**
   * The normal userProfile method to fetch e.g. displayName, emails from /userinfo
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
          _raw: bodyString,
          _json: json,
        };

        done(null, profile);
      } catch (_e) {
        done(new Error('Failed to parse user profile'));
      }
    });
  }
}

export default KeycloakStrategy;
