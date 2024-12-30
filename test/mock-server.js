const express = require('express');
const session = require('express-session');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const EventEmitter = require('events');

class MockServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 3000;
    this.callbackPath = options.callbackPath || '/callback';
    this.tokenEndpoint = options.tokenEndpoint || '/token';

    this.clientId = options.clientId || 'test-client';
    this.clientSecret = options.clientSecret || null;
    this.redirectUri = options.redirectUri || `http://localhost:${this.port}/callback`;
    this.authServerURL = options.authServerURL;
    this.realm = options.realm;
    this.realKeycloakTokenEndpoint = `${this.authServerURL}/realms/${this.realm}/protocol/openid-connect/token`;
    this.realKeycloakUserInfoEndpoint = `${this.authServerURL}/realms/${this.realm}/protocol/openid-connect/userinfo`;

    this.app = express();
    this.server = null;

    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.json());
  }

  callbackHandler(req, res) {
    const { code } = req.query;

    console.log('Callback received with query:', req.query);

    if (!code) {
      res.status(400).send('Missing authorization code.');
      return;
    }

    console.log(`Authorization code received from Keycloak: ${code}`);
    this.emit('code_received', code);

    res.send('Authentication successful! You can close this window.');
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
        console.log(`Mock server running at http://localhost:${this.port}`);
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
  const yargs = require('yargs');
  const argv = yargs
    .option('port', { alias: 'p', type: 'number', default: 3000 })
    .option('callbackPath', { alias: 'c', type: 'string', default: '/callback' })
    .option('tokenEndpoint', { alias: 't', type: 'string', default: '/token' })
    .option('authServerURL', { alias: 'a', type: 'string', demandOption: true })
    .option('realm', { alias: 'r', type: 'string', demandOption: true })
    .option('clientId', { alias: 'client', type: 'string', default: 'test-client' })
    .option('clientSecret', { alias: 'secret', type: 'string', default: null })
    .option('redirectUri', { alias: 'redirect', type: 'string', default: 'http://localhost:3000/callback' })
    .help()
    .argv;

  const server = new MockServer(argv);

  server.start().then(() => console.log('Mock server started successfully.'));
}

module.exports = MockServer;
