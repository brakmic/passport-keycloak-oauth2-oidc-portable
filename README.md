# passport-keycloak-oauth2-oidc-portable

[Passport](http://passportjs.org/) strategy for authenticating with [Keycloak](http://www.keycloak.com/) using OAuth2/OIDC.

## Table of Contents

1. [Why I Did This](#why-i-did-this)
2. [What's New](#whats-new-in-this-fork)
3. [Installation](#installation)
4. [Usage](#usage)
   - [Create an Application](#create-an-application)
   - [Configure Strategy](#configure-strategy)
   - [Public Client](#public-client)
   - [Confidential Client](#confidential-client)
   - [Complete Example](#complete-example)
5. [Development Environment](#development-environment)
   - [Docker Services](#docker-services)
   - [Available Scripts](#available-scripts)
6. [Testing](#testing)
   - [Test Environment](#test-environment)
   - [Running Tests](#running-tests)
7. [Understanding PKCE](#understanding-pkce)
8. [Additional Information](#additional-information)
9. [License](#license)

## Why I Did This

The original [passport-keycloak](https://github.com/louie007/passport-keycloak-oauth2-oidc) wasn't up to date. I modernized it with improved PKCE support, standalone client examples, and TypeScript support. Check out my blog for tutorials: [blog.brakmic.com](https://blog.brakmic.com).

## What's New in This Fork?

- **TypeScript Only**: The project is now TypeScript-based, with no JavaScript code.
- **PKCE Support**: Full Proof Key for Code Exchange (PKCE) implementation for public clients.
- **Standalone Public Client**: A single self-contained example demonstrating PKCE.
- **Keycloak via Docker Compose**: Simplified container-based setup.

## Installation

```bash
(p)npm add passport-keycloak-oauth2-oidc-portable
```
```bash
yarn add passport-keycloak-oauth2-oidc-portable
```

## Usage

### Create an Application

1. Configure your Keycloak realm
2. Create a client (public or confidential)
3. Set valid redirect URIs
4. Enable PKCE if using public client

### Configure Strategy

```typescript
import passport from 'passport';
import KeycloakStrategy from 'passport-keycloak-oauth2-oidc-portable';

passport.use(new KeycloakStrategy({
    clientID: 'your-client-id',
    realm: 'your-realm',
    publicClient: true,
    authServerURL: 'http://localhost:3000',
    callbackURL: 'http://localhost:3002/auth/callback',
    pkce: true,
    state: true
  },
  (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }
));
```

### Complete Example

```typescript
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import KeycloakStrategy from 'passport-keycloak-oauth2-oidc-portable';

const app = express();

app.use(session({
  secret: 'your-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new KeycloakStrategy({
  clientID: 'test-client',
  realm: 'TestRealm',
  publicClient: true,
  authServerURL: 'http://localhost:3000',
  callbackURL: 'http://localhost:3002/auth/callback',
  pkce: true,
  state: true
}, (accessToken, refreshToken, profile, done) => {
  return done(null, { ...profile, accessToken });
}));

app.get('/auth/keycloak', passport.authenticate('keycloak'));

app.get('/auth/callback',
  passport.authenticate('keycloak', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
  })
);

app.get('/profile',
  ensureAuthenticated,
  (req, res) => {
    res.json({ user: req.user });
  }
);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/keycloak');
}

app.listen(3002);
```

## Development Environment

### Docker Services

| Service | Internal URL | External URL | Purpose | Ports | Networks |
|---------|-------------|--------------|----------|--------|-----------|
| Keycloak | http://testcloak:8080 | http://localhost:3000 | Auth Server | 8080, 9000 | devnetwork |
| NGINX | http://test-proxy:8080 | http://localhost:3000 | Proxy | 3000, 8080 | devnetwork |
| E2E Server | http://e2e-server:4000 | N/A | Protected API | 4000 | devnetwork |
| Public Client | http://localhost:3002 | http://localhost:3002 | Example App | 3002 | host |

### Available Scripts

| Script | Purpose | Usage |
|--------|----------|-------|
| `setup:test-env` | Start test environment | `yarn setup:test-env` |
| `setup:test-env:force` | Force restart environment | `yarn setup:test-env:force` |
| `start:public-client` | Run example client | `yarn start:public-client` |
| `test:integration` | Run integration tests | `yarn test:integration` |
| `test:e2e` | Run E2E tests | `yarn test:e2e` |
| `test:unit` | Run unit tests | `yarn test:unit` |
| `test` | Run all tests | `yarn test` |

## Testing

### Test Environment

The test environment consists of:
- Keycloak server (authentication)
- NGINX proxy (routing)
- E2E server (protected resources)
- Test realm with predefined users

### Running Tests

```bash
# Start environment
yarn setup:test-env

# Run specific tests
yarn test:unit
yarn test:integration
yarn test:e2e

# Run all tests
yarn test
```

## Understanding PKCE

[PKCE](./doc/PKCE.md) (Proof Key for Code Exchange) is a security extension for OAuth 2.0 used with public clients. The implementation:

1. Generates a code verifier (random string)
2. Creates a code challenge (SHA-256 hash of verifier)
3. Sends challenge with auth request
4. Sends verifier with token request

```typescript
// PKCE Implementation Example
const { code_verifier, code_challenge } = generatePkcePair();
// code_verifier is stored in session
// code_challenge is sent with authorization request
```

## Additional Information

### Accessing Services

- Keycloak Admin: http://localhost:3000/admin
- Public Client: http://localhost:3002
- E2E Server: http://localhost:4000

### Default Credentials

- Keycloak Admin: admin/admin
- Test User: test-user/password

## License

[MIT](./LICENSE)