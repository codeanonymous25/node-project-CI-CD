# Dockerfile
# syntax=docker/dockerfile:1
FROM node:18-alpine
WORKDIR /app

# Install deps (prod only) for smaller image
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy app
COPY . .

ENV NODE_ENV=production     PORT=3011

USER node
EXPOSE 3011
CMD ["node", "src/server.js"]
