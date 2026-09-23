// Vercel serverless entrypoint — wraps the shared Express app.
// Rewrites in vercel.json send /api/* here; the function may receive either
// the original path (/api/tasks) or the path relative to the rewrite
// destination (/tasks). Normalize so Express always sees /api/...
const app = require('../backend/src/app');

module.exports = (req, res) => {
  let url = req.url || '/';

  if (url === '/' || url === '' || url === '/api') {
    url = '/api/health';
  } else if (!url.startsWith('/api/')) {
    url = '/api' + url;
  }

  req.url = url;
  return app(req, res);
};
