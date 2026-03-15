const axios = require('axios');

/**
 * GET /api/proxy/pdf?url=<encoded_cloudinary_url>
 *
 * Fetches any Cloudinary raw file using server-side credentials (no CORS/auth
 * issues) and streams it back to the browser as application/pdf so the browser
 * can render it inline in an <iframe>.
 *
 * Protected by your existing auth middleware — only logged-in users can proxy.
 */
const proxyPdf = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'url query param is required' });
    }

    // Only allow proxying from your own Cloudinary account
    const decoded = decodeURIComponent(url);
    if (!decoded.includes('res.cloudinary.com')) {
      return res.status(403).json({ error: 'Only Cloudinary URLs are allowed' });
    }

    const response = await axios.get(decoded, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    // Tell the browser to render inline, not download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', response.data.byteLength);
    // Allow the iframe on your frontend origin to embed it
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Proxy PDF error:', error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ error: `Failed to fetch PDF: ${error.message}` });
  }
};

module.exports = { proxyPdf };