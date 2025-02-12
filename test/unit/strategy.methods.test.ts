import { jest, describe, it, expect } from '@jest/globals';
import KeycloakStrategy from "../../src/strategy";
import { InternalOAuthError } from "passport-oauth2";

// Mock definitions for KeycloakStrategyOptions and VerifyCallback
interface KeycloakStrategyOptions {
  authorizationURL?: string;
  tokenURL?: string;
  realm: string;
  authServerURL: string;
  clientID: string;
  clientSecret?: string;
  callbackURL: string;
  publicClient?: boolean;
  sslRequired?: "all" | "external" | "none";
  scope?: string;
  customHeaders?: Record<string, string>;
  scopeSeparator?: string;
  sessionKey?: string;
  store?: any;
  state?: any;
  skipUserProfile?: any;
  pkce?: boolean;
  proxy?: any;
}

type VerifyCallback = (
  req: any,
  accessToken: string,
  refreshToken: string,
  profile: any,
  done: (err: any, user?: any) => void
) => void;

type OAuth2Callback = (error: any, result?: any) => void;

const baseOptionsPKCE: KeycloakStrategyOptions = {
  realm: "testRealm",
  authServerURL: "http://localhost:8080",
  clientID: "testClient",
  clientSecret: 'client_secret',
  callbackURL: "http://localhost/callback",
  pkce: true,
  state: true
};

const baseOptions: KeycloakStrategyOptions = {
  realm: "testRealm",
  authServerURL: "http://localhost:8080",
  clientID: "testClient",
  clientSecret: 'client_secret',
  callbackURL: "http://localhost/callback",
  pkce: false
};

// Extended class to expose protected methods for testing
class TestableKeycloakStrategy extends KeycloakStrategy {
  constructor(options: KeycloakStrategyOptions, verify: VerifyCallback) {
    super(options, verify);
  }

  public authorizationParams(options: any): any {
    return super.authorizationParams(options);
  }

  public tokenParams(options: any): any {
    return super.tokenParams(options);
  }

  public userProfile(accessToken: string, done: Function): void {
    super.userProfile(accessToken, done);
  }
}

describe("KeycloakStrategy Methods", () => {
  describe("authorizationParams", () => {
    it("should add PKCE parameters if provided", () => {
      const strategy = new TestableKeycloakStrategy(baseOptionsPKCE, jest.fn());
      const params = strategy.authorizationParams({ req: { session: { data: "some_data" } } });

      expect(params.code_challenge).not.toBeUndefined();
      expect(params.code_challenge_method).toBe("S256");
    });

    it("should not add PKCE parameters if pkce is false", () => {
      const strategy = new TestableKeycloakStrategy(baseOptions, jest.fn());
      const params = strategy.authorizationParams({});

      expect(params.code_challenge).toBeUndefined();
      expect(params.code_challenge_method).toBeUndefined();
    });
  });

  describe("tokenParams", () => {
    it("should add code_verifier if pkce is true", () => {
      const strategy = new TestableKeycloakStrategy(baseOptionsPKCE, jest.fn());
      const params = strategy.tokenParams({ req: { session: { pkce: { code_verifier: 'code_verifier' } }}});

      expect(params.code_verifier).not.toBeUndefined();
    });

    it("should not add code_verifier if pkce is false", () => {
      const strategy = new TestableKeycloakStrategy(baseOptions, jest.fn());
      const params = strategy.tokenParams({ req: {} });

      expect(params.code_verifier).toBeUndefined();
    });
  });

  describe("userProfile", () => {
    const mockAccessToken = "mockAccessToken";

    it("should retrieve and parse user profile correctly", (done) => {
      const mockOAuth2 = {
        useAuthorizationHeaderforGET: jest.fn(),
        get: jest.fn((_url: string, _token: string, callback: OAuth2Callback) => {
          callback(
            null,
            JSON.stringify({
              sub: "12345",
              name: "Test User",
              preferred_username: "testuser",
              email: "test@example.com",
            })
          );
        }),
      };

      class MockKeycloakStrategy extends TestableKeycloakStrategy {
        protected _oauth2 = mockOAuth2 as any;
      }

      const strategy = new MockKeycloakStrategy(baseOptionsPKCE, jest.fn());

      strategy.userProfile(mockAccessToken, (err: any, profile: any) => {
        expect(err).toBeNull();
        expect(profile).toEqual({
          provider: "keycloak",
          id: "12345",
          displayName: "Test User",
          username: "testuser",
          emails: [{ value: "test@example.com" }],
          _raw: '{"sub":"12345","name":"Test User","preferred_username":"testuser","email":"test@example.com"}',
          _json: {
            sub: "12345",
            name: "Test User",
            preferred_username: "testuser",
            email: "test@example.com",
          },
        });
        done();
      });
    });

    it("should handle errors during profile retrieval", (done) => {
      const mockOAuth2 = {
        useAuthorizationHeaderforGET: jest.fn(),
        get: jest.fn((_url: string, _token: string, callback: OAuth2Callback) => {
          callback(new Error("Failed to fetch"), null);
        }),
      };

      class MockKeycloakStrategy extends TestableKeycloakStrategy {
        protected _oauth2 = mockOAuth2 as any;
      }

      const strategy = new MockKeycloakStrategy(baseOptionsPKCE, jest.fn());

      strategy.userProfile(mockAccessToken, (err: any, profile: any) => {
        expect(err).toBeInstanceOf(InternalOAuthError);
        expect(err.message).toBe("Failed to fetch user profile");
        expect(profile).toBeUndefined();
        done();
      });
    });

    it("should handle invalid JSON in profile response", (done) => {
      const mockOAuth2 = {
        useAuthorizationHeaderforGET: jest.fn(),
        get: jest.fn((_url: string, _token: string, callback: OAuth2Callback) => {
          callback(null, "invalid JSON");
        }),
      };

      class MockKeycloakStrategy extends TestableKeycloakStrategy {
        protected _oauth2 = mockOAuth2 as any;
      }

      const strategy = new MockKeycloakStrategy(baseOptionsPKCE, jest.fn());

      strategy.userProfile(mockAccessToken, (err: any, profile: any) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe("Failed to parse user profile");
        expect(profile).toBeUndefined();
        done();
      });
    });
  });
});
