# syntax=docker/dockerfile:1

# ---- build ----
FROM docker.io/library/node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- serve ----
FROM docker.io/library/caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
# Caddy keeps TLS bookkeeping in XDG_DATA_HOME; point it at the tmpfs.
ENV XDG_DATA_HOME=/tmp/caddy-data
USER 1000:1000
EXPOSE 8080
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
