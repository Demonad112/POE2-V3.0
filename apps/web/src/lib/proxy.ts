/**
 * The server-side hop every poe.ninja read goes through.
 *
 * poe.ninja sends no CORS headers, so the browser cannot call it directly.
 * `services/ninja-proxy` in this repo is that hop, deployed at the URL below.
 *
 * Use the bare production alias, NOT the team-scoped one
 * (`*-obsidian-intelligenceyyc.vercel.app`): team aliases sit behind Vercel's
 * SSO and answer 302 to anonymous requests, so the app would silently fail to
 * import. Verified 2026-07-24: this alias returns 200 with
 * `access-control-allow-origin: *`.
 *
 * NEXT_PUBLIC_NINJA_PROXY_BASE overrides it if the proxy ever moves.
 *
 * The default is the Vercel project `poe2-v3-ninja-proxy`, built by the Vercel
 * GitHub integration from services/ninja-proxy in THIS repository, so the
 * deployed proxy and its source here cannot drift. It serves /api/character,
 * /api/ladder (with the display-name league fallback) and /api/health.
 *
 * Lives here rather than in the import bar because the ladder comparison needs
 * the same base, and two copies of a URL are two chances to point at different
 * deployments.
 */
const DEFAULT_PROXY = 'https://poe2-v3-ninja-proxy.vercel.app'

export const PROXY_BASE = (process.env.NEXT_PUBLIC_NINJA_PROXY_BASE || DEFAULT_PROXY).replace(/\/+$/, '')
