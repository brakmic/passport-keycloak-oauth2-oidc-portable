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
  callbackUrl,
} = config;

const tokensEndpoint = `${MOCK_SERVER_PROTOCOL}://${MOCK_SERVER_HOST}:${MOCK_SERVER_PORT}/token`;

jest.setTimeout(180000); // 3-minute timeout

let didWeStartKeycloak = false;

describe('KeycloakStrategy Integration Tests for Public Clients', () => {
  let tokens;
  let codeVerifier; // Store the PKCE code_verifier for later use

  const debugLog = (message, data = null) => {
    if (DEBUG) {
      console.log(message, data || '');
    }
  };

  beforeAll(async () => {
    debugLog('Starting Keycloak container...');
    const { stdout: psOut } = await execCommand(
      `sudo docker ps -f name=${DOCKER_CONTAINER_NAME} --format "{{.Names}}"`
    );
    const containerName = (psOut || '').trim();

    if (containerName !== DOCKER_CONTAINER_NAME) {
      didWeStartKeycloak = true;
      await execCommand(`sudo docker compose -f ${DOCKER_COMPOSE_FILE} up -d`);
      await waitForServiceReady(`${keycloakBaseUrl}/realms/${REALM}/.well-known/openid-configuration`, 240000, 5000);
    }

    debugLog('Discovering Keycloak issuer from:', discoveryUrl);
    const keycloakIssuer = await Issuer.discover(discoveryUrl);
    const client = new keycloakIssuer.Client({
      client_id: CLIENT_ID,
      redirect_uris: [callbackUrl],
      response_types: ['code'],
    });

    const state = generators.state();
    codeVerifier = generators.codeVerifier(); // Generate PKCE code verifier
    const codeChallenge = generators.codeChallenge(codeVerifier); // Generate code challenge

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

    await page.goto(authUrl, { waitUntil: 'networkidle0' });
    debugLog('Navigated to Keycloak login page.');

    await page.type('#username', 'test-user'); // Update with correct username selector
    await page.type('#password', 'password'); // Update with correct password selector

    await Promise.all([
      page.click('button[type="submit"]'), // Update with correct submit button selector
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    debugLog('Login submitted. Capturing the final URL...');
    const finalUrl = page.url();
    debugLog(`Final URL after login: ${finalUrl}`);

    const url = new URL(finalUrl);
    const code = url.searchParams.get('code');
    await browser.close();

    if (!code) {
      console.error('Authorization code not found in the final URL.');
      throw new Error('Failed to capture authorization code.');
    }

    debugLog(`Authorization code captured: ${code}`);

    debugLog('Exchanging authorization code for tokens...');
    const response = await axios.post(
      tokensEndpoint,
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier, // Include the PKCE code verifier
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    tokens = response.data;
    debugLog('Tokens retrieved:', tokens);
  });

  afterAll(async () => {
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
