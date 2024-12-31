/**
 * Integration Test for Keycloak OAuth2 Public Client Strategy
 *
 * This test validates the compatibility of the Keycloak OAuth2 public client strategy with PKCE (Proof Key for Code Exchange) 
 * and the "openid" scope requirement for modern Keycloak servers. It ensures that the library correctly performs the following:
 *
 * 1. **OAuth2 Flow with PKCE**:
 *    - Initiates an authorization request with a code challenge.
 *    - Captures the authorization code from Keycloak after a successful login.
 *    - Exchanges the authorization code for tokens using the code verifier.
 *
 * 2. **Validation of Scopes**:
 *    - Ensures that the "openid" scope is included in the token response.
 *
 * ### Architecture
 *
 * ```
 *          ┌──────────────┐  PKCE + Auth Code  ┌───────────────┐
 *          │              │  ────────────────▶ │               │
 *          │              │                    │               │
 *   Client │ Puppeteer UI │  Redirect + Code   │   Keycloak    │
 *          │ Simulation   │  ◀───────────────  │ Authorization │
 *          │              │                    │     Server    │
 *          └──────────────┘                    └───────────────┘
 *                  │                                 ▲
 *                  │                                 │
 *   Token Exchange │   Code Verifier                 │
 *   ─────────────▶ │  + Request Tokens               │
 *                  ▼                                 │
 *          ┌─────────────────────────────────────────┘
 *          │
 *          │         Mock Server (Proxy for Tests)
 *          └─────────────────────────────────────────▶
 * ```
 *
 * ### Responsibilities
 * - The **test** acts as a client to Keycloak using Puppeteer to simulate user login.
 * - The **mock server** proxies requests between the test client and Keycloak.
 * - Keycloak handles real OAuth2 interactions, including the PKCE validation.
 *
 * ### How to Use
 * - Run this test with `jest` after ensuring that both Keycloak and the mock server are configured and running.
 * - Enable debug output using the `DEBUG_TEST=true` environment variable.
 */

const { Issuer, generators } = require('openid-client');
const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const express = require('express'); // Added for callback server
const http = require('http'); // Added for callback server

const path = require('path');
const dotenv = require('dotenv');
const rootPath = path.join(__dirname, '..');
const envFilePath = path.join(rootPath, 'test', '.env.test');
dotenv.config({ path: envFilePath });

const config = require('./config');
const { execCommand, waitForServiceReady } = require('./utils');

const DEBUG = process.env.DEBUG_TEST === 'true';

const {
  keycloak: { realm: REALM, clientId: CLIENT_ID },
  mockServer: { protocol: MOCK_SERVER_PROTOCOL, host: MOCK_SERVER_HOST, port: MOCK_SERVER_PORT },
  docker: { composeFile: DOCKER_COMPOSE_FILE, containerName: DOCKER_CONTAINER_NAME },
  keycloakBaseUrl,
  discoveryUrl,
} = config;

const tokensEndpoint = `${MOCK_SERVER_PROTOCOL}://${MOCK_SERVER_HOST}:${MOCK_SERVER_PORT}/token`;

jest.setTimeout(180000); // 3-minute timeout

let didWeStartKeycloak = false;

