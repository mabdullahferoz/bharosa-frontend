# Bharosa Web

The web app for Bharosa, a marketplace that connects households in Pakistan with domestic workers. It is an installable PWA in English and Urdu (RTL), with screens for households, workers, staff (back office) and super admins. The backend lives in its own repository, **bharosa-api**; this app talks to it over `/api`.

Stack: React 18, Vite, React Router, plain CSS, lucide icons, a few vendored [React Bits](https://reactbits.dev) components (see [`src/components/reactbits/README.md`](src/components/reactbits/README.md) for licence notes). Served by Caddy in production.

| Document | What's in it |
|---|---|
| [PRODUCT.md](PRODUCT.md) | Who the app is for, voice and tone, what not to claim |
| [DESIGN.md](DESIGN.md) | Design system: colours, type, components, endorsement stack, RTL and motion rules |

## Run it locally

You need Node.js 20 or newer and the API running at http://localhost:4000 (clone **bharosa-api** and run `npm run setup && npm run dev` there).

```bash
npm install
npm run dev
```

The app runs at http://localhost:5173. Vite proxies `/api` to `localhost:4000`, so no CORS setup is needed. Demo logins are listed in the bharosa-api README (password `password123`).

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run typecheck` | TypeScript checks |
| `npm run i18n:check` | Lists strings without an Urdu translation (fails CI if any) |
| `npm run build` | Production build into `dist/` |
| `npm run icons` | Regenerates the PWA icons in `public/` |

## Translations

All UI text goes through `t("English text")`, and Urdu lives in [`src/locales/ur.ts`](src/locales/ur.ts), keyed by the English text. Have a native speaker review it before launch.

## Deploy

**With Docker (recommended, same server as the API).** Start the bharosa-api stack first; it creates the `bharosa` Docker network. Then:

```bash
cp .env.production.example .env.production   # set SITE_ADDRESS to your domain
docker compose --env-file .env.production up -d --build
```

Caddy serves the app, gets HTTPS certificates automatically, adds security headers, and proxies `/api` to `API_UPSTREAM` (default `api:4000`). Full steps are in DEPLOYMENT.md in bharosa-api.

**On any static host.** Build with the API's public URL and serve `dist/` with a fallback to `index.html` for client-side routes:

```bash
VITE_API_URL=https://api.example.pk/api npm run build
```

Add the web app's origin to `CORS_ORIGINS` on the API.
