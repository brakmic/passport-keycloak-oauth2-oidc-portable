const express = require('express');
const session = require('express-session');
const axios = require('axios');
const EventEmitter = require('events');
const { mockServer: mockConfig, keycloak: keycloakConfig } = require('./config'); // Import configuration
const yargs = require('yargs');

class MockServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || mockConfig.port;
    this.callbackPath = options.callbackPath || '/callback';
    this.tokenEndpoint = options.tokenEndpoint || '/token';

    this.clientId = options.clientId || keycloakConfig.clientId;
    this.clientSecret = options.clientSecret || null;
    this.redirectUri = options.redirectUri || `${mockConfig.protocol}://${mockConfig.host}:${this.port}/callback`;
    this.authServerURL = options.authServerURL || `${keycloakConfig.protocol}://${keycloakConfig.host}:${keycloakConfig.port}`;
    this.realm = options.realm || keycloakConfig.realm;

    // Construct Keycloak endpoints
    this.realKeycloakTokenEndpoint = `${this.authServerURL}/realms/${this.realm}/protocol/openid-connect/token`;
    this.realKeycloakUserInfoEndpoint = `${this.authServerURL}/realms/${this.realm}/protocol/openid-connect/userinfo`;

    this.app = express();
    this.server = null;

    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.json());
  }

  callbackHandler(req, res) {
    const { code, state } = req.query;
    const redirectUrl = state ? JSON.parse(state).redirectUrl : null;
  
    console.log('Callback received with query:', req.query);
  
    if (!code) {
      res.status(400).send('Missing authorization code.');
      return;
    }
  
    console.log(`Authorization code received from Keycloak: ${code}`);
    this.emit('code_received', code);
  
    if (redirectUrl) {
      console.log(`Redirecting to: ${redirectUrl}`);
      res.redirect(redirectUrl); // Ensure single redirection
    } else {
      console.warn('No redirectUrl provided, finalizing authentication here.');
      res.send('Authentication successful! You can close this window.');
    }
  }
  
  

  async tokenHandler(req, res) {
    console.log('--- Token Request Received ---');
    console.log('Request Body:', req.body);

    const { grant_type, code, redirect_uri, client_id, code_verifier } = req.body;

    if (
      grant_type !== 'authorization_code' ||
      !code ||
      redirect_uri !== this.redirectUri ||
      client_id !== this.clientId ||
      !code_verifier // Ensure code_verifier is included
    ) {
      console.error('Invalid token request parameters.');
      res.status(400).json({ error: 'invalid_request', error_description: 'Invalid token request parameters.' });
      return;
    }

    try {
      console.log('Forwarding token request to Keycloak...');
      const keycloakResponse = await axios.post(
        this.realKeycloakTokenEndpoint,
        new URLSearchParams({
          grant_type,
          code,
          redirect_uri,
          client_id,
          ...(this.clientSecret && { client_secret: this.clientSecret }),
          code_verifier,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      console.log('Token response from Keycloak:', keycloakResponse.data);
      res.json(keycloakResponse.data);
      this.emit('tokens_generated', keycloakResponse.data);
    } catch (error) {
      console.error('Error forwarding token request:', error.response?.data || error.message);
      res.status(500).json({
        error: 'keycloak_error',
        error_description: error.response?.data?.error_description || error.message,
      });
    }
  }

  start() {
    return new Promise((resolve, reject) => {
      this.app.use(
        session({
          secret: 'mock-server-secret',
          resave: false,
          saveUninitialized: true,
        })
      );

      this.app.get(this.callbackPath, this.callbackHandler.bind(this));
      this.app.post(this.tokenEndpoint, this.tokenHandler.bind(this));

      this.server = this.app.listen(this.port, () => {
        console.log(`Mock server running at ${mockConfig.protocol}://${mockConfig.host}:${this.port}`);
        resolve();
      });

      this.server.on('error', (err) => reject(err));
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => (err ? reject(err) : resolve()));
      } else {
        resolve();
      }
    });
  }
}

if (require.main === module) {
  // Parse command-line arguments
  const argv = yargs
    .option('port', { alias: 'p', type: 'number', description: 'Port for the mock server' })
    .option('callbackPath', { alias: 'c', type: 'string', description: 'Callback path' })
    .option('tokenEndpoint', { alias: 't', type: 'string', description: 'Token endpoint path' })
    .option('authServerURL', { alias: 'a', type: 'string', description: 'Keycloak authorization server URL' })
    .option('realm', { alias: 'r', type: 'string', description: 'Keycloak realm' })
    .option('clientId', { alias: 'client', type: 'string', description: 'Keycloak client ID' })
    .option('clientSecret', { alias: 'secret', type: 'string', description: 'Keycloak client secret' })
    .option('redirectUri', { alias: 'redirect', type: 'string', description: 'Redirect URI' })
    .help()
    .argv;

  // Create and start the mock server
  const server = new MockServer(argv);

  server.start().then(() => console.log('Mock server started successfully.'));
}

module.exports = MockServer;