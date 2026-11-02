# Deploying fsakel.com

`compose.yaml` runs two services:

- `site`: this site's static server, on `127.0.0.1:3000`.
- `edge`: the server's public Caddy (`edge/`). It terminates TLS (HTTP/1.1, 2
  and 3) for every site and routes each one to its private proxy on loopback:

| Domain | Private proxy | Repository |
| --- | --- | --- |
| `fsakel.com` | `127.0.0.1:3000` | this one (`site`) |
| `typegraph.fsakel.com` | `127.0.0.1:4000` | [swift-typegraph](https://github.com/filip-sakel/swift-typegraph) |

The edge also rate-limits typegraph's `/api/analyze` per client IP. It runs
with host networking, so it sees each client's real address and reaches the
private proxies on loopback.

## What the server needs

- **Docker Engine with the compose plugin** (rootful), or **rootless Podman 5
  or later** with `docker-compose` as its compose provider.
- **Inbound 80/tcp, 443/tcp and 443/udp** (HTTP/3), in the cloud provider's
  firewall and the host's (below). Let's Encrypt needs port 80 or 443
  reachable to issue certificates.
- **DNS**: an `A` record (and `AAAA` for IPv6) per domain, pointing at the
  server. Wait until `dig +short typegraph.fsakel.com` prints the address
  before the first start, or certificate issuance fails and Caddy retries with
  backoff. `FSAKEL_ADDRESS` and `TYPEGRAPH_ADDRESS` in `.env` choose other
  domains.

## Setup

Rootless Podman, once (with rootful Docker, skip this):

```sh
# Let your user bind 80 and 443 (the edge uses the host's network).
echo 'net.ipv4.ip_unprivileged_port_start=80' | sudo tee /etc/sysctl.d/90-unprivileged-ports.conf
sudo sysctl --system
# Keep containers running after logout and restart them at boot.
sudo loginctl enable-linger "$USER"
systemctl --user enable --now podman.socket podman-restart.service
```

Open the ports in the host firewall (with ufw:
`ufw allow 80,443/tcp && ufw allow 443/udp`):

```sh
sudo firewall-cmd --permanent --add-service=http --add-service=https --add-service=http3
sudo firewall-cmd --reload
```

Start swift-typegraph (its DEPLOY.md), then:

```sh
docker compose up -d --build   # or: podman compose up -d --build
```

## Operating

```sh
git pull && docker compose up -d --build   # update
docker compose logs -f edge                # requests, certificate renewals
```

Back up the **`caddy_data`** volume: it holds the certificates and the ACME
account. If you lose it, Caddy issues new certificates, and Let's Encrypt
limits how often it can do that. `docker compose down -v` deletes it.
