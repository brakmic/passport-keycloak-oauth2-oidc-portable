import { jest, describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import { Issuer, generators } from "openid-client";
import puppeteer from "puppeteer";
import axios from "axios";
import { createServer } from "http";
import type { Server } from "http";
import config from "../config";
import { waitForServiceReady } from "../utils";

jest.setTimeout(180000);

let express: any;

describe("E2E Test for Authentication and Protected Resource", () => {
  let tokens: any;
  let server: Server;

  beforeAll(async () => {
    express = (await import('express')).default;
    // Start a lightweight callback server for handling the `/sink` route
    const app = express();
    const serverPort = 3000;

    const authorizationCodePromise = new Promise<string>((resolve, reject) => {
      app.get("/sink", (req: any, res: any) => {
        const { code } = req.query;
        if (code) {
          res.send("Authorization code received.");
          resolve(code as string);
        } else {
          res.status(400).send("Authorization code missing.");
          reject(new Error("Authorization code missing."));
        }
      });
    });

    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(serverPort, resolve));
    console.log(`Callback server running at http://localhost:${serverPort}/sink`);

    // Wait for Keycloak server readiness
    await waitForServiceReady(config.discoveryUrl);

    // Discover Keycloak issuer
    const keycloakIssuer = await Issuer.discover(config.discoveryUrl);
    const client = new keycloakIssuer.Client({
      client_id: config.keycloak.clientId,
      redirect_uris: [`http://localhost:${serverPort}/sink`],
      response_types: ["code"],
    });

    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    const authUrl = client.authorizationUrl({
      scope: "openid profile email",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(authUrl, { waitUntil: "networkidle0" });

    await page.type("#username", config.user.username);
    await page.type("#password", config.user.password);
    await Promise.all([page.click("button[type=submit]"), authorizationCodePromise]);

    const code = await authorizationCodePromise;
    await browser.close();

    // Exchange the authorization code for tokens
    const tokenResponse = await axios.post(
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

    tokens = tokenResponse.data;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("should access protected resource with access token", async () => {
    const apiResponse = await axios.get("http://e2e-server:4000/protected-resource", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    expect(apiResponse.status).toBe(200);
    expect(apiResponse.data).toEqual(
      expect.objectContaining({
        message: "Access granted to protected resource.",
      })
    );
  });
});
