# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Baked into the static bundle at build time
ARG VITE_API_URL
ARG VITE_KEYCLOAK_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL

COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
