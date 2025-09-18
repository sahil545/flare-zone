import path from "path";
import { createServer } from "./index";
import express from "express";

const app = createServer();
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");

console.log(`🏗️ Setting up production server on port ${port}`);
console.log(`📁 Serving static files from: ${distPath}`);
console.log(`🔧 API routes available:`);
console.log(`   - GET /api/ping`);
console.log(`   - GET /api/health`);
console.log(`   - GET /api/woocommerce/*`);

// Serve static files with proper caching headers
app.use(express.static(distPath, {
  maxAge: '1y',
  etag: false
}));

// Add specific logging for API routes to debug
app.use('/api', (req, res, next) => {
  console.log(`🔗 API Request: ${req.method} ${req.path}`);
  console.log(`🔗 Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  console.log(`🔗 Headers:`, req.headers);
  next();
});

// Handle React Router - serve index.html for all non-API routes
app.get("*", (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith("/api/")) {
    console.log(`❌ API route not found: ${req.method} ${req.path}`);
    console.log(`❌ Available routes should have been registered by createServer()`);
    return res.status(404).json({
      error: "API endpoint not found",
      path: req.path,
      method: req.method,
      availableRoutes: [
        "GET /api/ping",
        "GET /api/health",
        "GET /api/woocommerce/test",
        "GET /api/woocommerce/bookings",
        "GET /api/woocommerce/products",
        "GET /api/woocommerce/customers",
        "GET /api/woocommerce/orders",
        "GET /api/woocommerce/recent-data",
        "POST /api/woocommerce/test-post"
      ],
      timestamp: new Date().toISOString()
    });
  }

  console.log(`📄 Serving SPA for: ${req.path}`);
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://0.0.0.0:${port}`);
  console.log(`🔧 API: http://0.0.0.0:${port}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🏗️ Platform: Fly.dev production deployment`);

  // Log all registered routes for debugging
  console.log('\n🔗 Registered API routes:');
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      console.log(`   ${Object.keys(middleware.route.methods)[0].toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          const method = Object.keys(handler.route.methods)[0].toUpperCase();
          const path = middleware.regexp.source.replace('\\', '').replace('?(?=\\/|$)', '') + handler.route.path;
          console.log(`   ${method} ${path}`);
        }
      });
    }
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
