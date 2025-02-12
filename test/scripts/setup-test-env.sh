#!/bin/bash
set -e

# Configuration
DOCKER="sudo docker"
COMPOSE_FILE="docker-compose.test.yml"
FORCE_CLEANUP=${FORCE_CLEANUP:-false}
SCRIPT_DIR="$(dirname "$0")/../bootstrap/keycloak"

# Container and service names
PROXY_CONTAINER="test-proxy"
KEYCLOAK_CONTAINER="testcloak"
PROXY_SERVICE="nginx-test"
KEYCLOAK_SERVICE="keycloak-test"
E2E_SERVER_CONTAINER="e2e-server"
E2E_SERVER_PORT="4000"
E2E_SERVER_URL="http://${E2E_SERVER_CONTAINER}:${E2E_SERVER_PORT}/protected-resource"

# Network settings
PROXY_PORT="8080"
PROXY_PROTOCOL="http"
REALM_PATH="realms/master"

# URLs
PROXY_URL="${PROXY_PROTOCOL}://${PROXY_CONTAINER}:${PROXY_PORT}/${REALM_PATH}"

# Health check settings
MAX_ATTEMPTS=120
SLEEP_INTERVAL=2

# Help function
show_help() {
    echo "Usage: $0 [-f|--force-cleanup]"
    echo "  -f, --force-cleanup  Force removal of existing containers before starting"
    exit 0
}

# Health check function
check_health() {
    echo "Waiting for services..."
    attempt=0

    while [ $attempt -lt $MAX_ATTEMPTS ]; do
        if curl -s -o /dev/null -w "%{http_code}" $PROXY_URL | grep -q "200\|301\|302" && \
           curl -s -o /dev/null -w "%{http_code}" $E2E_SERVER_URL | grep -q "401"; then
            echo "Test environment is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        echo "Attempt $attempt of $MAX_ATTEMPTS..."
        sleep $SLEEP_INTERVAL
    done

    echo "Failed to start test environment"
    $DOCKER logs $PROXY_CONTAINER
    $DOCKER logs $KEYCLOAK_CONTAINER
    $DOCKER logs $E2E_SERVER_CONTAINER
    return 1
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -f|--force-cleanup) FORCE_CLEANUP=true ;;
        -h|--help) show_help ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

cd "$SCRIPT_DIR"

# Handle force cleanup
if [ "$FORCE_CLEANUP" = true ]; then
    echo "Force cleanup requested. Removing existing containers..."
    $DOCKER compose -f $COMPOSE_FILE down -v --remove-orphans
    echo "Starting new test environment..."
    $DOCKER compose -f $COMPOSE_FILE up -d
else
    # Check if containers exist and are running
    if $($DOCKER ps -q --filter "name=$PROXY_CONTAINER" | grep -q .) && \
       $($DOCKER ps -q --filter "name=$KEYCLOAK_CONTAINER" | grep -q .); then
        echo "Test containers already running, reusing them..."
    else
        echo "Starting test environment..."
        $DOCKER compose -f $COMPOSE_FILE up -d
    fi
fi

# Check health
check_health || exit 1

echo "Test environment is up and running!"
echo "$PROXY_CONTAINER: $PROXY_PROTOCOL://$PROXY_CONTAINER:$PROXY_PORT"
echo "$KEYCLOAK_CONTAINER: $PROXY_PROTOCOL://$KEYCLOAK_CONTAINER:$PROXY_PORT"
echo "$E2E_SERVER_CONTAINER: http://$E2E_SERVER_CONTAINER:$E2E_SERVER_PORT"
