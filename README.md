# passport-keycloak-oauth2-oidc-portable

[Passport](http://passportjs.org/) strategy for authenticating with [Keycloak](http://www.keycloak.com/) using the OAuth2/OIDC API.

This module lets you authenticate using Keycloak in your Node.js applications. By plugging into Passport, Keycloak authentication can be easily and unobtrusively integrated into any application or framework that supports [Connect](http://www.senchalabs.org/connect/)-style middleware, including [Express](http://expressjs.com/).

---

## Why I Did This

This project wasn’t up to date for some time. I forked it to bring it into the modern world while trying out a few things I’ve been exploring with Keycloak. You can check out my blog for insights and tutorials: [blog.brakmic.com](https://blog.brakmic.com).

---

## What's New in This Fork?

Here’s a rundown of what I’ve added and updated:

- **Devcontainer Support**: Full support for Visual Studio Code Dev Containers to streamline development.
- **Keycloak via Docker Compose**: Keycloak is now effortlessly launched in its own container, accessible:
  - From the devcontainer: `http://keycloak:8080` (internal) and `http://keycloak:9000` (health/ready checks).
  - From your browser: `http://localhost:8080` and `http://localhost:9000`.
- **Integration Tests**: Added tests to validate OpenID Connect flows and scope handling.
- **Mock Server for Testing**: A dedicated mock server (`test/mock-server.js`) for simulating complete OpenID Connect flows.
- **Shared Network**: A shared Docker network enables communication between the devcontainer and the Keycloak container.
- **Linting**: Configured ESLint for consistent code style (`eslint.config.js`).
- **Utility Scripts**: Added utility functions for managing the Keycloak container and workspace configurations.
- **Modern Testing Framework**: Migrated from Mocha to Jest for speed and developer comfort.
- **Efficient Package Management**: Switched to PNPM for better dependency management. Nothing against npm—it’s just that PNPM is way better, faster, and more elegant.
- **CI-Ready Scripts**: Scripts for starting/stopping Keycloak, running tests, and linting are all in `package.json`.

---

## Install

```bash
$ pnpm install passport-keycloak-oauth2-oidc-portable
```

---

## Usage

### Create an Application

Before using `passport-keycloak-oauth2-oidc-portable`, you must create a `realm` and `client` in Keycloak. Ensure that:

1. Your client is properly configured (e.g., `Access Type`, `Redirect URIs`).
2. Your realm includes the necessary scopes and role mappings.

---

### Configure Strategy

The Keycloak authentication strategy authenticates requests by delegating to your Keycloak server using the OpenID Connect (OIDC/OAuth 2.0) protocol.

Options:
- `realm`: Name of your Keycloak realm (default: `master`).
- `authServerURL`: Base URL for your realm's authorization endpoint.
- `publicClient`: Whether the Keycloak client’s `Access Type` is `public` (default: `true`).
- `clientID`: Application Name, Resource, or OAuth Client Name.
- `clientSecret`: Required if `publicClient` is `false`.
- `callbackURL`: Redirect URL for post-authentication.
- `sslRequired`: SSL requirement (`all`, `external`, or `none`; default: `external`).

---

### Example 1: Confidential Client

```javascript
var KeyCloakStrategy = require('passport-keycloak-oauth2-oidc-portable').Strategy;
passport.use(
  new KeyCloakStrategy(
    {
      clientID: 'myOauthClient',
      realm: 'MyKeyCloakRealm',
      publicClient: false,
      clientSecret: '6ee0f303-faef-42d7-ba8e-00cdec755c42',
      sslRequired: 'external',
      authServerURL: 'https://your.keycloak.com/',
      callbackURL: 'https://your.server.com/callback',
    },
    function (accessToken, refreshToken, profile, done) {
      User.findOrCreate(..., function (err, user) {
        done(err, user);
      });
    }
  )
);
```

---

### Example 2: Public Client (`publicClient=true`) with Local Keycloak and Mock Server

This example demonstrates how to configure a public client and use a mock server to simulate the complete OpenID Connect flow.

1. Start Keycloak via Docker Compose:

```bash
sudo docker compose -f test/bootstrap/docker-compose.test.yml up -d
```

2. Start the Mock Server:

```bash
pnpm run mock-server
```

3. Example Code:

```javascript
const express = require('express');
const passport = require('passport');
const KeyCloakStrategy = require('passport-keycloak-oauth2-oidc-portable').Strategy;

const app = express();

// Configure the Keycloak Strategy
passport.use(
  new KeyCloakStrategy(
    {
      clientID: 'test-client', // Replace with your clientID
      realm: 'TestRealm',      // Replace with your realm
      publicClient: true,
      sslRequired: 'none',
      authServerURL: 'http://localhost:8080', // Ensure Keycloak is running
      callbackURL: 'http://localhost:3000/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      // Verify callback
      console.log('User profile:', profile);
      return done(null, profile);
    }
  )
);

// Middleware for passport
app.use(passport.initialize());

// Route to initiate authentication
app.get(
  '/auth/keycloak',
  passport.authenticate('keycloak', { scope: ['openid', 'profile', 'email'] })
);

// Callback route
app.get(
  '/auth/keycloak/callback',
  passport.authenticate('keycloak', { failureRedirect: '/login' }),
  (req, res) => {
    res.send('Authentication Successful!');
  }
);

// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

---

### Authenticate Requests

Use `passport.authenticate()` to authenticate incoming requests. Refer to the examples for detailed implementations.

---

### How to Get Roles

To include roles in the UserInfo response:
1. Navigate to **Clients Scopes -> Roles -> Settings** in Keycloak.
2. Enable **Include In Token Scope**.
3. Configure Role Mappers for the client:
   - Mapper Type: `User Client Role`
   - Multivalued: `true`
   - Token Claim Name: `roles.resource_access.${client_id}.roles`
   - Add to UserInfo: `enabled`.

---

## Development

### Integration Tests

The integration tests validate the complete OpenID Connect flow:
- Start Keycloak with:
  ```bash
  sudo docker compose -f test/bootstrap/docker-compose.test.yml up -d
  ```
- Run the mock server:
  ```bash
  pnpm run mock-server
  ```
- Execute tests:
  ```bash
  pnpm run test:integration
  ```

---

## License

[The MIT License](http://opensource.org/licenses/MIT)
