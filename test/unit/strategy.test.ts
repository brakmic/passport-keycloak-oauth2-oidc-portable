import KeycloakStrategy from "../../src/strategy";

const config = {
  baseAuthServerURL: "http://localhost:8080",
  realm: "myKeycloakRealm",
  clientID: "ABC123",
  clientSecret: "mySecret",
  callbackURL: "http://www.example.com",
  sslRequired: "none" as const, // Use valid value
  scopes: ["openid", "profile", "email"],
};

const urls = {
  authorizationURL: `${config.baseAuthServerURL}/realms/${config.realm}/protocol/openid-connect/auth`,
  tokenURL: `${config.baseAuthServerURL}/realms/${config.realm}/protocol/openid-connect/token`,
  userProfileURL: `${config.baseAuthServerURL}/realms/${config.realm}/protocol/openid-connect/userinfo`,
};

class TestableKeycloakStrategy extends KeycloakStrategy {
  getOptions() {
    return this.options;
  }
}

describe("KeycloakStrategy", () => {
  describe("constructed with undefined options", () => {
    it("should throw error", () => {
      expect(() => {
        new TestableKeycloakStrategy(undefined as any, function () {});
      }).toThrow(Error);
    });
  });

  describe("constructed with publicClient=true", () => {
    const strategy = new TestableKeycloakStrategy(
      {
        realm: config.realm,
        authServerURL: config.baseAuthServerURL,
        clientID: config.clientID,
        publicClient: true,
        callbackURL: config.callbackURL,
        sslRequired: config.sslRequired,
        clientSecret: config.clientSecret,
      },
      function () {}
    );

    it("should be named keycloak", () => {
      expect(strategy.name).toBe("keycloak");
    });

    it("realm should be set correctly", () => {
      expect(strategy.getOptions().realm).toBe(config.realm);
    });

    it("publicClient should be set to true", () => {
      expect(strategy.getOptions().publicClient).toBe(true);
    });

    it("sslRequired should be set correctly", () => {
      expect(strategy.getOptions().sslRequired).toBe(config.sslRequired);
    });

    it("authorizationURL should be set correctly", () => {
      expect(strategy.getOptions().authorizationURL).toBe(urls.authorizationURL);
    });

    it("tokenURL should be set correctly", () => {
      expect(strategy.getOptions().tokenURL).toBe(urls.tokenURL);
    });

    it("_userProfileURL should be set correctly", () => {
      expect(strategy["_userProfileURL"]).toBe(urls.userProfileURL);
    });

    it('should include "openid" in the scope', () => {
      expect(strategy.getOptions().scope).toContain("openid");
    });

    it("should include other specified scopes", () => {
      config.scopes.slice(1).forEach((scope) => {
        expect(strategy.getOptions().scope).toContain(scope);
      });
    });
  });

  describe("constructed with publicClient=false, but clientSecret equals to null", () => {
    it("should throw error", () => {
      expect(() => {
        new TestableKeycloakStrategy(
          {
            realm: config.realm,
            authServerURL: config.baseAuthServerURL,
            clientID: config.clientID,
            publicClient: false,
            callbackURL: config.callbackURL,
            sslRequired: config.sslRequired
          } as any,
          function () {}
        );
      }).toThrow(Error);
    });
  });

  describe("constructed with publicClient=false and clientSecret", () => {
    const strategy = new TestableKeycloakStrategy(
      {
        realm: config.realm,
        authServerURL: config.baseAuthServerURL,
        clientID: config.clientID,
        publicClient: false,
        clientSecret: config.clientSecret,
        callbackURL: config.callbackURL,
        sslRequired: config.sslRequired,
      },
      function () {}
    );

    it("clientSecret should be set correctly", () => {
      expect(strategy.getOptions().clientSecret).toBe(config.clientSecret);
    });

    it('should include "openid" in the scope even if not explicitly set', () => {
      const strategyWithoutScope = new TestableKeycloakStrategy(
        {
          realm: config.realm,
          authServerURL: config.baseAuthServerURL,
          clientID: config.clientID,
          publicClient: false,
          clientSecret: config.clientSecret,
          callbackURL: config.callbackURL,
          sslRequired: config.sslRequired,
        },
        function () {}
      );

      expect(strategyWithoutScope.getOptions().scope).toContain("openid");
    });

    it('should prepend "openid" to existing scopes if missing', () => {
      const partialScopes = "profile email";
      const strategyWithPartialScope = new TestableKeycloakStrategy(
        {
          realm: config.realm,
          authServerURL: config.baseAuthServerURL,
          clientID: config.clientID,
          publicClient: false,
          clientSecret: config.clientSecret,
          callbackURL: config.callbackURL,
          sslRequired: config.sslRequired,
          scope: partialScopes,
        },
        function () {}
      );

      expect(strategyWithPartialScope.getOptions().scope).toBe(`openid ${partialScopes}`);
    });

    it('should not duplicate "openid" if already present', () => {
      const fullScopes = config.scopes.join(" ");
      const strategyWithOpenid = new TestableKeycloakStrategy(
        {
          realm: config.realm,
          authServerURL: config.baseAuthServerURL,
          clientID: config.clientID,
          publicClient: false,
          clientSecret: config.clientSecret,
          callbackURL: config.callbackURL,
          sslRequired: config.sslRequired,
          scope: fullScopes,
        },
        function () {}
      );

      expect(strategyWithOpenid.getOptions().scope).toBe(fullScopes);
    });
  });
});
