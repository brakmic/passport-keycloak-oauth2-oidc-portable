# passport-keycloak-oauth2-oidc-portable

[Passport](http://passportjs.org/) strategy for authenticating with [Keycloak](http://www.keycloak.com/) using the OAuth2/OIDC API.

This module lets you authenticate using Keycloak in your Node.js applications. By plugging into Passport, Keycloak authentication can be easily and unobtrusively integrated into any application or framework that supports [Connect](http://www.senchalabs.org/connect/)-style middleware, including [Express](http://expressjs.com/).

---

## Index

1. [Why I Did This](#why-i-did-this)
2. [What’s New in This Fork?](#whats-new-in-this-fork)
3. [Install](#install)
4. [Usage](#usage)
   - [Create an Application](#create-an-application)
   - [Configure Strategy](#configure-strategy)
   - [Example 1: Confidential Client](#example-1-confidential-client)
   - [Example 2: Public Client with Local Keycloak and Mock Server](#example-2-public-client-with-local-keycloak-and-mock-server)
   - [Example 3: Public Client Standalone](#example-3-public-client-standalone)
   - [Authenticate Requests](#authenticate-requests)
5. [Understanding PKCE](#understanding-pkce)
   - [PKCE Workflow](#pkce-workflow)
   - [PKCE ASCII Diagram](#pkce-ascii-diagram)
6. [How to Get Roles](#how-to-get-roles)
7. [Development](#development)
   - [Scripts for Starting Mock Server in Different Scenarios](#scripts-for-starting-mock-server-in-different-scenarios)
8. [Additional Information](#additional-information)
   - [Accessing Keycloak from Devcontainer](#accessing-keycloak-from-devcontainer)
9. [License](#license)

---

## Why I Did This

[This project](https://github.com/louie007/passport-keycloak-oauth2-oidc) wasn’t up to date for some time. I forked it to bring it into the modern world while trying out a few things I’ve been exploring with Keycloak. You can check out my blog for insights and tutorials: [blog.brakmic.com](https://blog.brakmic.com).

---

## What's New in This Fork?

Here’s a rundown of what I’ve added and updated:

- **PKCE Support**: Full support for Proof Key for Code Exchange (PKCE) has been added to enhance the security of public clients.
- **Standalone Public Client**: Added `public-client-standalone.js`, a fully self-contained example that completes PKCE without relying on a mock server.
- **Mock Server for Testing**: Retained the mock server (`test/mock-server.js`) for scenarios requiring more controlled debugging or testing flows.
- **Devcontainer Support**: Full support for Visual Studio Code Dev Containers to streamline development.
- **Keycloak via Docker Compose**: Keycloak is now effortlessly launched in its own container.

---

## Install

```bash
pnpm install passport-keycloak-oauth2-oidc-portable
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

**Options:**
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
      realm: 'MyRealm',
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

### Example 2: Public Client with Local Keycloak and Mock Server

This example demonstrates how to configure a public client and use a mock server to simulate the complete OpenID Connect flow with PKCE support.

1. **Start Keycloak via Docker Compose:**

   ```bash
   sudo docker compose -f test/bootstrap/docker-compose.test.yml up -d
   ```

2. **Start the Mock Server:**

   ```bash
   pnpm start:mock-server --client test-client --realm TestRealm --authServerUrl http://keycloak:8080 --handleTokenExchange true
   ```

3. **Run the Public Client:**

   ```bash
   node ./samples/public-client.js --authServerUrl http://keycloak:8080 --client test-client --use-pkce
   ```

4. **Example Code:**

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
         authServerURL: 'http://keycloak:8080', // Ensure Keycloak is running
         callbackURL: 'http://localhost:3000/callback',
       },
       (accessToken, refreshToken, profile, done) => {
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

### Example 3: Public Client Standalone

For scenarios where a mock server is unnecessary, you can use the standalone client `public-client-standalone.js`. This script communicates directly with Keycloak to complete the PKCE flow.

1. **Run the Standalone Public Client:**

   ```bash
   node ./samples/public-client-standalone.js --authServerUrl http://keycloak:8080 --client test-client --use-pkce
   ```

---

### Authenticate Requests

Use `passport.authenticate()` to authenticate incoming requests. Refer to the examples for detailed implementations.

---

### Understanding PKCE

#### PKCE Workflow

PKCE (Proof Key for Code Exchange) is a security extension for OAuth 2.0 designed to prevent authorization code interception attacks. It is particularly useful for public clients, which cannot securely store a client secret.

#### PKCE ASCII Diagram

```
Client                          Authorization Server
  |                                   |
  | --------- (1) Authorization Request --------> |
  |               + code_challenge                |
  |               + code_challenge_method         |
  |                                   |
  | <--------- (2) Authorization Code ----------- |
  |                                   |
  | --------- (3) Token Request ----------------> |
  |               + code_verifier                 |
  |                                   |
  | <--------- (4) Access Token ---------------- |
```

---

### How to Get Roles

To include roles in the UserInfo response:

1. Navigate to **Clients Scopes -> Roles -> Settings** in Keycloak.
2. Enable **Include In Token Scope**.
3. Configure Role Mappers for the client:
   - **Mapper Type:** `User Client Role`
   - **Multivalued:** `true`
   - **Token Claim Name:** `roles.resource_access.${client_id}.roles`
   - **Add to UserInfo:** `enabled`.

---

## Development

### Scripts for Starting Mock Server in Different Scenarios

1. **Integration Tests**:

   ```bash
   ./scripts/run_mock_server_for_integration_tests.sh
   ```

2. **Public Client**:

   ```bash
   ./scripts/run_mock_server_for_public_client.sh
   ```

---

## Additional Information

### Accessing Keycloak from Devcontainer

Use `http://keycloak:8080` for internal access within the devcontainer.

---

## License

[MIT](./LICENSE)
