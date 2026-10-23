# Kaam Connect web app (PWA): built with Vite, served by Caddy, which gets HTTPS certificates
# automatically when SITE_ADDRESS is a real domain. Build from the repository root:
#   docker build -f web/Dockerfile -t kaam-web .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci -w web --include-workspace-root
COPY web web
# Same-origin API by default (Caddy proxies /api to the api container).
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w web

FROM caddy:2.8-alpine
COPY web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/web/dist /srv
EXPOSE 80 443
