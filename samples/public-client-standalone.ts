import passport from 'passport';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import KeycloakStrategy from '../src/strategy';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extend express-session with user data
 */
declare module 'express-session' {
  interface SessionData {
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
    default: 'http://localhost:3000',
    description: 'Keycloak Auth Server URL',
  })
  .option('clientId', {
    alias: 'client',
    type: 'string',
    default: 'test-client',
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
    default: true,
    description: 'Enable PKCE (Proof Key for Code Exchange)',
  })
  .help()
  .argv as YargsArguments;


// Create an Express application
const app = express();

// Debug logging
const debugLogging = true;

// Trust proxy settings
app.set('trust proxy', 1);

// Request parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(
  session({
    name: 'public-session',
    secret: process.env.SESSION_SECRET || 'public-client-secret',
    resave: true,
    saveUninitialized: true,
    proxy: true,
    cookie: {
      secure: false,
      sameSite: 'lax',
      httpOnly: true,
      path: '/',
      domain: 'localhost'
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3002'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);


// Initialize Passport and session.
app.use(passport.initialize());
app.use(passport.session());

// Debug middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (debugLogging) {
    console.log('Request Debug:', {
      url: req.url,
      method: req.method,
      sessionID: req.sessionID,
      session: req.session,
      cookies: req.headers.cookie,
      isAuthenticated: req.isAuthenticated?.()
    });
  }
  next();
});

// View Engine setup
const appRoot = path.resolve(__dirname, '..');
app.set('views', path.join(appRoot, 'samples', 'views'));
app.use(express.static(path.join(appRoot, 'samples', 'public')));
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');


/**
 * Passport configuration for KeycloakStrategy
 * - Uses public client mode
 * - PKCE is handled automatically by the strategy when enabled
 * - Uses custom state store for enhanced security
 */
passport.use(
  new KeycloakStrategy(
    {
      realm: argv.realm,
      authServerURL: argv.authServerUrl,
      clientID: argv.clientId,
      callbackURL: argv.callbackUrl,
      publicClient: true,
      sslRequired: 'none',
      scope: 'openid profile email',
      pkce: argv['use-pkce'],
      state: true
    },
    (_req: Request, accessToken: string, refreshToken: string, profile: any, done: Function) => {
      try {
        const idToken = profile._id_token || null;
        const user = {
          provider: profile.provider,
          id: profile.id,
          email_verified: profile._json?.email_verified,
          name: profile._json?.name,
          username: profile.username,
          given_name: profile._json?.given_name,
          family_name: profile._json?.family_name,
          emails: profile.emails,
          tokens: { accessToken, refreshToken, idToken }
        };
        return done(null, user);
      } catch (error) {
        console.error('Keycloak Strategy Error:', error);
        return done(error);
      }
    }
  )
);

/**
 * Serialize user into the session.
 */
passport.serializeUser((user: any, done: any) => {
  done(null, user);
});

/**
 * Deserialize user from the session.
 */
passport.deserializeUser((user: any, done: any) => {
  done(null, user);
});

/**
 * Middleware to ensure user is authenticated
 */
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

/**
 * Routes
 */

// Home page
app.get('/', (req: Request, res: Response) => {
  res.render('index', { user: req.user });
});

// Login page
app.get('/login', (_req: Request, res: Response) => {
  res.render('login');
});

/**
 * Protected profile page with session check
 */
app.get('/profile', ensureAuthenticated, (req: Request, res: Response, _next: NextFunction) => {
  if (!req.session) {
    return res.redirect('/login');
  }
  res.render('profile', { userProfile: req.user });
});

/**
 * Initiates authentication with Keycloak.
 * Ensures session is saved before redirect.
 */
app.get('/auth/keycloak', (req: Request, res: Response, next: NextFunction) => {
  req.session.save((err: any) => {
    if (err) {
      console.error('Session save error:', err);
      return next(err);
    }
    passport.authenticate('keycloak', {
      scope: ['openid', 'profile', 'email']
    })(req, res, next);
  });
});

/**
 * Handles the callback from Keycloak after authentication.
 * Verifies session and saves user data.
 */
app.get('/auth/keycloak/callback', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('keycloak', (err: any, user: any) => {
    if (err) { return next(err); }
    if (!user) { return res.redirect('/login'); }

    req.logIn(user, (err: any) => {
      if (err) { return next(err); }
      req.session.save((err: any) => {
        if (err) { return next(err); }
        res.redirect('/profile');
      });
    });
  })(req, res, next);
});

/**
 * Logs out the user and destroys session
 */
app.get('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err: any) => {
    if (err) { return next(err); }
    req.session.destroy((err: any) => {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });
});

/**
 * Debug route to inspect session data.
 */
app.get('/debug-session', (req: Request, res: Response) => {
  res.json(req.session);
});

/**
 * Global error handler
 */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).send('Internal Server Error');
});

const PORT = 3002;
// Start server
app.listen(PORT, () => {
  console.log(`Public Client running on http://localhost:${PORT}`);
  console.log('Using configuration:');
  console.log(`  Auth Server URL: ${argv.authServerUrl}`);
  console.log(`  Realm: ${argv.realm}`);
  console.log(`  Client ID: ${argv.clientId}`);
  console.log(`  Callback URL: ${argv.callbackUrl}`);
  console.log(`  PKCE Enabled: ${argv['use-pkce']}`);
  console.log('To start authentication, visit:');
  console.log(`  http://localhost:${PORT}/auth/keycloak`);
});
