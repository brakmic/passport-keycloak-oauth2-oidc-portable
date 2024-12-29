/* global describe, it, expect */

// ESM imports
import chai from 'chai';
import strategy from '../lib'; // "main" in package.json points to index.js

// Destructure `expect` from chai
const { expect } = chai;

describe('passport-keycloak-oauth2-oidc', function() {
  
  it('should export Strategy constructor', function() {
    expect(strategy.Strategy).to.be.a('function');
  });
    
  it('should export Strategy constructor as module', function() {
    expect(strategy).to.be.a('function');
    expect(strategy).to.equal(strategy.Strategy);
  });
  
});
