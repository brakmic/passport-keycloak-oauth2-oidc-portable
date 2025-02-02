import passport from 'passport';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import KeycloakStrategy from '../src/strategy';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extend express-session to include 
 * PKCE properties.
 */
declare module 'express-session' {
  interface SessionData {
    code_verifier?: string;
    oauthState?: string;
    user?: any;
  }
}

/**
 * Define an interface for yargs arguments.
 */
interface YargsArguments {
  authServerUrl: string;
  clientId: string;
  callbackUrl: string;
  realm: string;
  'use-pkce': boolean;
  _: (string | number)[];
  $0: string;
}

/**
 * Parse command-line flags and cast as YargsArguments.
 */
const argv = yargs(hideBin(process.argv))
  .option('authServerUrl', {
    alias: 'auth',
    type: 'string',
    default: 'http://localhost:8080',
    description: 'Keycloak Auth Server URL',
  })
  .option('clientId', {
    alias: 'client',
    type: 'string',
    default: 'public-client',
    description: 'Keycloak Client ID',
  })
  .option('callbackUrl', {
    alias: 'callback',
    type: 'string',
    default: 'http://localhost:3002/auth/keycloak/callback',
    description: 'Callback URL for Keycloak',
  })
  .option('realm', {
    alias: 'r',
    type: 'string',
    default: 'TestRealm',
    description: 'Keycloak Realm Name',
  })
  .option('use-pkce', {
    alias: 'pkce',
    type: 'boolean',
    default: false,
    description: 'Enable PKCE (Proof Key for Code Exchange)',
  })
  .help()
  .argv as YargsArguments;

/**
 * Function to generate a random string for code_verifier.
 */
function generateCodeVerifier(length = 128): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  return Array.from({ length }, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
}

/**
 * Function to generate code_challenge from code_verifier.
 */
function generateCodeChallenge(code_verifier: string): string {
  return crypto.createHash('sha256').update(code_verifier).digest('base64url');
}

/**
 * Create an Express application
 */
const app = express();
const PORT = 3002;

// CORS configuration
app.use(
  cors({
    origin: 'http://localhost:3002',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// View Engine setup
const appRoot = path.resolve(__dirname, '..');
app.set('views', path.join(appRoot, 'samples', 'views'));
app.use(express.static(path.join(appRoot, 'samples', 'public')));
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');

// Session configuration
app.use(
  session({
    name: 'public-session',
    secret: process.env.SESSION_SECRET || 'public-client-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      // Secure in production
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
    },
  })
);

/**
 * Determine the client secret based on whether PKCE is used and the client is public.
 * For public clients, clientSecret should be an empty string.
 */
const isPublicClient = true;
// Replace with actual secret for confidential clients.
// const clientSecret = isPublicClient ? '' : process.env.CLIENT_SECRET || '';

/**
 * Passport configuration with passReqToCallback enabled internally.
 */
passport.use(
  new KeycloakStrategy(
    {
      realm: argv.realm,
      authServerURL: argv.authServerUrl,
      clientID: argv.clientId,
      // Must always be a string
      // clientSecret: clientSecret,
      callbackURL: argv.callbackUrl,
       // Set based on your client type
      publicClient: isPublicClient,
      sslRequired: 'none',
      scope: 'openid profile email',
      // Include other optional properties if needed
      customHeaders: undefined,
      scopeSeparator: ' ',
      sessionKey: undefined,
      store: undefined,
       // Let Passport.js handle state when PKCE is enabled
      state: argv['use-pkce'] ? true : undefined,
      skipUserProfile: undefined,
      pkce: argv['use-pkce'] ? true : undefined,
      proxy: undefined,
    },
    (
       // 'req' is now accessible in the verify callback
      _req: Request,
      _accessToken: string,
      _refreshToken: string,
      profile: any,
      done: (error: any, user?: any) => void
    ) => {
      // Map Keycloak's profile to the structure expected by the view
      const userProfile = {
        provider: profile.provider,
        id: profile.id,
        email_verified: profile._json.email_verified,
        name: profile._json.name,
        username: profile.username,
        given_name: profile._json.given_name,
        family_name: profile._json.family_name,
        emails: profile.emails,
      };

      // Pass the mapped profile to Passport's done callback
      done(null, userProfile);
    }
  )
);

/**
 * Serialize user into the session.
 */
passport.serializeUser((user: any, done) => {
  done(null, user); // `user` is stored in session
});

/**
 * Deserialize user from the session.
 */
passport.deserializeUser((user: any, done) => {
  done(null, user); // `user` is retrieved from session
});

// Initialize Passport and session.
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware for debugging.
app.use((_req: Request, _res: Response, next: NextFunction) => {
  // console.log(`Public Client Session ID: ${req.sessionID}`);
  // console.log(`Authenticated User: ${JSON.stringify(req.user.username)}`);
  next();
});

/**
 * Initiates authentication with Keycloak.
 */
app.get('/auth/keycloak', (req: Request, res: Response, next: NextFunction) => {
  let code_verifier: string | null = null;
  let code_challenge: string | null = null;

  if (argv['use-pkce']) {
    code_verifier = generateCodeVerifier();
    code_challenge = generateCodeChallenge(code_verifier);
    req.session.code_verifier = code_verifier;
    // console.log('Generated code_verifier and stored in session:', code_verifier);
  }

  // Initiate authentication.
  passport.authenticate('keycloak', {
    scope: ['openid', 'profile', 'email'],
    ...(argv['use-pkce'] && {
      code_challenge: code_challenge,
      code_challenge_method: 'S256',
    }),
  })(req, res, next);
});

/**
 * Handles the callback from Keycloak after authentication.
 * Uses a custom callback to log detailed errors.
 */
app.get('/auth/keycloak/callback', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('keycloak', (err: any, user: any, info: any) => {
    if (err) {
      console.error('Authentication Error:', err);
      return res.status(500).send('Internal Server Error during authentication.');
    }

    if (!user) {
      console.error('Authentication Failed:', info);
      return res.redirect('/login');
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error('Login Error:', err);
        return res.status(500).send('Internal Server Error during login.');
      }
      // console.log('User successfully authenticated:', user.given_name);
      return res.redirect('/profile');
    });
  })(req, res, next);
});

/**
 * Displays the user's profile information.
 */
app.get('/profile', (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).send('Unauthorized: User not authenticated.');
      return;
    }

    res.render('profile', { userProfile: req.user });
  } catch (error: unknown) {
    console.error('Error rendering profile:', error instanceof Error ? error.message : error);
    next(error); // Pass errors to Express error handler.
  }
});

/**
 * Handles login failures.
 */
app.get('/login', (_req: Request, res: Response) => {
  res.status(401).send('Authentication Failed. Please try again.');
});

/**
 * Debug route to inspect session data.
 */
app.get('/debug-session', (req: Request, res: Response) => {
  res.json(req.session);
});

/**
 * Global error handler to catch and log unexpected errors.
 */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).send('Internal Server Error');
});

// Start server.
app.listen(PORT, () => {
  console.log(`Public Client running on http://localhost:${PORT}`);
  console.log(`Using configuration:`);
  console.log(`  Auth Server URL: ${argv.authServerUrl}`);
  console.log(`  Realm: ${argv.realm}`);
  console.log(`  Client ID: ${argv.clientId}`);
  console.log(`  Callback URL: ${argv.callbackUrl}`);
  console.log(`  PKCE Enabled: ${argv['use-pkce']}`);
  console.log(`To start the authentication process, open the following URL in your browser:`);
  console.log(`  http://localhost:${PORT}/auth/keycloak`);
});
