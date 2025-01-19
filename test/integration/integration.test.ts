import { Issuer, generators } from "openid-client";
import puppeteer from "puppeteer";
import jwt from "jsonwebtoken";
import axios from "axios";
import express from "express";
import http from "http";
import config from "../config";
import { waitForServiceReady } from "../utils";

jest.setTimeout(180000);

describe("KeycloakStrategy Integration Tests for Public Clients", () => {
  let tokens: any;
  let codeVerifier: string;
  let server: http.Server;
  const serverPort = 3003;

  beforeAll(async () => {
    const app = express();

    const authorizationCodePromise = new Promise<{ code: string; state: string }>((resolve, reject) => {
      app.get("/sink", (req, res) => {
        const { code, state } = req.query;
        if (code) {
          res.send("Authorization code received.");
          resolve({ code: code as string, state: state as string });
        } else {
          res.status(400).send("Authorization code missing.");
          reject(new Error("Authorization code missing."));
        }
      });
    });

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(serverPort, () => resolve()));

    // Wait for Keycloak server readiness
    await waitForServiceReady(config.discoveryUrl);

    // Discover Keycloak issuer
    const keycloakIssuer = await Issuer.discover(config.discoveryUrl);
    const client = new keycloakIssuer.Client({
      client_id: config.keycloak.clientId,
      redirect_uris: [`http://localhost:${serverPort}/sink`],
      response_types: ["code"],
    });

    codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    const statePayload = { redirectUrl: `http://localhost:${serverPort}/sink`, code_verifier: codeVerifier };
    const state = JSON.stringify(statePayload);

    const authUrl = client.authorizationUrl({
      scope: "openid profile email",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    // Use Puppeteer to simulate user interaction
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(authUrl, { waitUntil: "networkidle0" });

    await page.type("#username", config.user.username);
    await page.type("#password", config.user.password);

    await Promise.all([page.click("button[type=submit]"), authorizationCodePromise]);
    const { code } = await authorizationCodePromise;

    await browser.close();

    // Exchange the authorization code for tokens
    const response = await axios.post(
      `${config.keycloakBaseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `http://localhost:${serverPort}/sink`,
        client_id: config.keycloak.clientId,
        code_verifier: codeVerifier,
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    tokens = response.data;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('should include "openid" scope in the token', () => {
    const decoded = jwt.decode(tokens.id_token);
    expect(decoded).toBeDefined();
    const scopes = tokens.scope.split(" ");
    expect(scopes).toContain("openid");
  });
});
