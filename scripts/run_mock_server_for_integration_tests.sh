#!/usr/bin/env bash

pnpm start:mock-server --client test-client --realm TestRealm --authServerUrl http://keycloak:8080 \
--handleTokenExchange false --forwardCallbackUrl http://localhost:3002/sink \
--redirectUrl http://localhost:3003/sink

