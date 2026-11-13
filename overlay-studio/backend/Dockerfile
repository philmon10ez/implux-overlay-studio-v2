# Same build context Railway uses: the service root overlay-studio/backend.
# Production Railway keeps builder NIXPACKS and start command node server.js.
# This image exists so that context can be built and booted before a release.
FROM node:18-bookworm-slim

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Nixpacks copies the service directory before npm install, and postinstall runs prisma generate.
COPY . .
RUN npm install

ENV NODE_ENV=production
CMD ["node", "server.js"]
