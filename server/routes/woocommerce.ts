import { RequestHandler } from "express";
import {
  WooCommerceBooking,
  WooCommerceProduct,
  WooCommerceCustomer,
  WooCommerceOrder,
  CreateBookingRequest,
  BookingCalendarEvent,
  WooCommerceConfig,
} from "@shared/woocommerce";

// WooCommerce configuration from environment variables
const getWooConfig = (): WooCommerceConfig | null => {
  const url = process.env.WOOCOMMERCE_STORE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  console.log("🔑 WooCommerce config check:", {
    url: url ? "Set" : "Missing",
    consumerKey: consumerKey ? "Set" : "Missing",
    consumerSecret: consumerSecret ? "Set" : "Missing",
  });

  if (!url || !consumerKey || !consumerSecret) {
    console.warn(
      "⚠️ Missing WooCommerce configuration. Please set WOOCOMMERCE_STORE_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET environment variables.",
    );
    return null;
  }

  return { url, consumerKey, consumerSecret };
};

// Create WooCommerce API URL with authentication
const createApiUrl = (
  endpoint: string,
  params: Record<string, string> = {},
): string | null => {
  const config = getWooConfig();
  if (!config) {
    console.error("❌ Cannot create API URL: WooCommerce config missing");
    return null;
  }

  const url = new URL(`${config.url}/wp-json/wc/v3/${endpoint}`);

  // Add authentication parameters
  url.searchParams.append("consumer_key", config.consumerKey);
  url.searchParams.append("consumer_secret", config.consumerSecret);

  // Add additional parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  return url.toString();
};

// Fetch wrapper for WooCommerce API
const wooFetch = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const url = createApiUrl(endpoint);

  if (!url) {
    throw new Error(
      "WooCommerce configuration missing. Please set environment variables.",
    );
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(7000),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(
      `WooCommerce API Error: ${response.status} - ${errorData.message}`,
    );
  }

  return response.json();
};

// Simple in-memory caches
const BOOKINGS_TTL_MS = 180 * 1000; // 3 minutes
const PRODUCT_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const bookingsCache = new Map<
  string,
  { ts: number; data: BookingCalendarEvent[] }
>();
const productCache = new Map<number, { ts: number; name: string }>();

// Cache the site timezone (WordPress setting) to apply consistent display TZ
let siteTimezoneCache: { tz: string | null; ts: number } = { tz: null, ts: 0 };
const SITE_TZ_TTL_MS = 12 * 60 * 60 * 1000; // 12h

const parseBookingDateToMs = (val: unknown): number => {
  // Numbers are seconds or milliseconds since epoch (UTC)
  if (typeof val === "number" && Number.isFinite(val)) {
    return val > 1e12 ? val : val * 1000;
  }
  if (typeof val === "string") {
    // If ISO with timezone, let Date parse it
    if (/\dT\d/.test(val) && /Z|[+-]\d{2}:?\d{2}$/.test(val)) {
      const t = Date.parse(val);
      return Number.isNaN(t) ? Date.now() : t;
    }
    // Handle common WC format: "YYYY-MM-DD HH:mm:ss" (UTC per API)
    const m = val.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (m) {
      const [_, y, mo, d, h, mi, s] = m;
      const ms = Date.UTC(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(s),
      );
      return ms;
    }
    // Fallback parse
    const t = Date.parse(val);
    return Number.isNaN(t) ? Date.now() : t;
  }
  // Unknown - fallback to now to avoid crashes (shouldn't happen)
  return Date.now();
};

const getSiteTimezone = async (): Promise<string | null> => {
  const now = Date.now();
  if (siteTimezoneCache.tz && now - siteTimezoneCache.ts < SITE_TZ_TTL_MS)
    return siteTimezoneCache.tz;
  try {
    const status: any = await wooFetch("system_status");
    const tz = status?.settings?.timezone || null;
    siteTimezoneCache = { tz, ts: now };
    return tz;
  } catch {
    return siteTimezoneCache.tz; // may be null
  }
};

