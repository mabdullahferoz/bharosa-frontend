# Bharosa web app (PWA): built with Vite, served by Caddy, which gets HTTPS certificates
# automatically when SITE_ADDRESS is a real domain. Build from the repository root:
#   docker build -t bharosa-web .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Same-origin API by default (Caddy proxies /api to API_UPSTREAM).
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM caddy:2.8-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80 443
