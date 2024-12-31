/**
 * Public Client Example for Keycloak Authentication with Dynamic PKCE Support
 *
 * This script demonstrates how to configure and use a public client with Keycloak.
 * Public clients do not require a client secret and rely on redirect URIs and other security measures.
 * Additionally, this client can dynamically support PKCE (Proof Key for Code Exchange) based on runtime flags.
 *
 * ### Usage
 *
 * 1. **Start the Mock Server**:
 *    - The mock server acts as a proxy to Keycloak for handling authentication callbacks.
 *    - Run the mock server with the `--clientId public-client` flag to align with the client ID used in this script.
 *      Example: `node test/mock-server.js --clientId public-client`
 *
 * 2. **Start the Public Client Script**:
 *    - Execute this script using Node.js.
 *      Example: `node public-client.js`
 *
 *    - **Enable PKCE Support (Optional)**:
 *      - To enable PKCE, use the `--use-pkce` flag.
 *        Example: `node public-client.js --use-pkce`
 *
 * 3. **Ensure Keycloak Configuration**:
 *    - Create a Keycloak client with the following settings:
 *      - **Client ID**: `public-client`
 *      - **Access Type**: `Public`
 *      - **Valid Redirect URIs**: `http://localhost:3000/callback`
 *      - **Web Origins**: `http://localhost:3002`
 *      - **Authorization Settings**: Enable both `Standard Flow` and `Direct Access Grants`.
 *      - **PKCE Configuration** (if using PKCE):
 *        - Ensure PKCE is enabled in the client settings.
 *        - Use the `S256` method for code challenge.
 *    - These settings ensure the authentication flow works as intended.
 *
 * 4. **Authentication Flow**:
 *    - When accessing `/auth/keycloak`, the user will be redirected to Keycloak for login.
 *    - After successful login, Keycloak redirects back to the mock server (`http://localhost:3000/callback`).
 *    - The mock server handles the token exchange, and this script processes the user's profile.
 *
 * ### Customization
 * Users can override default settings for `authServerURL`, `clientID`, `callbackURL`, `realm`, and enable PKCE via command-line flags.
 * Example: `node public-client.js --authServerURL http://custom-auth-server:8080 --clientID my-client --use-pkce`
 *
 * If no flags are provided, the script defaults to:
 * - `authServerURL`: http://localhost:8080
 * - `clientID`: public-client
 * - `callbackURL`: http://localhost:3000/callback
 * - `realm`: TestRealm
 * - `redirectUrl`: http://localhost:3002/redirect
 */
const passport = require('passport');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { Strategy: KeycloakStrategy } = require('../lib'); // Ensure this path is correct
const yargs = require('yargs');
const crypto = require('crypto');

// Parse command-line flags
const argv = yargs
  .option('authServerURL', {
    alias: 'a',
    type: 'string',
    default: 'http://localhost:8080',
    description: 'Keycloak Auth Server URL',
  })
  .option('clientID', {
    alias: 'c',
    type: 'string',
    default: 'public-client',
    description: 'Keycloak Client ID',
  })
  .option('callbackURL', {
    alias: 'u',
    type: 'string',
    default: 'http://localhost:3000/callback',
    description: 'Callback URL for Keycloak',
  })
  .option('realm', {
    alias: 'r',
    type: 'string',
    default: 'TestRealm',
    description: 'Keycloak Realm Name',
  })
  .option('redirectUrl', {
    alias: 'redirect',
    type: 'string',
    default: 'http://localhost:3002/redirect',
    description: 'Redirect URL after successful authentication',
  })
  .option('use-pkce', {
    alias: 'p',
    type: 'boolean',
    default: false,
    description: 'Enable PKCE (Proof Key for Code Exchange)',
  })
  .help()
  .argv;

// Function to generate a random string for code_verifier
function generateCodeVerifier(length = 128) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let verifier = '';
  for (let i = 0; i < length; i++) {
    verifier += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return verifier;
}

// Function to generate code_challenge from code_verifier
function generateCodeChallenge(code_verifier) {
  return crypto.createHash('sha256').update(code_verifier).digest('base64url');
}

// Application setup
const app = express();
const PORT = 3002;

// CORS configuration
app.use(
  cors({
    origin: 'http://localhost:3000', // Allow mock-server to interact with public-client
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Enable cookies
  })
);

// Session configuration
app.use(
  session({
    name: 'public-session', // Unique session name to avoid conflicts
    secret: 'public-client-secret', // Use a strong, unique secret in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set true only if using HTTPS
      sameSite: 'lax', // For testing; change to 'none' with HTTPS in production
      httpOnly: true, // Prevent client-side JavaScript access
    },
  })
);