// Convert WooCommerce booking to calendar event
const convertToCalendarEvent = (
  booking: WooCommerceBooking,
): BookingCalendarEvent => {
  // Safely handle person_counts - it might be an array, number, or undefined
  let participants = 1; // Default to 1 participant

  if (Array.isArray(booking.person_counts)) {
    participants = booking.person_counts.reduce((sum, count) => sum + count, 0);
  } else if (typeof booking.person_counts === "number") {
    participants = booking.person_counts;
  } else if (
    booking.person_counts &&
    typeof booking.person_counts === "object"
  ) {
    // Sometimes person_counts is an object like {adults: 2, children: 1}
    participants = Object.values(booking.person_counts).reduce(
      (sum: number, count: any) => sum + (Number(count) || 0),
      0,
    );
  }

  // Ensure we have at least 1 participant
  participants = Math.max(participants, 1);

  return {
    id: `wc-${booking.id}`,
    title: booking.product?.name || `Booking #${booking.id}`,
    start: new Date(booking.start * 1000), // Convert Unix timestamp (seconds) to milliseconds
    end: new Date(booking.end * 1000), // Convert Unix timestamp (seconds) to milliseconds
    participants: participants,
    maxParticipants: 15, // Default, should come from product data
    status: booking.status,
    customer: {
      name: booking.customer
        ? `${booking.customer.first_name} ${booking.customer.last_name}`
        : "Unknown",
      email: booking.customer?.email || "",
      phone: booking.customer?.phone,
    },
    wooCommerceData: {
      bookingId: booking.id,
      orderId: booking.order_id,
      productId: booking.product_id,
    },
  };
};

