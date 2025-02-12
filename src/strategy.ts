/**
 * KeycloakStrategy
 *
 * This module provides a Passport OAuth2 strategy for authenticating with Keycloak
 * using OpenID Connect. It supports PKCE out of the box by generating a PKCE
 * pair (code_verifier and code_challenge) and ensuring these parameters are
 * integrated into both the authorization and token exchange requests.
 *
 * The strategy will:
 *   - Generate and store a PKCE code_verifier either in the session or in the state
 *   - Append the PKCE parameters (code_challenge and code_challenge_method)
 *     to the authorization request
 *   - Retrieve and include the code_verifier in the token request
 *   - Patch the underlying _oauth2._request method to capture id_token from the token endpoint
 *
 * Usage:
 *   =========
 *   import KeycloakStrategy from 'passport-keycloak-oauth2-oidc';
 *   import passport from 'passport';
 *
 *   passport.use(new KeycloakStrategy({
 *     realm: 'your-realm',
 *     authServerURL: 'https://your-keycloak-server/auth',
 *     clientID: 'your-client-id',
 *     clientSecret: 'your-client-secret', // Only for confidential clients
 *     callbackURL: 'http://localhost:3000/auth/callback',
 *     publicClient: false, // Set to true for public clients
 *     pkce: true, // Enable PKCE
 *     state: true // Use OAuth2Strategy's StateStore for PKCE
 *   }, (req, accessToken, refreshToken, profile, done) => {
 *     return done(null, profile);
 *   }));
 *   ==========
 *
 * Dependencies:
 *   - Express Request
 *   - passport-oauth2
 *   - Node.js crypto module for PKCE
 */
import OAuth2Strategy, { InternalOAuthError, StrategyOptionsWithRequest } from 'passport-oauth2';
import { Request } from 'express';
import { generatePkcePair, getDefaultCustomStateStore} from './helpers';
import { KeycloakStrategyOptions, Profile } from './interfaces';
import { KeycloakVerifyCallback } from './types';

class KeycloakStrategy extends OAuth2Strategy {
    protected options: KeycloakStrategyOptions;
    private _userProfileURL: string;
    private _tokenEndpoint: string;

    constructor(options: KeycloakStrategyOptions, verify: KeycloakVerifyCallback) {
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
      const autoTokenURL = `${options.authServerURL}/realms/${realm}/protocol/openid-connect/token`;
      const tokenURL = options.customTokenURL || autoTokenURL;

      const requiredScopes = ['openid', 'profile', 'email'];
      const existingScopes = options.scope
        ? Array.isArray(options.scope)
          ? options.scope
          : options.scope.split(' ')
        : [];
      const mergedScopes = Array.from(new Set([...requiredScopes, ...existingScopes])).join(' ');
      const clientSecret = publicClient ? '' : (options.clientSecret || '');
      options.authorizationURL = authorizationURL;
      options.tokenURL = tokenURL;
      options.scope = mergedScopes;

      // Custom state store integration.
      if (options.useCustomStateStore) {
        options.store = options.customStateStore || getDefaultCustomStateStore();
      }

      const strategyOptions: StrategyOptionsWithRequest = {
        clientID: options.clientID,
        clientSecret,
        callbackURL: options.callbackURL,
        authorizationURL,
        tokenURL,
        scope: mergedScopes,
        passReqToCallback: true,
        skipUserProfile: false,
        customHeaders: options.customHeaders,
        scopeSeparator: options.scopeSeparator,
        state: options.state,
        store: options.store,
        proxy: options.proxy,
      };

      super(strategyOptions, (req: any, accessToken: string, refreshToken: string, profile: Profile, done: (err: any, user?: any) => void) => {
        const tokenData = (this._oauth2 as any)._keycloakResults;
        if (tokenData && tokenData.id_token) {
          profile._id_token = tokenData.id_token;
        }
        return verify(req, accessToken, refreshToken, profile, done);
      });

      this.options = { ...options };
      // Save token endpoint in a property for use in patched _request.
      this._tokenEndpoint = tokenURL;
      this._userProfileURL = `${options.authServerURL}/realms/${realm}/protocol/openid-connect/userinfo`;
      (this as OAuth2Strategy).name = 'keycloak';
      this._patchRequestForIdToken();
    }

    /**
    * Patches _oauth2._request to capture the id_token from token endpoint responses.
    */
    private _patchRequestForIdToken(): void {
      const tokenEndpoint = this._tokenEndpoint;
      const oauth2Any = this._oauth2 as any;
      const originalRequest = oauth2Any._request;

      oauth2Any._request = (
        method: string,
        url: string,
        headers: Record<string, string>,
        post_body: any,
        access_token: string | null,
        callback: (err: any, body?: any, res?: any) => void
      ) => {
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
              oauth2Any._keycloakResults = parsed;
            } catch (_parseErr) {
              // pass-through if not JSON.
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
    * Override authorizationParams to inject PKCE parameters if enabled.
    *
    * Generates a PKCE pair and stores it on the session.
    * Then adds the code_challenge and code_challenge_method to the
    * parameters sent to the authorization endpoint.
    */
    authorizationParams(options: any): object {
      const params: any = super.authorizationParams(options) || {};

      if (this.options.pkce) {
        const pkce = generatePkcePair();

        // Store the PKCE pair in the session for later use on token exchange.
        if (options.req && options.req.session) {
          options.req.session.pkce = pkce;
        }

        // Add PKCE parameters to the authorization URL.
        params.code_challenge = pkce.code_challenge;
        params.code_challenge_method = "S256";
      }

      return params;
    }

    /**
     * Override tokenParams to include the code_verifier if a PKCE pair was generated.
     *
     * This ensures that the token exchange request includes the verifier
     * necessary for public client flows.
     */
    tokenParams(options: any): object {
      const params: any = super.tokenParams(options) || {};

      if (this.options.pkce && options.req && options.req.session && options.req.session.pkce) {
        params.code_verifier = options.req.session.pkce.code_verifier;
      }

      return params;
    }

    /**
    * Fetches the user profile.
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

    /**
    * Override authenticate to ensure req is injected into options.
    */
    authenticate(req: Request, options: any = {}): void {
      options.req = req;  
      super.authenticate(req, options);
    }
}

export default KeycloakStrategy;
