const { URL } = require('url');

const config = {
  keycloak: {
    protocol: process.env.KEYCLOAK_PROTOCOL || 'http',
    host: process.env.KEYCLOAK_HOST || 'keycloak', // Use 'localhost' if not using Docker networking
    port: process.env.KEYCLOAK_PORT || 8080,
    realm: process.env.KEYCLOAK_REALM || 'TestRealm',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'test-client',
  },
  mockServer: {
    protocol: process.env.MOCK_SERVER_PROTOCOL || 'http',
    host: process.env.MOCK_SERVER_HOST || 'localhost', // 'localhost' if mock server runs on host
    port: process.env.MOCK_SERVER_PORT || 3000,
  },
  user: {
    username: process.env.TEST_USER_USERNAME || 'test-user',
    password: process.env.TEST_USER_PASSWORD || 'password',
  },
  docker: {
    composeFile: process.env.DOCKER_COMPOSE_FILE || 'docker-compose.test.yml',
    containerName: process.env.DOCKER_CONTAINER_NAME || 'keycloak-demo',
  },
};

// Construct URLs using the URL class for robustness
const keycloakBaseUrl = new URL(`${config.keycloak.protocol}://${config.keycloak.host}:${config.keycloak.port}`);
const discoveryUrl = new URL(`/realms/${config.keycloak.realm}`, keycloakBaseUrl).href;
const callbackUrl = new URL(`/callback`, `${config.mockServer.protocol}://${config.mockServer.host}:${config.mockServer.port}`).href;

module.exports = {
  keycloak: config.keycloak,
  mockServer: config.mockServer,
  user: config.user,
  docker: config.docker,
  keycloakBaseUrl,
  discoveryUrl,
  callbackUrl,
};
