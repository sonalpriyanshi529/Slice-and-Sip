/**
 * Slice & Sip — Local Development Server
 *
 * Serves static assets from the project root and the animation frames
 * from the `frames/` sub-directory (relative path, no hardcoded absolute paths).
 *
 * Usage:
 *   node server.js
 *   Then open http://localhost:3000 in your browser.
 *
 * Frame images are expected at:
 *   <project-root>/frames/ezgif-frame-001.jpg … ezgif-frame-240.jpg
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT       = 3000;
const PUBLIC_DIR = __dirname;                          // Project root
const FRAMES_DIR = path.join(__dirname, 'frames');     // Relative — no hardcoded path

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
};

// Cache durations (in seconds)
const CACHE_AGES = {
  '.jpg':  60 * 60 * 24 * 7,  // 7 days — frames never change during dev
  '.jpeg': 60 * 60 * 24 * 7,
  '.png':  60 * 60 * 24,
  '.css':  0,  // No cache for CSS/JS so edits are picked up immediately
  '.js':   0,
  '.html': 0,
};

/**
 * Resolve and validate a requested URL path to an absolute filesystem path.
 * Returns null if the resolved path escapes the allowed base directory
 * (path traversal protection).
 */
function safeResolve(baseDir, relativePath) {
  const resolved = path.resolve(baseDir, relativePath.replace(/^\/+/, ''));
  // Ensure the resolved path is inside baseDir
  if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
    return null;
  }
  return resolved;
}

const server = http.createServer((req, res) => {
  const decodedUrl = decodeURIComponent(req.url.split('?')[0]); // Strip query string

  let filePath;

  if (decodedUrl.startsWith('/frames/')) {
    // Serve animation frames from the frames directory
    const frameFile = decodedUrl.slice('/frames/'.length);
    filePath = safeResolve(FRAMES_DIR, frameFile);
  } else {
    // Serve everything else from the project root
    const relPath = decodedUrl === '/' ? 'index.html' : decodedUrl;
    filePath = safeResolve(PUBLIC_DIR, relPath);
  }

  // Path traversal or malformed path
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log(`404: ${filePath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext         = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const maxAge      = CACHE_AGES[ext] !== undefined ? CACHE_AGES[ext] : 0;
    const cacheControl = maxAge > 0
      ? `public, max-age=${maxAge}, immutable`
      : 'no-cache, no-store, must-revalidate';

    res.writeHead(200, {
      'Content-Type':  contentType,
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',   // Allows font/asset requests from localhost
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('\n==================================================');
  console.log('🍕  Slice & Sip Web Server Running Successfully!  🍻');
  console.log('--------------------------------------------------');
  console.log(`Local:  http://localhost:${PORT}`);
  console.log(`Frames: ${FRAMES_DIR}`);
  console.log('==================================================\n');
});
