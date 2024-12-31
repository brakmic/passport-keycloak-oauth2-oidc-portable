/**
 * Confidential Client Example for Keycloak Authentication
 *
 * This script demonstrates how to configure and use a confidential client with Keycloak.
 * Confidential clients require a client secret and are typically used for server-side applications.
 *
 * ### Usage
 *
 * 1. **Start the Confidential Client Script**:
 *    - Execute this script using Node.js.
 *      Example: `node confidential-client.js`
 *
 * 2. **Ensure Keycloak Configuration**:
 *    - Create a Keycloak client with the following settings:
 *      - **Client ID**: `confidential-client`
 *      - **Access Type**: `Confidential`
 *      - **Valid Redirect URIs**: `http://localhost:3001/auth/keycloak/callback`
 *      - **Web Origins**: Not required for server-side confidential clients.
 *    - Obtain the client secret from the Keycloak client configuration.
 *
 * 3. **Authentication Flow**:
 *    - When accessing `/auth/keycloak`, the user will be redirected to Keycloak for login.
 *    - After successful login, Keycloak redirects back to the application (`http://localhost:3001/auth/keycloak/callback`).
 *    - This application then processes the user's profile and provides access to the application.
 *
 * 4. **Initiate Authentication**:
 *    - Open your browser and navigate to [http://keycloak:8080/auth/keycloak](http://keycloak:8080/auth/keycloak) to start the authentication process.
 *
 * ### Customization
 * Users can override default settings for `authServerUrl`, `clientId`, `clientSecret`, `callbackUrl`, and `realm` via command-line flags.
 * Example: `node confidential-client.js --authServerUrl http://custom-auth-server:8080 --clientId my-client --clientSecret my-secret`
 *
 * If no flags are provided, the script defaults to:
 * - `authServerURL`: http://localhost:8080
 * - `clientId`: confidential-client
 * - `clientSecret`: BTwijTL7cHax9gGHWEYBKU9blFROSbZW
 * - `callbackUrl`: http://localhost:3001/auth/keycloak/callback
 * - `realm`: TestRealm
 */

const passport = require('passport');
const express = require('express');
const session = require('express-session');
const { Strategy: KeycloakStrategy } = require('../lib');
const yargs = require('yargs');

// Parse command-line flags
const argv = yargs
  .option('authServerUrl', { alias: 'auth', type: 'string', default: 'http://keycloak:8080', description: 'Keycloak Auth Server URL' })
  .option('clientId', { alias: 'client', type: 'string', default: 'confidential-client', description: 'Keycloak Client ID' })
  .option('clientSecret', { alias: 'secret', type: 'string', default: 'BTwijTL7cHax9gGHWEYBKU9blFROSbZW', description: 'Keycloak Client Secret' })
  .option('callbackUrl', { alias: 'callback', type: 'string', default: 'http://localhost:3001/auth/keycloak/callback', description: 'Callback URL for Keycloak' })
  .option('realm', { alias: 'r', type: 'string', default: 'TestRealm', description: 'Keycloak Realm Name' })
  .help()
  .argv;

// Application setup
const app = express();
const PORT = 3001;

// Session configuration
app.use(
  session({
    secret: 'confidential-client-secret',
    resave: false,
    saveUninitialized: true,
  })
);

// Passport configuration
passport.use(
  new KeycloakStrategy(
    {
      realm: argv.realm,
      authServerURL: argv.authServerUrl,
      clientID: argv.clientId,
      clientSecret: argv.clientSecret,
      callbackURL: argv.callbackUrl,
      sslRequired: 'none',
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Middleware for Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get(
  '/auth/keycloak',
  passport.authenticate('keycloak', { scope: ['openid', 'profile', 'email'] })
);

app.get(
  '/auth/keycloak/callback',
  passport.authenticate('keycloak', {
    failureRedirect: '/login',
  }),
  (req, res) => {
    res.send(`Authentication successful! User profile: ${JSON.stringify(req.user)}`);
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`Confidential Client running on http://localhost:${PORT}`);
  console.log(`Using configuration:`);
  console.log(`  Auth Server URL: ${argv.authServerUrl}`);
  console.log(`  Client ID: ${argv.clientId}`);
  console.log(`  Client Secret: ${argv.clientSecret}`);
  console.log(`  Callback URL: ${argv.callbackUrl}`);
  console.log(`  Realm: ${argv.realm}`);
  console.log(`\nTo start the authentication process, navigate to http://localhost:3001/auth/keycloak`);
});
