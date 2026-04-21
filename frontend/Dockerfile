# Frontend - simple static file server with nginx
FROM node:18-alpine AS builder

WORKDIR /app

# Copy frontend files
COPY . .

# No build step needed for vanilla JS - just verify assets exist
RUN ls -la

# Final stage with nginx
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static files from builder
COPY --from=builder /app /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 || true

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