// Get all bookings
export const getBookings: RequestHandler = async (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;

    // Check if WooCommerce credentials are configured
    const config = getWooConfig();
    if (!config) {
      console.log(
        "⚠️ WooCommerce credentials not configured, returning empty bookings",
      );
      return res.json({
        success: true,
        data: [],
        total: 0,
        message:
          "WooCommerce credentials not configured. Please set environment variables to connect to your store.",
        bookings_available: false,
        credentials_missing: true,
      });
    }

    const cacheKey = `${start_date || ""}|${end_date || ""}|${status || ""}`;
    const cached = bookingsCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < BOOKINGS_TTL_MS) {
      res.set(
        "Cache-Control",
        "public, max-age=180, stale-while-revalidate=600",
      );
      return res.json({
        success: true,
        data: cached.data,
        total: cached.data.length,
        bookings_available: true,
        cached: true,
      });
    }

    let bookings: WooCommerceBooking[] = [];
    let bookingsAvailable = false;

    // Use the correct booking endpoint that we discovered
    const endpointsToTry = [
      "wc-bookings/v1/bookings", // This is the working endpoint
    ];

    for (const endpoint of endpointsToTry) {
      try {
        let url: string;

        // Use the WC Bookings plugin specific endpoint with correct date format
        const queryParams = new URLSearchParams();
        queryParams.append("consumer_key", config.consumerKey);
        queryParams.append("consumer_secret", config.consumerSecret);

        // Fix date parameter names for WC Bookings API
        if (start_date)
          queryParams.append("start_date_min", start_date as string);
        if (end_date) queryParams.append("start_date_max", end_date as string);
        if (status) queryParams.append("status", status as string);

        // Add per_page to avoid timeout on large datasets
        queryParams.append("per_page", "100");

        url = `${config.url}/wp-json/${endpoint}?${queryParams.toString()}`;

        console.log(`Fetching bookings from (paginated): ${url}`);
        const perPage = 100;
        let page = 1;
        let all: WooCommerceBooking[] = [];
        while (true) {
          const pagedUrl = `${url}&page=${page}`;
          let response: Response;
          try {
            response = await fetch(pagedUrl, {
              method: "GET",
              headers: {
                Accept: "application/json",
                "User-Agent": "BookingCalendarApp/1.0",
              },
              // Prevent hanging requests causing client/proxy 502
              signal: AbortSignal.timeout(4000),
            });
          } catch (err) {
            console.error(
              `⏱️ Timeout or network error on ${endpoint} page ${page}:`,
              err,
            );
            break;
          }

          if (!response.ok) {
            console.error(
              `❌ Failed to fetch from ${endpoint} page ${page}:`,
              response.status,
              response.statusText,
            );
            break;
          }

          let batch: WooCommerceBooking[] = [];
          try {
            batch = await response.json();
          } catch (parseErr) {
            console.error("❌ Failed to parse bookings JSON:", parseErr);
            break;
          }

          all = all.concat(batch);

          if (batch.length < perPage) {
            break;
          }

          page++;
          if (page > 5) {
            // hard stop to avoid runaway
            console.warn("⚠️ Stopping pagination after 5 pages");
            break;
          }
        }

        bookings = all;
        // Defensive server-side date filtering to ensure correct day-range results
        if (start_date || end_date) {
          const minMs = start_date ? Date.parse(`${start_date}T00:00:00Z`) : -Infinity;
          const maxMs = end_date ? Date.parse(`${end_date}T23:59:59Z`) : Infinity;
          bookings = bookings.filter((b: any) => {
            const s = parseBookingDateToMs((b as any).start);
            return s >= minMs && s <= maxMs;
          });
        }
        bookingsAvailable = bookings.length > 0;
        console.log(
          `✅ Successfully fetched ${bookings.length} bookings from ${endpoint}`,
        );

        break;
      } catch (endpointError) {
        console.log(
          `Endpoint ${endpoint} failed:`,
          endpointError instanceof Error
            ? endpointError.message
            : "Unknown error",
        );
        continue;
      }
    }

    if (!bookingsAvailable) {
      // Return empty data with a helpful message
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: "WooCommerce Bookings plugin not detected. Using demo mode.",
        bookings_available: false,
      });
    }

    // Resolve product titles to avoid "Booking #" fallback
    const uniqueProductIds = Array.from(
      new Set(
        (bookings || [])
          .map((b) => b.product_id)
          .filter(
            (id): id is number => typeof id === "number" && !Number.isNaN(id),
          ),
      ),
    );

    const productTitleMap = new Map<number, string>();

    if (uniqueProductIds.length > 0) {
      // hydrate from cache first
      for (const id of uniqueProductIds) {
        const c = productCache.get(id);
        if (c && Date.now() - c.ts < PRODUCT_TTL_MS)
          productTitleMap.set(id, c.name);
      }
      const idsToFetch = uniqueProductIds.filter(
        (id) => !productTitleMap.has(id),
      );
      if (idsToFetch.length > 0) {
        try {
          const includeParam = idsToFetch.join(",");
          const productsBatch = await wooFetch<WooCommerceProduct[]>(
            `products?include=${includeParam}`,
            { method: "GET" },
          );
          for (const p of productsBatch || []) {
            if (p && typeof p.id === "number") {
              productTitleMap.set(p.id, p.name);
              productCache.set(p.id, { ts: Date.now(), name: p.name });
            }
          }
        } catch (batchErr) {
          for (const id of idsToFetch) {
            try {
              const p = await wooFetch<WooCommerceProduct>(`products/${id}`, {
                method: "GET",
              });
              if (p && typeof p.id === "number") {
                productTitleMap.set(p.id, p.name);
                productCache.set(p.id, { ts: Date.now(), name: p.name });
              }
            } catch {}
          }
        }
      }
    }

    // Determine display timezone (site setting) once per request
    const siteTz = (await (async () => {
      try {
        const { getSiteTz } = await import("../config/siteTz");
        return await getSiteTz();
      } catch {
        return await getSiteTimezone();
      }
    })());

    // Convert to calendar events with product titles
    const { toUtcMs } = await import("../lib/time");
    const events = (bookings || []).map((booking) => {
      let participants = 1;
      const pc: any = (booking as any).person_counts;
      if (Array.isArray(pc))
        participants = pc.reduce(
          (s: number, n: number) => s + (Number(n) || 0),
          0,
        );
      else if (typeof pc === "number") participants = pc;
      else if (pc && typeof pc === "object")
        participants = Object.values(pc).reduce(
          (s: number, n: any) => s + (Number(n) || 0),
          0,
        );
      participants = Math.max(1, participants);

      const productName =
        booking.product?.name ||
        productTitleMap.get(booking.product_id) ||
        undefined;

      const rawStart = (booking as any).start ?? (booking as any).booking_start ?? (booking as any)._booking_start;
      const rawEnd = (booking as any).end ?? (booking as any).booking_end ?? (booking as any)._booking_end;
      const startMs = toUtcMs(rawStart, siteTz || "UTC");
      const endMs = toUtcMs(rawEnd, siteTz || "UTC");

      const localTz =
        (booking as any).local_timezone || siteTz || "America/New_York";

      return {
        id: `wc-${booking.id}`,
        title: productName || `Booking #${booking.id}`,
        start: new Date(startMs || 0),
        end: new Date(endMs || (startMs || 0)),
        participants,
        maxParticipants: 15,
        status: booking.status,
        customer: {
          name: booking.customer
            ? `${booking.customer.first_name} ${booking.customer.last_name}`
            : "Unknown",
          email: booking.customer?.email || "",
          phone: booking.customer?.phone,
        },
        allDay: (booking as any).all_day,
        resourceId: (booking as any).resource_id,
        localTimezone: localTz,
        personCountsRaw: (booking as any).person_counts,
        bookingMeta: {
          google_calendar_event_id: (booking as any).google_calendar_event_id,
          date_created: ((): number | null => {
            const v = (booking as any).date_created;
            return v ? toUtcMs(v, siteTz || "UTC") : null;
          })(),
          date_modified: ((): number | null => {
            const v = (booking as any).date_modified;
            return v ? toUtcMs(v, siteTz || "UTC") : null;
          })(),
        },
        wooCommerceData: {
          bookingId: booking.id,
          orderId: booking.order_id,
          productId: booking.product_id,
        },
        order: null,
      };
    });

    const payload = {
      success: true,
      data: events,
      total: bookings.length,
      bookings_available: true,
    };
    bookingsCache.set(cacheKey, { ts: Date.now(), data: events });
    res.set("Cache-Control", "public, max-age=180, stale-while-revalidate=600");
    res.json(payload);
  } catch (error) {
    console.error("Error fetching bookings:", error);

    // Return demo mode instead of error
    res.json({
      success: true,
      data: [],
      total: 0,
      message:
        error instanceof Error ? error.message : "Failed to fetch bookings",
      bookings_available: false,
      demo_mode: true,
    });
  }
};

