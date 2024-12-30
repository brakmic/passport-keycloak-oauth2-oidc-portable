FROM quay.io/keycloak/keycloak:26.0.7 AS builder

EXPOSE 8080

CMD ["start-dev"]
