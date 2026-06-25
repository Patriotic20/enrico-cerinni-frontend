# Use the official Node.js 18 image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./

# Ensure devDependencies are installed even if the base environment is production
ENV NODE_ENV=development
RUN npm ci

# Copy source code and build the application
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production image, use a lightweight static server
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install the 'serve' package globally
RUN npm install -g serve

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 reactjs

# Copy the built application from the builder stage
COPY --from=builder --chown=reactjs:nodejs /app/dist ./dist

# Copy the runtime entrypoint script and make it executable
COPY --chown=reactjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER reactjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# The entrypoint writes public/config.js from API_URL at startup, then starts serve.
# Set API_URL in your Railway service's environment variables to point at the
# backend's public domain (e.g. https://enrico-cerinni-backend.up.railway.app).
ENTRYPOINT ["./docker-entrypoint.sh"]