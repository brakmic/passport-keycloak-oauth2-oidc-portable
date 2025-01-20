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
     - [Public Client](#public-client)
     - [Confidential Client](#confidential-client)
   - [Example: Public Client Standalone](#example-public-client-standalone)
   - [Authenticate Requests](#authenticate-requests)
5. [Understanding PKCE](#understanding-pkce)
   - [PKCE Workflow](#pkce-workflow)
6. [How to Get Roles](#how-to-get-roles)
7. [Development](#development)
   - [Scripts for Running Standalone Public Client](#scripts-for-running-standalone-public-client)
8. [Additional Information](#additional-information)
   - [Accessing Keycloak from Devcontainer](#accessing-keycloak-from-devcontainer)
9. [License](#license)

---

## Why I Did This

The original [passport-keycloak](https://github.com/louie007/passport-keycloak-oauth2-oidc) wasn’t up to date. I modernized it with improved PKCE support, standalone client examples, and TypeScript support. Check out my blog for tutorials: [blog.brakmic.com](https://blog.brakmic.com).

---

## What's New in This Fork?

- **TypeScript Only**: The project is now TypeScript-based, with no JavaScript code.
- **PKCE Support**: Full Proof Key for Code Exchange (PKCE) implementation for public clients.
- **Standalone Public Client**: A single self-contained example demonstrating PKCE.
- **Keycloak via Docker Compose**: Simplified container-based setup.

---

## Install

```bash
pnpm install passport-keycloak-oauth2-oidc-portable
```

---

## Usage

### Create an Application

Configure your Keycloak realm and client to support the required OAuth2 flow. Ensure:
- For a **public client**:
  - The `Access Type` is set to `public`.
  - No client secret is required.
- For a **confidential client**:
  - The `Access Type` is set to `confidential`.
  - The client secret is required.
- The `Redirect URI` matches your application's callback endpoint.

---

### Configure Strategy

#### Public Client

```typescript
import passport from "passport";
import KeycloakStrategy from "passport-keycloak-oauth2-oidc-portable";

passport.use(
  new KeycloakStrategy(
    {
      clientID: "public-client-id",
      realm: "MyRealm",
      authServerURL: "http://localhost:8080",
      callbackURL: "http://localhost:3000/callback",
      publicClient: true, // Public client does not use client secret
      pkce: true, // Enable PKCE for public clients
    },
    (accessToken, refreshToken, profile, done) => {
      console.log("Authenticated user:", profile);
      done(null, profile);
    }
  )
);
```

---

#### Confidential Client

```typescript
import passport from "passport";
import KeycloakStrategy from "passport-keycloak-oauth2-oidc-portable";

passport.use(
  new KeycloakStrategy(
    {
      clientID: "confidential-client-id",
      realm: "MyRealm",
      authServerURL: "http://localhost:8080",
      callbackURL: "http://localhost:3000/callback",
      clientSecret: "your-client-secret", // Required for confidential clients
      publicClient: false, // Set to false for confidential clients
    },
    (accessToken, refreshToken, profile, done) => {
      console.log("Authenticated user:", profile);
      done(null, profile);
    }
  )
);
```

---

### Example: Public Client Standalone

The standalone public client demonstrates PKCE without relying on external services. It directly interacts with Keycloak for authentication.

1. **Run the Standalone Public Client:**

   ```bash
   pnpm start:public-client --authServerUrl http://keycloak:8080 --client test-client --use-pkce
   ```

2. **Output:**
   - The application will print the following:
     ```bash
     Public Client running on http://localhost:3002
     Using configuration:
       Auth Server URL: http://keycloak:8080
       Realm: TestRealm
       Client ID: test-client
       Callback URL: http://localhost:3002/auth/keycloak/callback
       PKCE Enabled: true
     To start the authentication process, open the following URL in your browser:
       http://localhost:3002/auth/keycloak
     ```

3. **Visit the URL:**
   - Open `http://localhost:3002/auth/keycloak` in your browser to initiate the PKCE-based login.

4. **Key Features:**
   - Completes the PKCE flow.
   - Retrieves and logs access and ID tokens upon successful authentication.

---

### Authenticate Requests

Integrate `passport.authenticate()` middleware in your routes. Use the example above for reference.

---

## Development

### Scripts for Running Standalone Public Client

- **Start Keycloak (Docker Compose):**

  ```bash
  sudo docker compose -f test/bootstrap/docker-compose.test.yml up -d
  ```

- **Run the Standalone Client:**

  ```bash
  pnpm start:public-client --authServerUrl http://keycloak:8080 --client test-client --use-pkce
  ```

---

## License

[MIT](./LICENSE)
