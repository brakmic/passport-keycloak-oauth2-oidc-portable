# passport-keycloak-oauth2-oidc-portable

[Passport](http://passportjs.org/) strategy for authenticating with [Keycloak](http://www.keycloak.com/) using the OAuth2/OIDC API.

This module lets you authenticate using Keycloak in your Node.js applications. By plugging into Passport, Keycloak authentication can be easily and unobtrusively integrated into any application or framework that supports [Connect](http://www.senchalabs.org/connect/)-style middleware, including [Express](http://expressjs.com/).

## Why I Did This

This project wasn’t up to date for some time. I forked it to bring it into the modern world while trying out a few things I’ve been exploring with Keycloak. I wanted to create a seamless developer experience and ensure the library works well with Keycloak’s latest features. It’s part of my broader journey into exploring and blogging about Keycloak and other technologies. You can check out my blog for insights and tutorials: [blog.brakmic.com](https://blog.brakmic.com).

When I’m not tweaking or modernizing existing projects, I’m usually deep-diving into new concepts, sharing my findings with the community, and making tools that are as elegant and developer-friendly as possible.

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

## Install

```bash
$ pnpm install passport-keycloak-oauth2-oidc
```

## Usage

### Create an Application

Before using `passport-keycloak-oauth2-oidc`, you must create a `realm` and `client` in Keycloak. Ensure that:

1. Your client is properly configured (e.g., `Access Type`, `Redirect URIs`).
2. Your realm includes the necessary scopes and role mappings.

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

```javascript
const KeyCloakStrategy = require('passport-keycloak-oauth2-oidc').Strategy;

passport.use(new KeyCloakStrategy(
  {
    clientID: 'myOauthClient',
    realm: 'MyKeyCloakRealm',
    publicClient: false,
    clientSecret: 'myClientSecret',
    sslRequired: 'external',
    authServerURL: 'https://keycloak.example.com/auth',
    callbackURL: 'https://www.example.com/keycloak/callback',
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate(..., function(err, user) {
      done(err, user);
    });
  }
));
```

### Authenticate Requests

Use `passport.authenticate()`, specifying the `'keycloak'` strategy, to authenticate requests.

```javascript
app.get('/auth/keycloak',
  passport.authenticate('keycloak', { scope: ['profile'] }));

app.get('/auth/keycloak/callback', 
  passport.authenticate('keycloak', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  });
```

### How to Get Roles

To include roles in the UserInfo response:
1. Navigate to **Clients Scopes -> Roles -> Settings** in Keycloak.
2. Enable **Include In Token Scope**.
3. Configure Role Mappers for the client:
   - Mapper Type: `User Client Role`
   - Multivalued: `true`
   - Token Claim Name: `roles.resource_access.${client_id}.roles`
   - Add to UserInfo: `enabled`.

## Development

### Devcontainer Support

This project includes a `.devcontainer/devcontainer.json` file for a streamlined development experience. Features include:
- Seamless communication between the devcontainer and Keycloak container via a shared Docker network.
- A custom Node.js environment with PNPM pre-installed.

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

The test environment is fully configurable via `test/.env.test`. The integration tests rely on the mock server to simulate complete auth flows.

## Motivation

This project reflects my interest in exploring Keycloak and building tools to simplify its usage. By modernizing this library, I wanted to ensure developers can easily integrate it into their workflows. And when I’m not working on projects like this, I write about these topics on my blog: [blog.brakmic.com](https://blog.brakmic.com).

## License

[The MIT License](http://opensource.org/licenses/MIT)
