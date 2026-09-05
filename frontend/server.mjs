import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('./dist', import.meta.url)))
const port = Number.parseInt(process.env.PORT ?? '8080', 10)

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
}

const sendFile = (response, filePath) => {
    const contentType = contentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
    response.writeHead(200, { 'Content-Type': contentType })
    createReadStream(filePath).pipe(response)
}

const server = createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' })
        response.end()
        return
    }

    const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
    const relativePath = normalize(requestPath).replace(/^[/\\]+/, '')
    const filePath = resolve(join(root, relativePath))
    const relativeToRoot = relative(root, filePath)
    const isInsideRoot = relativeToRoot === '' || !relativeToRoot.startsWith('..')

    if (!isInsideRoot) {
        response.writeHead(404)
        response.end()
        return
    }

    try {
        const fileInfo = await stat(filePath)
        if (fileInfo.isFile()) {
            if (request.method === 'HEAD') {
                response.writeHead(200, {
                    'Content-Type':
                        contentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
                })
                response.end()
            } else {
                sendFile(response, filePath)
            }
            return
        }
    } catch {
        // SPA fallback below.
    }

    try {
        await access(join(root, 'index.html'))
        if (request.method === 'HEAD') {
            response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            response.end()
        } else {
            sendFile(response, join(root, 'index.html'))
        }
    } catch {
        response.writeHead(404)
        response.end()
    }
})

server.listen(port, '0.0.0.0', () => {
    console.log(`frontend server listening on port ${port}`)
})
