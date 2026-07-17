FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV HOST=0.0.0.0
ENV NODE_ENV=production

CMD ["sh", "-c", "node node_modules/prisma/build/index.js generate && node node_modules/@remix-run/serve/dist/cli.js ./build/server/index.js"]