// Get booking products (tours)
export const getBookingProducts: RequestHandler = async (req, res) => {
  try {
    const products = await wooFetch<WooCommerceProduct[]>("products", {
      method: "GET",
    });

    // Filter for booking products, but also include any products that might be tours
    const bookingProducts = products.filter(
      (product) =>
        product.type === "booking" ||
        product.name.toLowerCase().includes("dive") ||
        product.name.toLowerCase().includes("tour") ||
        product.name.toLowerCase().includes("scuba") ||
        product.name.toLowerCase().includes("snorkel"),
    );

    res.json({
      success: true,
      data: bookingProducts,
      total: bookingProducts.length,
      has_booking_products: products.some((p) => p.type === "booking"),
      all_products_count: products.length,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch products",
    });
  }
};

// Get single product by ID
export const getProductById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params as any;
    if (!id)
      return res
        .status(400)
        .json({ success: false, error: "Product ID is required" });
    const product = await wooFetch<WooCommerceProduct>(`products/${id}`, {
      method: "GET",
    });
    res.json({ success: true, data: product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res
      .status(500)
      .json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch product",
      });
  }
};

// Create new booking
export const createBooking: RequestHandler = async (req, res) => {
  try {
    const bookingData: CreateBookingRequest = req.body;

    // Create booking via WooCommerce API
    const newBooking = await wooFetch<WooCommerceBooking>("bookings", {
      method: "POST",
      body: JSON.stringify({
        product_id: bookingData.product_id,
        start: bookingData.start_date,
        end: bookingData.end_date,
        person_counts: bookingData.person_counts,
        customer_id: bookingData.customer_id,
        status: "pending",
      }),
    });

    // Convert to calendar event
    const event = convertToCalendarEvent(newBooking);

    res.json({
      success: true,
      data: event,
      booking_id: newBooking.id,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create booking",
    });
  }
};

// Get customers
export const getCustomers: RequestHandler = async (req, res) => {
  try {
    const { search, page = "1", per_page = "20" } = req.query;

    const params: Record<string, string> = {
      page: page as string,
      per_page: per_page as string,
    };

    if (search) {
      params.search = search as string;
    }

    const customers = await wooFetch<WooCommerceCustomer[]>("customers", {
      method: "GET",
    });

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch customers",
    });
  }
};

