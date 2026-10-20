/* 代码年轮 · 本地静态服务器（零依赖，仅用于本地预览）
 * 用法：node serve.js [端口]
 * 默认端口 8642，只监听 127.0.0.1
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = parseInt(process.argv[2] || '8642', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8'
};

http.createServer(function (req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }
  if (urlPath === '/') urlPath = '/index.html';

  const rootNorm = path.normalize(root);
  const filePath = path.normalize(path.join(root, urlPath));

  /* 防目录穿越 */
  if (filePath !== rootNorm && !filePath.startsWith(rootNorm + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}).listen(port, '127.0.0.1', function () {
  console.log('代码年轮 · 本地预览服务已启动');
  console.log('根目录：' + root);
  console.log('地址：  http://127.0.0.1:' + port + '/');
  console.log('自检：  http://127.0.0.1:' + port + '/?selftest=1');
});