// Passport configuration
passport.use(
  new KeycloakStrategy(
    {
      realm: argv.realm,
      authServerURL: argv.authServerURL,
      clientID: argv.clientID,
      publicClient: true,
      callbackURL: argv.callbackURL,
      sslRequired: 'none',
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  console.log('Serializing user:', user);
  done(null, user);
});

passport.deserializeUser((user, done) => {
  console.log('Deserializing user:', user);
  done(null, user);
});

// Middleware for Passport
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`Public Client Session ID: ${req.sessionID}`);
  console.log(`Authenticated User: ${JSON.stringify(req.user)}`);
  next();
});

// Routes

/**
 * Initiates authentication with Keycloak via mock-server
 */
app.get('/auth/keycloak', (req, res, next) => {
  let code_verifier = null;
  let code_challenge = null;

  if (argv['use-pkce']) {
    // Generate PKCE codes
    code_verifier = generateCodeVerifier();
    code_challenge = generateCodeChallenge(code_verifier);

    // Store code_verifier in session for later use
    req.session.code_verifier = code_verifier;
    console.log('PKCE is enabled. Generated code_verifier and code_challenge.');
  } else {
    console.log('PKCE is disabled. Proceeding without PKCE.');
  }

  // Construct state with redirectUrl and optionally code_verifier
  const statePayload = {
    redirectUrl: argv.redirectUrl,
  };

  if (argv['use-pkce']) {
    statePayload.code_verifier = code_verifier;
  }

  const state = JSON.stringify(statePayload);
  console.log('Starting authentication with state:', state);

  // Initiate authentication with PKCE parameters if enabled
  const authOptions = {
    scope: ['openid', 'profile', 'email'],
    state, // Pass the redirectUrl in the state
  };

  if (argv['use-pkce']) {
    authOptions.code_challenge = code_challenge;
    authOptions.code_challenge_method = 'S256';
  }

  passport.authenticate('keycloak', authOptions)(req, res, next);
});

/**
 * Callback route handled by KeycloakStrategy (passport)
 * In this setup, the mock-server handles the callback and redirects to /redirect with user data
 */
app.get('/auth/keycloak/callback', (req, res) => {
  // This route may not be triggered in the current flow since mock-server handles the callback
  res.redirect('/redirect');
});

/**
 * Redirect endpoint that receives user data from mock-server
 */
app.get('/redirect', (req, res, next) => {
  console.log('Handling /redirect route');

  const { state, user } = req.query;

  if (!user) {
    console.error('No user data provided in redirect.');
    return res.status(400).send('Missing user data in redirect.');
  }

  try {
    const userData = JSON.parse(decodeURIComponent(user));
    console.log('User data received:', userData);

    // Manually log in the user using Passport
    req.login(userData, (err) => {
      if (err) {
        console.error('Error logging in user:', err);
        return res.status(500).send('Authentication failed.');
      }
      console.log('User successfully logged in.');

      // Ensure session is saved before redirect
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session:', err);
          return res.status(500).send('Authentication failed.');
        }
        console.log('Session saved successfully.');
        res.redirect('/profile'); // Redirect to a protected route
      });
    });
  } catch (error) {
    console.error('Error parsing user data:', error);
    res.status(400).send('Invalid user data format.');
  }
});

/**
 * Protected route that requires authentication
 */
app.get('/profile', (req, res) => {
  console.log('Accessing /profile route');
  console.log(`Current Session ID: ${req.sessionID}`);
  console.log(`Authenticated User: ${JSON.stringify(req.user)}`);

  if (!req.isAuthenticated()) {
    console.error('User is not authenticated.');
    return res.status(401).send('Unauthorized: User not authenticated.');
  }
  res.send(`Profile Page: ${JSON.stringify(req.user)}`);
});

/**
 * Login failure route
 */
app.get('/login', (req, res) => {
  res.status(401).send('Login failed. Please try again.');
});

// Start server
app.listen(PORT, () => {
  console.log(`Public Client running on http://localhost:${PORT}`);
  console.log(`Using configuration:`);
  console.log(`  Auth Server URL: ${argv.authServerURL}`);
  console.log(`  Client ID: ${argv.clientID}`);
  console.log(`  Callback URL: ${argv.callbackURL}`);
  console.log(`  Realm: ${argv.realm}`);
  console.log(`  Redirect URL: ${argv.redirectUrl}`);
  console.log(`  PKCE Enabled: ${argv['use-pkce']}`);
  console.log(`To start the authentication process, open the following URL in your browser:`);
  console.log(`  http://localhost:${PORT}/auth/keycloak`);
});
