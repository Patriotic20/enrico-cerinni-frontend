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

USER reactjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the static file server on the exposed PORT
CMD ["sh", "-c", "serve -s dist -p ${PORT:-3000}"]