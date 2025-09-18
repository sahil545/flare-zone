import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  getBookings,
  getBookingProducts,
  getProductById,
  createBooking,
  getCustomers,
  getOrders,
  getOrderById,
  getRecentData,
  testPostRecentData,
  testConnection,
} from "./routes/woocommerce";
import {
  testWooConnection,
  testBookingEndpoints,
  getSystemStatus,
} from "./routes/woocommerce-debug";
import {
  findBookingEndpoints,
  testSpecificEndpoint,
} from "./routes/booking-endpoint-finder";
import {
  handleWcBookings,
  testWcBookingsConnection,
  handleAvailabilityRange,
} from "./routes/wc-bookings";
import { getProductsByCategoryTree } from "./routes/woocommerce-category-tree";
import {
  wpGetMe,
  wpFindUser,
  wpJwtLogin,
  wpAssignedBookings,
} from "./routes/wordpress";
import { timeAudit, assignmentAudit, siteTzInfo } from "./routes/diagnostics";
import {
  listPages,
  getPageById,
  createPage,
  updatePage,
  listPosts,
  getPostById,
  createPost,
  updatePost,
} from "./routes/wordpress-content";

export function createServer() {
  const app = express();

  console.log("🚀 Creating Express server...");
  console.log("🌍 Environment:", process.env.NODE_ENV);
  console.log(
    "🔑 WooCommerce URL:",
    process.env.WOOCOMMERCE_STORE_URL ? "Set" : "Not set",
  );
  console.log(
    "🔑 Consumer Key:",
    process.env.WOOCOMMERCE_CONSUMER_KEY ? "Set" : "Not set",
  );
  console.log(
    "🔑 Consumer Secret:",
    process.env.WOOCOMMERCE_CONSUMER_SECRET ? "Set" : "Not set",
  );

  // Middleware
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Accept",
        "Cache-Control",
      ],
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add comprehensive request logging
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
  });

  // Simple ping endpoint that always works
  app.get("/api/ping", (req, res) => {
    console.log("🏓 PING endpoint hit");
    console.log("🏓 Request details:", {
      method: req.method,
      url: req.url,
      host: req.get("host"),
      userAgent: req.get("user-agent"),
    });

    const response = {
      message: "pong",
      timestamp: new Date().toISOString(),
      server: "express",
      environment: "production",
      deployment: "fly.dev",
      uptime: process.uptime(),
      success: true,
    };

    console.log("🏓 Sending ping response:", response);
    res.json(response);
  });

  app.get("/api/demo", handleDemo);

  // Health check endpoint with comprehensive diagnostics
  app.get("/api/health", (req, res) => {
    console.log("🔧 HEALTH endpoint hit");
    console.log("🔧 Request details:", {
      method: req.method,
      url: req.url,
      headers: req.headers,
      host: req.get("host"),
      protocol: req.protocol,
    });

    try {
      const healthData = {
        status: "ok",
        timestamp: new Date().toISOString(),
        server: "running",
        deployment: "production",
        platform: "fly.dev",
        environment: {
          node_version: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          woocommerce_url: process.env.WOOCOMMERCE_STORE_URL || "not set",
          has_consumer_key: !!process.env.WOOCOMMERCE_CONSUMER_KEY,
          has_consumer_secret: !!process.env.WOOCOMMERCE_CONSUMER_SECRET,
        },
        routes_registered: {
          ping: true,
          health: true,
          woocommerce_test: true,
          woocommerce_bookings: true,
          woocommerce_products: true,
          woocommerce_customers: true,
          woocommerce_orders: true,
          woocommerce_recent_data: true,
          woocommerce_test_post: true,
        },
      };

      console.log("🔧 Sending health response:", healthData);
      res.json(healthData);
    } catch (error) {
      console.error("❌ Health check error:", error);
      res.status(500).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // WooCommerce integration routes (legacy)
  app.get("/api/woocommerce/test", testConnection);
  app.get("/api/woocommerce/bookings", getBookings);
  app.get("/api/woocommerce/products", getBookingProducts);
  app.get(
    "/api/woocommerce/products/by-category-tree",
    getProductsByCategoryTree,
  );
  app.get("/api/woocommerce/products/:id", getProductById);
  app.get("/api/woocommerce/customers", getCustomers);
  app.get("/api/woocommerce/orders", getOrders);
  app.get("/api/woocommerce/orders/:id", getOrderById);
  app.get("/api/woocommerce/recent-data", getRecentData);
  app.post("/api/woocommerce/test-post", testPostRecentData);
  app.post("/api/woocommerce/bookings", createBooking);

  // NEW: WC-Bookings routes (matching working project pattern)
  app.get("/api/wc-bookings", handleWcBookings);
  app.post("/api/wc-bookings", handleWcBookings);
  app.get("/api/wc-bookings/test", testWcBookingsConnection);
  app.get("/api/wc-bookings/availability", handleAvailabilityRange);

  // WooCommerce debug routes
  app.get("/api/debug/woocommerce/connection", testWooConnection);
  app.get("/api/debug/woocommerce/booking-endpoints", testBookingEndpoints);
  app.get("/api/debug/woocommerce/system", getSystemStatus);

  // Diagnostics
  app.get("/api/diagnostics/time-audit", timeAudit as any);
  app.get("/api/diagnostics/assignment-audit", assignmentAudit as any);
  app.get("/api/diagnostics/site-tz", siteTzInfo as any);

  // Booking endpoint discovery
  app.get("/api/debug/find-booking-endpoints", findBookingEndpoints);
  app.get("/api/debug/test-endpoint", testSpecificEndpoint);

  // WordPress user proxy
  app.get("/api/wp/users/me", wpGetMe);
  app.get("/api/wp/users/find", wpFindUser);
  app.post("/api/wp/jwt/login", wpJwtLogin);
  app.get("/api/instructor/assigned-bookings", wpAssignedBookings);

  // CMS content routes (WordPress)
  app.get("/api/wp/pages", listPages as any);
  app.get("/api/wp/pages/:id", getPageById as any);
  app.post("/api/wp/pages", createPage as any);
  app.put("/api/wp/pages/:id", updatePage as any);

  app.get("/api/wp/posts", listPosts as any);
  app.get("/api/wp/posts/:id", getPostById as any);
  app.post("/api/wp/posts", createPost as any);
  app.put("/api/wp/posts/:id", updatePost as any);

  return app;
}
