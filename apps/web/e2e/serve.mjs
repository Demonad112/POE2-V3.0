// Serves the static export the way GitHub Pages does: under the repository's
// base path when the build used one (CI), with trailing-slash directories
// resolving to their index.html. No dependencies, so the e2e job needs nothing
// beyond the build it already has.
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../out', import.meta.url))
const base = process.env.E2E_BASE_PATH ?? ''
const port = Number(process.env.E2E_PORT ?? 4321)
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  if (base && path.startsWith(base)) path = path.slice(base.length) || '/'
  let file = normalize(join(root, path))
  if (!file.startsWith(root)) return void res.writeHead(403).end()
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html')
    statSync(file)
  } catch {
    res.writeHead(404, { 'content-type': 'text/html' })
    return void createReadStream(join(root, '404.html')).pipe(res)
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}).listen(port, () => console.log(`serving ${root} at http://localhost:${port}${base}/`))