// Get orders
export const getOrders: RequestHandler = async (req, res) => {
  try {
    const orders = await wooFetch<WooCommerceOrder[]>("orders", {
      method: "GET",
    });
    res.json({ success: true, data: orders, total: orders.length });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res
      .status(500)
      .json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch orders",
      });
  }
};

// Get a single order by ID
export const getOrderById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params as any;
    if (!id)
      return res
        .status(400)
        .json({ success: false, error: "Order ID is required" });
    const order = await wooFetch<WooCommerceOrder>(`orders/${id}`, {
      method: "GET",
    });
    res.json({ success: true, data: order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res
      .status(500)
      .json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch order",
      });
  }
};

// Get last N bookings and orders for testing
export const getRecentData: RequestHandler = async (req, res) => {
  try {
    const { count = "5" } = req.query;
    const limitCount = parseInt(count as string, 10);

    console.log(`Fetching last ${limitCount} bookings and orders...`);

    let recentBookings: WooCommerceBooking[] = [];
    let recentOrders: WooCommerceOrder[] = [];
    let bookingsError: string | null = null;
    let ordersError: string | null = null;

    // Try to get recent bookings
    try {
      const allBookings = await wooFetch<WooCommerceBooking[]>("bookings", {
        method: "GET",
      });
      recentBookings = allBookings
        .sort(
          (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
        )
        .slice(0, limitCount);
      console.log(`Found ${recentBookings.length} recent bookings`);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      bookingsError =
        error instanceof Error ? error.message : "Failed to fetch bookings";
    }

    // Try to get recent orders
    try {
      const allOrders = await wooFetch<WooCommerceOrder[]>("orders", {
        method: "GET",
      });
      recentOrders = allOrders
        .sort(
          (a, b) =>
            new Date(b.date_created).getTime() -
            new Date(a.date_created).getTime(),
        )
        .slice(0, limitCount);
      console.log(`Found ${recentOrders.length} recent orders`);
    } catch (error) {
      console.error("Error fetching orders:", error);
      ordersError =
        error instanceof Error ? error.message : "Failed to fetch orders";
    }

    res.json({
      success: true,
      data: {
        bookings: {
          success: !bookingsError,
          count: recentBookings.length,
          data: recentBookings,
          error: bookingsError,
        },
        orders: {
          success: !ordersError,
          count: recentOrders.length,
          data: recentOrders,
          error: ordersError,
        },
      },
      message: `Retrieved last ${limitCount} bookings and orders`,
    });
  } catch (error) {
    console.error("Error fetching recent data:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch recent data",
    });
  }
};

