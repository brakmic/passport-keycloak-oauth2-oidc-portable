import { URL } from "url";
import dotenv from "dotenv";

dotenv.config({ path: "./test/.env.test" });

interface KeycloakConfig {
  protocol: string;
  host: string;
  port: number;
  realm: string;
  clientId: string;
}

interface MockServerConfig {
  protocol: string;
  host: string;
  port: number;
}

interface UserConfig {
  username: string;
  password: string;
}

interface DockerConfig {
  composeFile: string;
  containerName: string;
}

export interface AppConfig {
  keycloak: KeycloakConfig;
  mockServer: MockServerConfig;
  user: UserConfig;
  docker: DockerConfig;
  keycloakBaseUrl: string;
  discoveryUrl: string;
  callbackUrl: string;
}

const config: AppConfig = {
  keycloak: {
    protocol: process.env.KEYCLOAK_PROTOCOL || "http",
    host: process.env.KEYCLOAK_HOST || "keycloak",
    port: parseInt(process.env.KEYCLOAK_PORT || "8080", 10),
    realm: process.env.KEYCLOAK_REALM || "TestRealm",
    clientId: process.env.KEYCLOAK_CLIENT_ID || "test-client",
  },
  mockServer: {
    protocol: process.env.MOCK_SERVER_PROTOCOL || "http",
    host: process.env.MOCK_SERVER_HOST || "localhost",
    port: parseInt(process.env.MOCK_SERVER_PORT || "3000", 10),
  },
  user: {
    username: process.env.TEST_USER_USERNAME || "test-user",
    password: process.env.TEST_USER_PASSWORD || "password",
  },
  docker: {
    composeFile: process.env.DOCKER_COMPOSE_FILE || "docker-compose.test.yml",
    containerName: process.env.DOCKER_CONTAINER_NAME || "keycloak-demo",
  },
  keycloakBaseUrl: new URL(`${process.env.KEYCLOAK_PROTOCOL || "http"}://${process.env.KEYCLOAK_HOST || "keycloak"}:${process.env.KEYCLOAK_PORT || "8080"}`).href,
  discoveryUrl: new URL(`/realms/${process.env.KEYCLOAK_REALM || "TestRealm"}/.well-known/openid-configuration`, `${process.env.KEYCLOAK_PROTOCOL || "http"}://${process.env.KEYCLOAK_HOST || "keycloak"}:${process.env.KEYCLOAK_PORT || "8080"}`).href,
  callbackUrl: new URL(`/callback`, `${process.env.MOCK_SERVER_PROTOCOL || "http"}://${process.env.MOCK_SERVER_HOST || "localhost"}:${process.env.MOCK_SERVER_PORT || "3000"}`).href,
};

export default config;
