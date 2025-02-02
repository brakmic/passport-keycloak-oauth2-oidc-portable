import { describe, it, expect } from '@jest/globals';
import KeycloakStrategy from "../../src/strategy";

describe("passport-keycloak-oauth2-oidc", () => {
  it("should export Strategy constructor", () => {
    expect(typeof KeycloakStrategy).toBe("function");
  });

  it("should export Strategy constructor as module", () => {
    const strategy = KeycloakStrategy;
    expect(typeof strategy).toBe("function");
    expect(strategy).toBe(KeycloakStrategy);
  });
});
