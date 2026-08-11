# Use the official Node.js 20 image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./

# Ensure devDependencies are installed even if the base environment is production
ENV NODE_ENV=development
RUN npm ci

# Vite inlines env vars at build time, so the API URL must be a build argument.
# Passing it at runtime has no effect on the already-bundled assets.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy source code and build the application
COPY . .
RUN npm run build

# Production image: nginx serves the static bundle AND proxies /api to the
# backend. A plain static server is not enough — the bundle calls the API on its
# own origin, so the port published by this container must forward /api itself.
FROM nginx:alpine AS runner

# Copy the built application from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Serve on 3000 and proxy /api to the backend
COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
