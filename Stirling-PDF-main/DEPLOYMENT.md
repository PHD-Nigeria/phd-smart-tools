# PHD Smart Tools — Deployment Guide

## Repo structure (what matters for deployment)

```
.github/workflows/docker-publish.yml   # CI: builds image, pushes to GHCR on push to main
docker/                                 # Upstream Stirling-PDF Docker tooling (kept as-is)
  embedded/Dockerfile                   #   ← the Dockerfile our CI actually builds
docker-compose.yml                      # Production compose file — run THIS on the PHD server
.env.example                            # Template for secrets — copy to .env, never commit .env
app/                                    # Java/Spring backend (core flavor — no SaaS layer)
frontend/                               # React frontend (editor + portal)
```

The `docker/compose/*.yml` files are upstream Stirling examples, left untouched for reference — they are **not** what we use to deploy. Our own `docker-compose.yml` at the repo root is the one that matters.

## How CI works

1. Push to `main` (or trigger manually from the Actions tab) → GitHub Actions builds the **`core`** flavor (no billing, no SaaS cloud account, no Stripe/Supabase) using `docker/embedded/Dockerfile`.
2. The image is pushed to GitHub Container Registry as:
   - `ghcr.io/phd-nigeria/phd-smart-tools:latest`
   - `ghcr.io/phd-nigeria/phd-smart-tools:<short-sha>` (for rollback)
3. First time only: go to the repo's **Packages** tab on GitHub and set the `phd-smart-tools` package visibility. If the PHD server pulling it isn't authenticated to GHCR, set it to **public** (the image has no secrets baked in — those come from `.env` at runtime). If you'd rather keep it private, the server will need `docker login ghcr.io` with a PAT that has `read:packages`.

## One-time server setup

On the server that will run PHD Smart Tools:

```bash
git clone https://github.com/PHD-Nigeria/phd-smart-tools.git
cd phd-smart-tools
cp .env.example .env
```

Edit `.env` and fill in:
- `SECURITY_INITIALLOGIN_USERNAME` / `SECURITY_INITIALLOGIN_PASSWORD` — only used to create the very first admin account on first boot. Change the admin password immediately after first login; these env values aren't re-read after the account exists.
- `SECURITY_OAUTH2_ISSUER` / `SECURITY_OAUTH2_CLIENTID` / `SECURITY_OAUTH2_CLIENTSECRET` — from the Microsoft Entra ID app registration (see README section below).
- `SYSTEM_BACKENDURL` / `SYSTEM_FRONTENDURL` — the real hostname staff will use to reach the tool. Required for the Entra redirect URI to resolve correctly.

Then:

```bash
docker compose pull
docker compose up -d
```

Visit `http://<server>:8080` (or whatever hostname/reverse proxy you put in front of it).

## Updating to a new build

After CI finishes building a new image from a `main` push:

```bash
cd phd-smart-tools
docker compose pull
docker compose up -d
```

Existing accounts, settings, and audit logs persist — they live in `./data/` on the host (bind-mounted), not inside the container.

## Microsoft Entra ID app registration (one-time)

1. Azure Portal → **Entra ID → App registrations → New registration**
2. Name: "PHD Smart Tools"
3. Supported account types: **Accounts in this organizational directory only (PHD Nigeria only — Single tenant)**
4. Redirect URI (Web): `https://<your-hostname>/login/oauth2/code/microsoft`
5. After creation, copy the **Application (client) ID** and **Directory (tenant) ID** from the Overview page
6. **Certificates & secrets → New client secret** — copy the secret **value** (shown once)
7. Put tenant ID into the issuer URL, client ID, and secret into `.env` as described above

## Reverse proxy / HTTPS

The container listens on port 8080 over plain HTTP. For a real internal hostname (required for Entra SSO redirect to work over HTTPS), put this behind your existing Nginx/IIS reverse proxy and terminate TLS there — same pattern as your other internal tools.
