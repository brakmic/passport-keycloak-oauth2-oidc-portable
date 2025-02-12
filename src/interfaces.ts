import { StateStore } from "node_modules/@types/passport-oauth2";

export interface Profile {
  provider: string;
  id: string;
  displayName?: string;
  username?: string;
  emails?: { value: string }[];
  _raw?: string;
  _json?: any;
  _id_token?: string | null;
}

export interface BaseKeycloakStrategyOptions {
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
  store?: StateStore;
  state?: any;
  skipUserProfile?: any;
  pkce?: boolean;
  proxy?: any;
}

export interface KeycloakStrategyOptions extends BaseKeycloakStrategyOptions {
  publicClient?: boolean;
  clientSecret?: string;
  useCustomStateStore?: boolean;
  customStateStore?: StateStore;
  customTokenURL?: string;
  [key: string]: any;
}
