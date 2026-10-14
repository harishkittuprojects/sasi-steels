const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=UTF-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.csv': 'text/csv; charset=UTF-8'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Helper response polyfills for serverless compatibility
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (data) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  // API routing for serverless functions in api/
  if (pathname === '/api/forgot-password' || pathname === '/api/forgot-password.js') {
    let bodyData = '';
    req.on('data', chunk => {
      bodyData += chunk;
    });
    req.on('end', async () => {
      if (bodyData) {
        try {
          req.body = JSON.parse(bodyData);
        } catch (e) {
          req.body = {};
        }
      } else {
        req.body = {};
      }
      try {
        const handler = require('./api/forgot-password.js');
        await handler(req, res);
      } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ success: false, message: err.message });
      }
    });
    return;
  }

  // Handle rewrites matching vercel.json
  const rewrites = {
    '/admin': '/admin.html',
    '/products': '/products.html',
    '/services': '/services.html',
    '/about': '/about.html',
    '/contact': '/contact.html',
    '/categories': '/categories.html',
    '/gallery': '/gallery.html'
  };

  if (rewrites[pathname]) {
    pathname = rewrites[pathname];
  } else if (pathname === '/') {
    pathname = '/index.html';
  }

  let filePath = path.join(ROOT, pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Access denied');
  }

  // Check if directory - serve index.html if present
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) {}

  // Try appending .html if not found
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 Not Found');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      return res.end('Internal Server Error');
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`[SASI Steels] Server listening on http://localhost:${PORT}`);
  console.log(`[SASI Steels] Admin Portal: http://localhost:${PORT}/admin`);
});