describe('KeycloakStrategy Integration Tests for Public Clients', () => {
  let tokens;
  let codeVerifier; // Store the PKCE code_verifier for later use
  let server; // Express server instance
  let serverPort = 3002; // Port for the temporary callback server

  // Variables to capture code and state
  let capturedCode = null;
  let capturedState = null;
  let authorizationCodeReceived = false;

  const debugLog = (message, data = null) => {
    if (DEBUG) {
      console.log(message, data || '');
    }
  };

  beforeAll(async () => {

    // **Set Up Temporary Callback Server**
    const app = express();

    // Define a Promise and its resolve and reject functions
    let resolveAuth;
    let rejectAuth;
    const authorizationCodePromise = new Promise((resolve, reject) => {
      resolveAuth = resolve;
      rejectAuth = reject;
    });

    // Define the /sink route to capture the code and state, and resolve the Promise
    app.get('/sink', (req, res) => {
      const { code, state } = req.query;
      if (code) {
        capturedCode = code;
        capturedState = state;
        authorizationCodeReceived = true;
        res.send('Authorization code received. You can close this window.');
        debugLog('Authorization code received at /sink:', { code, state });
        resolveAuth({ code, state });
      } else {
        res.status(400).send('Missing authorization code.');
        rejectAuth(new Error('Missing authorization code in /sink URL'));
      }
    });

    // Start the temporary server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(serverPort, resolve));
    debugLog(`Temporary callback server listening at http://localhost:${serverPort}/sink`);

    // **Start Keycloak Container if Not Running**
    debugLog('Starting Keycloak container...');
    const { stdout: psOut } = await execCommand(
      `sudo docker ps -f name=${DOCKER_CONTAINER_NAME} --format "{{.Names}}"`
    );
    const containerName = (psOut || '').trim();

    if (containerName !== DOCKER_CONTAINER_NAME) {
      didWeStartKeycloak = true;
      await execCommand(`sudo docker compose -f ${DOCKER_COMPOSE_FILE} up -d`);
      await waitForServiceReady(`${keycloakBaseUrl}/realms/${REALM}/.well-known/openid-connect/openid-configuration`, 240000, 5000);
    }

    // **Discover Keycloak Issuer**
    debugLog('Discovering Keycloak issuer from:', discoveryUrl);
    const keycloakIssuer = await Issuer.discover(discoveryUrl);
    const client = new keycloakIssuer.Client({
      client_id: CLIENT_ID,
      redirect_uris: [`http://localhost:${serverPort}/sink`], // Ensure this matches your temporary server's /sink URL
      response_types: ['code'],
    });

    // **Generate PKCE Code Verifier and Challenge**
    codeVerifier = generators.codeVerifier(); // Generate PKCE code verifier
    const codeChallenge = generators.codeChallenge(codeVerifier); // Generate code challenge

    // **Define the Redirect URL**
    const redirectUrl = `http://localhost:${serverPort}/sink`;

    // **Embed code_verifier and redirectUrl within the state parameter**
    const statePayload = {
      redirectUrl: redirectUrl,
      code_verifier: codeVerifier,
    };
    const state = JSON.stringify(statePayload); // Serialize as JSON string

    // **Generate Authorization URL with PKCE Parameters and Embedded State**
    const authUrl = client.authorizationUrl({
      scope: 'openid profile email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    debugLog('Launching Puppeteer to authenticate...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // **Navigate to the Authorization URL**
    await page.goto(authUrl, { waitUntil: 'networkidle0' });
    debugLog('Navigated to Keycloak login page.');

    // **Submit Login Form**
    await page.type('#username', 'test-user'); // Replace 'test-user' with a valid username
    await page.type('#password', 'password'); // Replace 'password' with the correct password

    // **Click Submit and Wait for Navigation**
    await Promise.all([
      page.click('button[type="submit"]'), // Update selector if different
      // The 'authorizationCodePromise' will resolve upon navigation to /sink with code
    ]);

    // **Wait for the Authorization Code to be Captured**
    let authData;
    try {
      authData = await authorizationCodePromise;
    } catch (error) {
      console.error(error.message);
      await browser.close();
      throw error;
    }

    const { code, state: receivedState } = authData;

    if (!code) {
      console.error('Authorization code not found in the /sink URL.');
      throw new Error('Failed to capture authorization code.');
    }

    debugLog(`Authorization code captured: ${code}`);
    debugLog(`Authorization state captured: ${receivedState}`);

    // **Close the Browser**
    await browser.close();

    // **Exchange the Code for Tokens via Mock Server's /token Endpoint**
    debugLog('Exchanging authorization code for tokens...');
    try {
      const response = await axios.post(
        tokensEndpoint,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: `http://localhost:${serverPort}/sink`,
          client_id: CLIENT_ID,
          code_verifier: codeVerifier,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );
      tokens = response.data;
      debugLog('Tokens retrieved:', tokens);
    } catch (error) {
      console.error('Error during token exchange:', error.response?.data || error.message);
      throw error; // Re-throw to fail the test
    }
  });

  afterAll(async () => {
    // **Shut Down Temporary Callback Server**
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      debugLog('Temporary callback server stopped.');
    }

    // **Stop Keycloak Container if Started by Test**
    if (didWeStartKeycloak) {
      debugLog('Stopping Keycloak container...');
      await execCommand(`sudo docker compose -f ${DOCKER_COMPOSE_FILE} down -v --remove-orphans`);
    }
  });

  it('should include "openid" scope in the token', () => {
    debugLog('Validating tokens...');
    const decoded = jwt.decode(tokens.id_token);
    expect(decoded).toBeDefined();
    debugLog('Decoded ID Token:', decoded);

    const scopes = tokens.scope.split(' ');
    expect(scopes).toContain('openid');
  });
});
