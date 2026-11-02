# syntax=docker/dockerfile:1

# ---- build ----
FROM docker.io/library/node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
# Shipped images must carry no metadata (EXIF, XMP, text chunks, editor data).
RUN node scripts/check-image-metadata.mjs dist

# ---- serve ----
FROM docker.io/library/caddy:2-alpine
# The image gives caddy cap_net_bind_service; with cap_drop ALL (compose.yaml)
# the kernel refuses to exec it. Port 3000 needs no capability, so drop it.
RUN setcap -r /usr/bin/caddy
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
# Caddy keeps TLS bookkeeping in XDG_DATA_HOME; point it at the tmpfs.
ENV XDG_DATA_HOME=/tmp/caddy-data
USER 1000:1000
EXPOSE 3000
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
