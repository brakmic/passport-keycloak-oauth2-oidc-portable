FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY test/e2e/server.ts ./test/e2e/
COPY src ./src

RUN npm install
RUN npm install -g tsx

EXPOSE 4000

CMD ["tsx", "--tsconfig", "tsconfig.e2e.json", "test/e2e/server.ts"]
