# Dockerfile
FROM node:18-alpine
WORKDIR /app

# Install deps (prod only) for smaller image
COPY package.json package-lock.json* ./

# Add New Relic agent
RUN npm ci --omit=dev

# Copy app
COPY . .

ENV NODE_ENV=production \
    PORT=3011 \
    NEW_RELIC_LICENSE_KEY=e73c2b1d987ff2b7bed6ab4f7585a9cfFFFFNRAL

USER node
EXPOSE 3011

# Start app with New Relic agent
CMD ["node", "-r", "newrelic", "src/server.js"]
