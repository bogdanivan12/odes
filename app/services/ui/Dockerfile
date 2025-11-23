# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

# Copy package files and install
COPY app/services/ui/package.json app/services/ui/package-lock.json* ./
RUN npm ci --silent

# Copy source and build
COPY app/services/ui/ .
RUN npm run build

# Runtime stage using nginx
FROM nginx:alpine AS runner

# Copy built app (Vite output is `dist`) to nginx html root
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config to enable SPA fallback
COPY app/services/ui/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]