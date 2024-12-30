const strategy = require('../lib/index.js');

describe('passport-keycloak-oauth2-oidc', () => {
  it('should export Strategy constructor', () => {
    expect(typeof strategy.Strategy).toBe('function');
  });

  it('should export Strategy constructor as module', () => {
    expect(typeof strategy).toBe('function');
    expect(strategy).toBe(strategy.Strategy);
  });
});
