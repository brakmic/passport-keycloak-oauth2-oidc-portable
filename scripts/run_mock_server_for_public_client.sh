#!/usr/bin/env bash

pnpm start:mock-server   --client test-client   --realm TestRealm   --authServerUrl http://keycloak:8080   --handleTokenExchange true   --redirectUrl http://localhost:3000/callback