// Test posting recent bookings and orders
export const testPostRecentData: RequestHandler = async (req, res) => {
  try {
    const { count = "5" } = req.query;
    const limitCount = parseInt(count as string, 10);

    console.log(`Testing POST for last ${limitCount} bookings and orders...`);

    // First get the recent data
    let recentBookings: WooCommerceBooking[] = [];
    let recentOrders: WooCommerceOrder[] = [];
    let results: any = {
      bookings: { fetched: 0, posted: 0, errors: [] },
      orders: { fetched: 0, posted: 0, errors: [] },
    };

    // Get recent bookings
    try {
      const allBookings = await wooFetch<WooCommerceBooking[]>("bookings", {
        method: "GET",
      });
      recentBookings = allBookings
        .sort(
          (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
        )
        .slice(0, limitCount);
      results.bookings.fetched = recentBookings.length;
    } catch (error) {
      results.bookings.errors.push(
        `Fetch error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Get recent orders
    try {
      const allOrders = await wooFetch<WooCommerceOrder[]>("orders", {
        method: "GET",
      });
      recentOrders = allOrders
        .sort(
          (a, b) =>
            new Date(b.date_created).getTime() -
            new Date(a.date_created).getTime(),
        )
        .slice(0, limitCount);
      results.orders.fetched = recentOrders.length;
    } catch (error) {
      results.orders.errors.push(
        `Fetch error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Test posting bookings (simulation - we'll modify and re-post)
    for (const booking of recentBookings) {
      try {
        // Create a test booking payload (modify some data to avoid conflicts)
        const testBooking = {
          product_id: booking.product_id,
          start: booking.start,
          end: booking.end,
          person_counts: booking.person_counts,
          customer_id: booking.customer_id,
          status: "pending" as const,
        };

        console.log(
          `Testing POST booking for product ${booking.product_id}...`,
        );

        // NOTE: In a real scenario, this would create a new booking
        // For testing, we'll just validate the payload structure
        const postResult = {
          test: true,
          original_id: booking.id,
          payload: testBooking,
          status: "would_create_new_booking",
        };

        results.bookings.posted++;
        console.log(`Booking test ${booking.id} completed`);
      } catch (error) {
        results.bookings.errors.push(
          `Post error for booking ${booking.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Test posting orders (simulation)
    for (const order of recentOrders) {
      try {
        // Create a test order payload
        const testOrder = {
          line_items: order.line_items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          billing: order.billing,
          customer_id: order.customer_id,
          status: "pending" as const,
        };

        console.log(`Testing POST order ${order.number}...`);

        // NOTE: In a real scenario, this would create a new order
        // For testing, we'll just validate the payload structure
        const postResult = {
          test: true,
          original_id: order.id,
          payload: testOrder,
          status: "would_create_new_order",
        };

        results.orders.posted++;
        console.log(`Order test ${order.id} completed`);
      } catch (error) {
        results.orders.errors.push(
          `Post error for order ${order.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    const summary = {
      bookings: `${results.bookings.posted}/${results.bookings.fetched} bookings processed`,
      orders: `${results.orders.posted}/${results.orders.fetched} orders processed`,
      total_errors:
        results.bookings.errors.length + results.orders.errors.length,
    };

    res.json({
      success: true,
      message: `Post test completed for last ${limitCount} items`,
      summary,
      details: results,
      note: "This was a simulation test - no actual new records were created",
    });
  } catch (error) {
    console.error("Error in post test:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to run post test",
    });
  }
};

// Test WooCommerce connection
export const testConnection: RequestHandler = async (req, res) => {
  console.log("WooCommerce test connection endpoint called");
  try {
    // First check if WooCommerce credentials are configured
    const config = getWooConfig();
    if (!config) {
      console.log("❌ WooCommerce credentials not configured");
      return res.status(400).json({
        success: false,
        error: "WooCommerce credentials not configured",
        message:
          "Please set WOOCOMMERCE_STORE_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET environment variables",
        config_status: {
          store_url: !!process.env.WOOCOMMERCE_STORE_URL,
          consumer_key: !!process.env.WOOCOMMERCE_CONSUMER_KEY,
          consumer_secret: !!process.env.WOOCOMMERCE_CONSUMER_SECRET,
        },
      });
    }

    // Try multiple endpoints to test connection
    let connectionWorking = false;
    let testResults: any = {};

    console.log("Testing WooCommerce products endpoint...");

    // Test 1: Basic products endpoint
    try {
      const products = await wooFetch<WooCommerceProduct[]>("products", {
        method: "GET",
      });
      console.log(
        `Products fetch successful: ${products.length} products found`,
      );
      testResults.products = {
        success: true,
        count: products.length,
      };
      connectionWorking = true;
    } catch (error) {
      console.error("Products fetch failed:", error);
      testResults.products = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    console.log("Testing WooCommerce system status...");

    // Test 2: System status (optional)
    try {
      await wooFetch("system_status");
      console.log("System status fetch successful");
      testResults.system_status = { success: true };
    } catch (error) {
      console.error("System status fetch failed:", error);
      testResults.system_status = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    const response = {
      success: connectionWorking,
      message: connectionWorking
        ? "WooCommerce connection successful"
        : "WooCommerce connection failed",
      timestamp: new Date().toISOString(),
      tests: testResults,
      config_configured: true,
    };

    console.log("Sending response:", JSON.stringify(response, null, 2));

    if (connectionWorking) {
      res.json(response);
    } else {
      res.status(500).json(response);
    }
  } catch (error) {
    console.error("WooCommerce connection test failed with exception:", error);
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Connection test failed",
      config_configured: !!getWooConfig(),
    };
    console.log(
      "Sending error response:",
      JSON.stringify(errorResponse, null, 2),
    );
    res.status(500).json(errorResponse);
  }
};
