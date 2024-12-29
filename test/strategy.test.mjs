/* global describe, it, expect */
/* jshint expr: true */

// ESM imports
import chai from 'chai';
import KeycloakStrategy from '../lib/strategy.js'; // Adjust if your library is not default-exported

const { expect } = chai;

describe('strategy', function() {

  describe('constructed with undefined options', function() {
    it('should throw error', function() {
      expect(function() {
        const strategy = new KeycloakStrategy(undefined, function(){});
      }).to.throw(Error);
    });
  });

  describe('constructed with publicClient=true', function() {
    const strategy = new KeycloakStrategy({
      realm: 'myKeycloakRealm',
      authServerURL: 'http://localhost:8080', // Updated for newer Keycloak
      clientID: 'ABC123',
      publicClient: 'true',
      callbackURL: 'http://www.example.com',
      sslRequired: 'none'
    }, function() {});

    it('should be named keycloak', function() {
      expect(strategy.name).to.equal('keycloak');
    });

    it('realm should be set to myKeycloakRealm', function() {
      expect(strategy.options.realm).to.equal('myKeycloakRealm', 'Unable to find the realm.');
    });

    it('publicClient should be set to true', function() {
      expect(strategy.options.publicClient).to.equal('true', 'Unable to find default publicClient.');
    });

    it('sslRequired should be set to none', function() {
      expect(strategy.options.sslRequired).to.equal('none', 'Unable to find default sslRequired.');
    });

    it('authorizationURL should be set', function() {
      expect(strategy.options.authorizationURL).to.equal(
        'http://localhost:8080/realms/myKeycloakRealm/protocol/openid-connect/auth'
      );
    });

    it('tokenURL should be set', function() {
      expect(strategy.options.tokenURL).to.equal(
        'http://localhost:8080/realms/myKeycloakRealm/protocol/openid-connect/token'
      );
    });

    it('_userProfileURL should be set', function() {
      expect(strategy._userProfileURL).to.equal(
        'http://localhost:8080/realms/myKeycloakRealm/protocol/openid-connect/userinfo'
      );
    });

    it('should include "openid" in the scope', function() {
      expect(strategy.options.scope).to.include('openid');
    });

    it('should include other specified scopes', function() {
      expect(strategy.options.scope).to.include('profile');
      expect(strategy.options.scope).to.include('email');
    });
  });

  describe('constructed with publicClient=false, but clientSecret equals to null', function() {
    it('should throw error', function() {
      expect(function() {
        const strategy = new KeycloakStrategy({
          realm: 'myKeycloakRealm',
          authServerURL: 'http://localhost:8080',
          clientID: 'ABC123',
          publicClient: 'false',
          callbackURL: 'http://www.example.com',
          sslRequired: 'none'
        }, function(){});
      }).to.throw(Error);
    });
  });

  describe('constructed with publicClient=false and clientSecret', function() {
    const strategy = new KeycloakStrategy({
      realm: 'myKeycloakRealm',
      authServerURL: 'http://localhost:8080',
      clientID: 'ABC123',
      publicClient: 'false',
      clientSecret: 'mySecret',
      callbackURL: 'http://www.example.com',
      sslRequired: 'none'
    }, function() {});

    it('clientSecret should be set to mySecret', function() {
      expect(strategy.options.clientSecret).to.equal('mySecret', 'Unable to find default clientSecret.');
    });

    it('should include "openid" in the scope even if not explicitly set', function() {
      const strategyWithoutScope = new KeycloakStrategy({
        realm: 'myKeycloakRealm',
        authServerURL: 'http://localhost:8080',
        clientID: 'ABC123',
        publicClient: 'false',
        clientSecret: 'mySecret',
        callbackURL: 'http://www.example.com',
        sslRequired: 'none'
        // scope is not set
      }, function() {});

      expect(strategyWithoutScope.options.scope).to.equal('openid');
    });

    it('should prepend "openid" to existing scopes if missing', function() {
      const strategyWithPartialScope = new KeycloakStrategy({
        realm: 'myKeycloakRealm',
        authServerURL: 'http://localhost:8080',
        clientID: 'ABC123',
        publicClient: 'false',
        clientSecret: 'mySecret',
        callbackURL: 'http://www.example.com',
        sslRequired: 'none',
        scope: 'profile email'
      }, function() {});

      expect(strategyWithPartialScope.options.scope).to.equal('openid profile email');
    });

    it('should not duplicate "openid" if already present', function() {
      const strategyWithOpenid = new KeycloakStrategy({
        realm: 'myKeycloakRealm',
        authServerURL: 'http://localhost:8080',
        clientID: 'ABC123',
        publicClient: 'false',
        clientSecret: 'mySecret',
        callbackURL: 'http://www.example.com',
        sslRequired: 'none',
        scope: 'openid profile email'
      }, function() {});

      expect(strategyWithOpenid.options.scope).to.equal('openid profile email');
    });
  });

});
