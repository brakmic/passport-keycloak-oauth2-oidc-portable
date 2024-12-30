const { Strategy: KeycloakStrategy } = require('../lib/index.js');

describe('KeycloakStrategy', () => {
  describe('constructed with undefined options', () => {
    it('should throw error', () => {
      expect(() => {
        new KeycloakStrategy(undefined, function () {});
      }).toThrow(Error);
    });
  });

  describe('constructed with publicClient=true', () => {
    const strategy = new KeycloakStrategy(
      {
        realm: 'myKeycloakRealm',
        authServerURL: 'http://localhost:8080', // Updated for newer Keycloak
        clientID: 'ABC123',
        publicClient: true,
        callbackURL: 'http://www.example.com',
        sslRequired: 'none',
      },
      function () {}
    );

    it('should be named keycloak', () => {
      expect(strategy.name).toBe('keycloak');
    });

    it('realm should be set to myKeycloakRealm', () => {
      expect(strategy.options.realm).toBe('myKeycloakRealm');
    });

    it('publicClient should be set to true', () => {
      expect(strategy.options.publicClient).toBe(true);
    });

    it('sslRequired should be set to none', () => {
      expect(strategy.options.sslRequired).toBe('none');
    });

    it('authorizationURL should be set', () => {
      expect(strategy.options.authorizationURL).toBe(
        'http://localhost:8080/realms/myKeycloakRealm/protocol/openid-connect/auth'
      );
    });

    it('tokenURL should be set', () => {
      expect(strategy.options.tokenURL).toBe(
        'http://localhost:8080/realms/myKeycloakRealm/protocol/openid-connect/token'
      );
    });

    it('_userProfileURL should be set', () => {
      expect(strategy._userProfileURL).toBe(
        'http://localhost:8080/realms/myKeycloakRealm/protocol/openid-connect/userinfo'
      );
    });

    it('should include "openid" in the scope', () => {
      expect(strategy.options.scope).toContain('openid');
    });

    it('should include other specified scopes', () => {
      expect(strategy.options.scope).toContain('profile');
      expect(strategy.options.scope).toContain('email');
    });
  });

  describe('constructed with publicClient=false, but clientSecret equals to null', () => {
    it('should throw error', () => {
      expect(() => {
        new KeycloakStrategy(
          {
            realm: 'myKeycloakRealm',
            authServerURL: 'http://localhost:8080',
            clientID: 'ABC123',
            publicClient: false,
            callbackURL: 'http://www.example.com',
            sslRequired: 'none',
          },
          function () {}
        );
      }).toThrow(Error);
    });
  });

  describe('constructed with publicClient=false and clientSecret', () => {
    const strategy = new KeycloakStrategy(
      {
        realm: 'myKeycloakRealm',
        authServerURL: 'http://localhost:8080',
        clientID: 'ABC123',
        publicClient: false,
        clientSecret: 'mySecret',
        callbackURL: 'http://www.example.com',
        sslRequired: 'none',
      },
      function () {}
    );

    it('clientSecret should be set to mySecret', () => {
      expect(strategy.options.clientSecret).toBe('mySecret');
    });

    it('should include "openid" in the scope even if not explicitly set', () => {
      const strategyWithoutScope = new KeycloakStrategy(
        {
          realm: 'myKeycloakRealm',
          authServerURL: 'http://localhost:8080',
          clientID: 'ABC123',
          publicClient: false,
          clientSecret: 'mySecret',
          callbackURL: 'http://www.example.com',
          sslRequired: 'none',
          // scope is not set
        },
        function () {}
      );

      expect(strategyWithoutScope.options.scope).toBe('openid');
    });

    it('should prepend "openid" to existing scopes if missing', () => {
      const strategyWithPartialScope = new KeycloakStrategy(
        {
          realm: 'myKeycloakRealm',
          authServerURL: 'http://localhost:8080',
          clientID: 'ABC123',
          publicClient: false,
          clientSecret: 'mySecret',
          callbackURL: 'http://www.example.com',
          sslRequired: 'none',
          scope: 'profile email',
        },
        function () {}
      );

      expect(strategyWithPartialScope.options.scope).toBe('openid profile email');
    });

    it('should not duplicate "openid" if already present', () => {
      const strategyWithOpenid = new KeycloakStrategy(
        {
          realm: 'myKeycloakRealm',
          authServerURL: 'http://localhost:8080',
          clientID: 'ABC123',
          publicClient: false,
          clientSecret: 'mySecret',
          callbackURL: 'http://www.example.com',
          sslRequired: 'none',
          scope: 'openid profile email',
        },
        function () {}
      );

      expect(strategyWithOpenid.options.scope).toBe('openid profile email');
    });
  });
});
