const express = require('express');
const cors = require('cors');
const axios = require('axios');
const EventEmitter = require('events');
const yargs = require('yargs');

class MockServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 3000;
    this.callbackPath = options.callbackPath || '/callback';
    this.tokenEndpoint = options.tokenEndpoint || '/token';
    this.forwardCallbackUrl = options.forwardCallbackUrl || null;
    this.handleTokenExchange = options.handleTokenExchange || false;

    this.clientId = options.clientId || 'public-client';
    this.clientSecret = options.clientSecret || null;
    this.redirectUrl = options.redirectUrl || `http://localhost:${this.port}${this.callbackPath}`;
    this.authServerUrl = options.authServerUrl || 'http://localhost:8080';
    this.realm = options.realm || 'TestRealm';

   
    this.realKeycloakTokenEndpoint = `${this.authServerUrl}/realms/${this.realm}/protocol/openid-connect/token`;
    this.realKeycloakUserInfoEndpoint = `${this.authServerUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`;

    this.app = express();
    this.server = null;

    // Middleware setup
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.json());
    this.app.use(
      cors({
        origin: 'http://localhost:3002',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      })
    );

    
    this.app.use((req, res, next) => {
      console.log(`Mock Server received request: ${req.method} ${req.url}`);
      next();
    });

   
    console.log(`Keycloak Auth Server URL: ${this.authServerUrl}`);
  }

  async callbackHandler(req, res) {
    const { code, state, error, error_description } = req.query;
    let redirectUrl = 'http://localhost:3002/redirect';
    let code_verifier = null;

   
    if (error) {
      console.error(`Error during authentication: ${error} - ${error_description}`);
      return res.status(400).send(`Authentication Error: ${error_description}`);
    }

    // Attempt to parse the state parameter as JSON
    try {
      const parsedState = JSON.parse(state);
      redirectUrl = parsedState.redirectUrl || redirectUrl;
      code_verifier = parsedState.code_verifier || null;
      console.log('Parsed state as JSON:', parsedState);
    } catch (error) {
      // If parsing fails, assume state is a plain string (non-PKCE flow)
      console.error('Error parsing state parameter:', error);
      console.log('State is not JSON. Using default redirectUrl:', redirectUrl);

      console.log('State:', state);
    }

    if (!code) {
      console.error('Missing authorization code in callback.');
      res.status(400).send('Missing authorization code.');
      return;
    }

    console.log(`Authorization code received from Keycloak: ${code}`);
    this.emit('code_received', code);

    if (this.handleTokenExchange) {
      // **Handle Token Exchange Internally**
      try {
        const tokenRequestBody = {
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUrl,
          client_id: this.clientId,
        };

        if (this.clientSecret) {
          tokenRequestBody.client_secret = this.clientSecret;
        }

        if (code_verifier) {
          tokenRequestBody.code_verifier = code_verifier;
          console.log('PKCE is enabled. Including code_verifier in token exchange.');
        } else {
          console.log('PKCE is not used. Proceeding without code_verifier.');
        }

        console.log('Token Exchange Request Body:', tokenRequestBody);

        const tokenResponse = await axios.post(
          this.realKeycloakTokenEndpoint,
          new URLSearchParams(tokenRequestBody).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );

        console.log('Token Exchange Response Data:', tokenResponse.data);

        const { access_token } = tokenResponse.data;

        if (!access_token) {
          throw new Error('No access_token found in token exchange response.');
        }

        console.log('Using Access Token for User Info:', access_token);

        // Retrieve user info from Keycloak
        const userInfoResponse = await axios.get(this.realKeycloakUserInfoEndpoint, {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });

        console.log('User Info Response Data:', userInfoResponse.data);

        const userProfile = userInfoResponse.data;
        console.log('User profile retrieved:', userProfile);

        // Redirect to redirectUrl with user data
        if (redirectUrl) {
          // Encode user data as a JSON string and then URI encode it
          const userData = encodeURIComponent(JSON.stringify(userProfile));
          const updatedState = encodeURIComponent(state);
          res.redirect(`${redirectUrl}?state=${updatedState}&user=${userData}`);
          console.log(`Redirecting to: ${redirectUrl} with state and user data`);
        } else {
          console.warn('No redirectUrl provided, finalizing authentication here.');
          res.send('Authentication successful! You can close this window.');
        }
      } catch (error) {
        console.error('Error during token exchange or user info retrieval:', error.response?.data || error.message);
        res.status(500).send('Authentication failed during token exchange.');
      }
    } else if (this.forwardCallbackUrl) {
      // **Forward Authorization Code to Configurable Callback URL**
      try {
        // Construct the forwarding URL with code and state
        const forwardingUrl = new URL(this.forwardCallbackUrl);
        forwardingUrl.searchParams.append('code', code);
        forwardingUrl.searchParams.append('state', state);

        console.log(`Forwarding authorization code to: ${forwardingUrl.toString()}`);
        res.redirect(forwardingUrl.toString());
      } catch (error) {
        console.error('Error during code forwarding:', error.message);
        res.status(500).send('Authentication failed during code forwarding.');
      }
    } else {
      // **Default Behavior: Redirect with Code and State**
      try {
        if (redirectUrl) {
          // Encode code and state as query parameters
          const updatedState = encodeURIComponent(state);
          const updatedCode = encodeURIComponent(code);
          res.redirect(`${redirectUrl}?state=${updatedState}&code=${updatedCode}`);
          console.log(`Redirecting to: ${redirectUrl} with state and code`);
        } else {
          console.warn('No redirectUrl provided, finalizing authentication here.');
          res.send('Authentication successful! You can close this window.');
        }
      } catch (error) {
        console.error('Error during redirect:', error.message);
        res.status(500).send('Authentication failed during redirect.');
      }
    }
  }

  async tokenHandler(req, res) {
    console.log('--- Token Request Received ---');
    console.log('Request Body:', req.body);

    const { grant_type, code, redirect_uri, client_id, code_verifier } = req.body;

    // Validate required parameters
    if (
      grant_type !== 'authorization_code' ||
      !code ||
      redirect_uri !== this.redirectUrl ||
      client_id !== this.clientId
      // Note: code_verifier is optional based on PKCE usage
    ) {
      console.error('Invalid token request parameters.');
      res.status(400).json({ error: 'invalid_request', error_description: 'Invalid token request parameters.' });
      return;
    }

    // Prepare token exchange request
    const tokenRequestBody = {
      grant_type,
      code,
      redirect_uri,
      client_id,
    };

    if (this.clientSecret) {
      tokenRequestBody.client_secret = this.clientSecret;
    }

    if (code_verifier) {
      tokenRequestBody.code_verifier = code_verifier;
      console.log('Including code_verifier in token exchange.');
    }

    try {
      console.log('Forwarding token request to Keycloak...');
      const keycloakResponse = await axios.post(
        this.realKeycloakTokenEndpoint,
        new URLSearchParams(tokenRequestBody).toString(),
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
      this.app.get(this.callbackPath, this.callbackHandler.bind(this));
      this.app.post(this.tokenEndpoint, this.tokenHandler.bind(this));

      // Start server
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
  const argv = yargs
    .option('port', { alias: 'p', type: 'number', description: 'Port for the mock server' })
    .option('callbackPath', { alias: 'c', type: 'string', description: 'Callback path' })
    .option('tokenEndpoint', { alias: 't', type: 'string', description: 'Token endpoint path' })
    .option('authServerUrl', { alias: 'a', type: 'string', description: 'Keycloak authorization server URL' })
    .option('realm', { alias: 'r', type: 'string', description: 'Keycloak realm' })
    .option('clientId', { alias: 'client', type: 'string', description: 'Keycloak client ID' })
    .option('clientSecret', { alias: 'secret', type: 'string', description: 'Keycloak client secret' })
    .option('redirectUrl', { alias: 'redirect', type: 'string', description: 'Redirect URL' })
    .option('handleTokenExchange', { alias: 'h', type: 'boolean', description: 'Handle token exchange internally', default: false })
    .option('forwardCallbackUrl', { alias: 'f', type: 'string', description: 'Forward authorization code to this callback URL' })
    .help()
    .argv;

  // Create and start the mock server
  const server = new MockServer(argv);

  server.start().then(() => console.log('Mock server started successfully.'));
}

module.exports = MockServer;
