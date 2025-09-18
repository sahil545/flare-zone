import { RequestHandler } from "express";

// WooCommerce configuration
const getWooConfig = () => {
  const url = process.env.WOOCOMMERCE_STORE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) {
    console.warn("⚠️ Missing WooCommerce configuration");
    return null;
  }

  return { url, consumerKey, consumerSecret };
};

// Create Basic Auth header like the working project
const createAuthHeader = (
  consumerKey: string,
  consumerSecret: string,
): string => {
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);
  return `Basic ${credentials}`;
};

// Fetch wrapper with proper authentication
const wooFetch = async (endpoint: string, options: RequestInit = {}) => {
  const config = getWooConfig();
  if (!config) {
    throw new Error("WooCommerce configuration missing");
  }

  const url = `${config.url}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: createAuthHeader(
        config.consumerKey,
        config.consumerSecret,
      ),
      "Content-Type": "application/json",
      "User-Agent": "BookingCalendarApp/1.0",
      ...options.headers,
    },
    signal: AbortSignal.timeout(4000), // reduced timeout to avoid proxy 502
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

// simple cache for product settings to compute capacities
const productSettingsCache = new Map<
  number,
  { ts: number; maxPerBlock: number | null }
>();
const PRODUCT_SETTINGS_TTL = 12 * 60 * 60 * 1000;

// Main API handler matching the working project pattern
export const handleWcBookings: RequestHandler = async (req, res) => {
  try {
    const { action, product_id, ...otherParams } = req.query as any;

    console.log(`🔗 WC-Bookings API: ${req.method} ${req.path}`, {
      action,
      product_id,
      otherParams,
    });

    if (req.method === "GET") {
      if (action === "get_availability") {
        return await handleGetAvailability(req, res);
      } else {
        // Default: get recent bookings for the booking list
        return await handleGetBookings(req, res);
      }
    } else if (req.method === "POST") {
      return await handleCreateBooking(req, res);
    }

    res.status(400).json({
      success: false,
      error: "Invalid request",
    });
  } catch (error) {
    console.error("❌ WC-Bookings API Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

// Get availability - matches working project flow
const handleGetAvailability = async (req: any, res: any) => {
  const { product_id, min_date, max_date } = req.query;

  console.log(`📅 Getting availability for product ${product_id}`, {
    min_date,
    max_date,
  });

  try {
    // Step 1: Get product details (like working project)
    console.log(`🛍️ Fetching product details for ID ${product_id}`);
    const product = await wooFetch(`/wp-json/wc/v3/products/${product_id}`);

    // Step 2: Get booking slots using CORRECT API endpoint
    console.log(`🎯 Fetching booking slots for product ${product_id}`);
    const slotsEndpoint = `/wp-json/wc-bookings/v1/products/slots?product_ids=${product_id}`;
    const slotsUrl =
      min_date && max_date
        ? `${slotsEndpoint}&min_date=${min_date}&max_date=${max_date}`
        : slotsEndpoint;

    let slots = [];
    try {
      slots = await wooFetch(slotsUrl);
      console.log(`✅ Found ${slots.length} booking slots`);
    } catch (slotsError) {
      console.warn(`⚠️ Slots API failed, trying fallback: ${slotsError}`);

      // Step 3: Fallback to existing bookings (like working project)
      const bookings = await wooFetch(
        `/wp-json/wc/v3/bookings?product=${product_id}&per_page=50`,
      );
      const orders = await wooFetch(
        `/wp-json/wc/v3/orders?meta_key=_booking_product_id&meta_value=${product_id}&per_page=50`,
      );

      console.log(
        `📋 Fallback: Found ${bookings.length} bookings, ${orders.length} orders`,
      );

      // Convert bookings to slots format
      slots = bookings.map((booking: any) => ({
        date: booking.start,
        timestamp: booking.start,
        available: booking.status !== "confirmed",
        product_id: booking.product_id,
        booking_id: booking.id,
      }));
    }

    // Return data in format expected by frontend
    res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        type: product.type,
        price: product.price,
      },
      slots: slots,
      total_slots: slots.length,
      availability_source: slots.length > 0 ? "slots_api" : "fallback",
      date_range: { min_date, max_date },
    });
  } catch (error) {
    console.error(`❌ Availability error for product ${product_id}:`, error);

    // Return graceful fallback like working project
    res.json({
      success: true,
      product: { id: product_id, name: "Unknown Product" },
      slots: [],
      total_slots: 0,
      availability_source: "error_fallback",
      error:
        error instanceof Error ? error.message : "Failed to get availability",
    });
  }
};

// Aggregated availability across products in a date range
const AVAIL_RANGE_CACHE = new Map<string, { ts: number; data: any }>();
const AVAIL_TTL = 10 * 60 * 1000; // 10 minutes

export const handleAvailabilityRange: RequestHandler = async (req, res) => {
  try {
    const { min_date, max_date, product_ids } = req.query as any;
    const allowedIds = new Set<number>(
      String(product_ids || "")
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0),
    );
    const config = getWooConfig();
    if (!config)
      return res.status(400).json({
        success: false,
        error: "WooCommerce credentials not configured",
      });

    // Cache key and fast return
    const cacheKey = `${min_date || ""}|${max_date || ""}|${Array.from(
      allowedIds,
    )
      .sort((a, b) => a - b)
      .join(",")}`;
    const cached = AVAIL_RANGE_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < AVAIL_TTL) {
      res.set(
        "Cache-Control",
        "public, max-age=60, stale-while-revalidate=300",
      );
      return res.json({
        success: true,
        data: cached.data,
        total: cached.data?.length || 0,
        cached: true,
      });
    }

    // Fetch bookings within range (paginate)
    const qs = new URLSearchParams();
    if (min_date) qs.append("start_date_min", String(min_date));
    if (max_date) qs.append("start_date_max", String(max_date));
    qs.append("per_page", "100");

    let page = 1;
    const all: any[] = [];
    while (page <= 5) {
      const url = `/wp-json/wc-bookings/v1/bookings?${qs.toString()}&page=${page}`;
      let batch: any[] = [];
      try {
        batch = await wooFetch(url);
      } catch {
        break;
      }
      all.push(...batch);
      if (batch.length < 100) break;
      page++;
    }

    // Resolve product names (batch include)
    const productIds = Array.from(
      new Set(
        all
          .map((b) => b.product_id)
          .filter((x: any) => typeof x === "number")
          .filter((id: number) =>
            allowedIds.size ? allowedIds.has(id) : true,
          ),
      ),
    );
    const nameMap = new Map<number, string>();
    if (productIds.length) {
      try {
        const includeParam = productIds.join(",");
        const products = await wooFetch(
          `/wp-json/wc/v3/products?include=${includeParam}`,
        );
        for (const p of products || []) if (p?.id) nameMap.set(p.id, p.name);
      } catch {}
    }

    const getMaxFor = async (pid: number): Promise<number | null> => {
      const c = productSettingsCache.get(pid);
      if (c && Date.now() - c.ts < PRODUCT_SETTINGS_TTL) return c.maxPerBlock;
      try {
        const meta = await wooFetch(`/wp-json/wc-bookings/v1/products/${pid}`);
        const max =
          Number(meta?.max_bookings_per_block) ||
          Number(meta?.max_persons) ||
          null;
        const v = Number.isFinite(max as any) ? (max as number) : null;
        productSettingsCache.set(pid, { ts: Date.now(), maxPerBlock: v });
        return v;
      } catch {
        productSettingsCache.set(pid, { ts: Date.now(), maxPerBlock: null });
        return null;
      }
    };

    const getMaxMap = async (
      ids: number[],
    ): Promise<Map<number, number | null>> => {
      const unique = Array.from(new Set(ids));
      const res = new Map<number, number | null>();
      const concurrency = Math.min(6, unique.length || 1);
      let index = 0;
      await Promise.all(
        Array.from({ length: concurrency }).map(async () => {
          while (index < unique.length) {
            const i = index++;
            const id = unique[i];
            const v = await getMaxFor(id);
            res.set(id, v);
          }
        }),
      );
      return res;
    };

    // Group by product and slot start
    const key = (pid: number, start: number) => `${pid}|${start}`;
    const map = new Map<
      string,
      { product_id: number; start: number; end: number; used: number }
    >();
    const parseCounts = (pc: any): number => {
      if (!pc) return 1;
      if (typeof pc === "number") return Math.max(1, pc);
      if (Array.isArray(pc))
        return Math.max(
          1,
          pc.reduce((s, n) => s + (Number(n) || 0), 0),
        );
      if (typeof pc === "object")
        return Math.max(
          1,
          Object.values(pc).reduce((s: any, n: any) => s + (Number(n) || 0), 0),
        );
      return 1;
    };

    for (const b of all) {
      if (allowedIds.size && !allowedIds.has(Number(b.product_id))) continue;
      const startMs =
        typeof b.start === "number"
          ? b.start > 1e12
            ? b.start
            : b.start * 1000
          : Date.parse(b.start);
      const endMs =
        typeof b.end === "number"
          ? b.end > 1e12
            ? b.end
            : b.end * 1000
          : Date.parse(b.end);
      const pid = Number(b.product_id);
      const k = key(pid, startMs);
      const prev = map.get(k);
      const used = parseCounts(b.person_counts);
      if (prev) {
        prev.used += used;
        prev.end = Math.max(prev.end, endMs || prev.end);
      } else {
        map.set(k, {
          product_id: pid,
          start: startMs,
          end: endMs || startMs,
          used,
        });
      }
    }

    const out: Array<any> = [];
    const totalsMap = await getMaxMap(
      Array.from(new Set(Array.from(map.values()).map((v) => v.product_id))),
    );
    for (const v of map.values()) {
      const total = totalsMap.get(v.product_id) ?? null;
      out.push({
        product_id: v.product_id,
        product_name: nameMap.get(v.product_id) || `Product #${v.product_id}`,
        start: new Date(v.start).toISOString(),
        end: new Date(v.end).toISOString(),
        used: v.used,
        total,
      });
    }

    AVAIL_RANGE_CACHE.set(cacheKey, { ts: Date.now(), data: out });
    res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
    return res.json({ success: true, data: out, total: out.length });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "availability_failed",
    });
  }
};

// Get bookings for the booking list
const handleGetBookings = async (req: any, res: any) => {
  const { count = "10" } = req.query;
  const limitCount = parseInt(count, 10);

  console.log(`📋 Getting last ${limitCount} bookings using orders endpoint`);

  try {
    // Use ORDERS endpoint since /wp-json/wc/v3/bookings doesn't exist
    // This matches the working project pattern
    const orders = await wooFetch(
      `/wp-json/wc/v3/orders?per_page=${limitCount}&orderby=date&order=desc`,
    );

    console.log(`✅ Found ${orders.length} orders`);

    // Process orders to extract booking data (like working project)
    const processedBookings = await Promise.all(
      orders.map(async (order: any) => {
        let product = null;
        let customer = null;

        // Extract booking metadata from order
        const bookingDate = order.meta_data?.find(
          (meta: any) => meta.key === "_booking_date",
        )?.value;
        const bookingTime = order.meta_data?.find(
          (meta: any) => meta.key === "_booking_time",
        )?.value;
        const bookingGuests = order.meta_data?.find(
          (meta: any) => meta.key === "_booking_guests",
        )?.value;
        const bookingProductId = order.meta_data?.find(
          (meta: any) => meta.key === "_booking_product_id",
        )?.value;

        // Get product details from first line item or booking metadata
        const productId = bookingProductId || order.line_items?.[0]?.product_id;
        if (productId) {
          try {
            product = await wooFetch(`/wp-json/wc/v3/products/${productId}`);
          } catch (error) {
            console.warn(`Failed to fetch product ${productId}:`, error);
          }
        }

        // Get customer details
        if (order.customer_id) {
          try {
            customer = await wooFetch(
              `/wp-json/wc/v3/customers/${order.customer_id}`,
            );
          } catch (error) {
            console.warn(
              `Failed to fetch customer ${order.customer_id}:`,
              error,
            );
          }
        }

        // Convert order to booking format
        const bookingStart =
          bookingDate && bookingTime
            ? new Date(`${bookingDate}T${bookingTime}`).getTime() / 1000
            : new Date(order.date_created).getTime() / 1000;

        return {
          id: order.id,
          order_id: order.id,
          product_id: productId,
          status: order.status,
          start: bookingStart,
          end: bookingStart + 4 * 3600, // Default 4 hours duration
          all_day: false,
          cost: order.total,
          customer_id: order.customer_id,
          person_counts: parseInt(bookingGuests) || 1,
          product,
          customer: customer || {
            id: order.customer_id,
            first_name: order.billing?.first_name || "",
            last_name: order.billing?.last_name || "",
            email: order.billing?.email || "",
            phone: order.billing?.phone || "",
          },
          order: order,
          date_created: order.date_created,
          date_modified: order.date_modified,
          // Additional booking metadata
          booking_date: bookingDate,
          booking_time: bookingTime,
          booking_guests: bookingGuests,
        };
      }),
    );

    res.json({
      success: true,
      data: processedBookings,
      total: processedBookings.length,
      source: "wc_orders_api_converted_to_bookings",
    });
  } catch (error) {
    console.error("❌ Error fetching bookings:", error);
    res.json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch bookings",
      data: [],
    });
  }
};

// Create booking - matches working project pattern
const handleCreateBooking = async (req: any, res: any) => {
  const { product_id, date, time, guests, customer } = req.body;

  console.log(`🆕 Creating booking:`, {
    product_id,
    date,
    time,
    guests,
    customer,
  });

  try {
    // Create order with booking metadata (like working project)
    const orderData = {
      payment_method: "pending",
      billing: {
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone: customer.phone,
      },
      line_items: [
        {
          product_id: parseInt(product_id),
          quantity: parseInt(guests) || 1,
        },
      ],
      meta_data: [
        { key: "_booking_date", value: date },
        { key: "_booking_time", value: time },
        { key: "_booking_guests", value: parseInt(guests) || 1 },
        { key: "_booking_product_id", value: parseInt(product_id) },
      ],
    };

    const order = await wooFetch(`/wp-json/wc/v3/orders`, {
      method: "POST",
      body: JSON.stringify(orderData),
    });

    console.log(`✅ Created order ${order.id} for booking`);

    res.json({
      success: true,
      booking_id: order.id,
      order: order,
      checkout_url: order.checkout_payment_url || null,
    });
  } catch (error) {
    console.error("❌ Error creating booking:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create booking",
    });
  }
};

// Test connection endpoint
export const testWcBookingsConnection: RequestHandler = async (req, res) => {
  console.log("🔧 Testing WC-Bookings connection...");

  try {
    const config = getWooConfig();
    if (!config) {
      return res.status(400).json({
        success: false,
        error: "WooCommerce credentials not configured",
      });
    }

    // Test with the CORRECT endpoints like working project
    const tests = {
      products: false,
      bookings_slots: false,
      orders: false,
    };

    // Test 1: Products endpoint
    try {
      await wooFetch("/wp-json/wc/v3/products?per_page=1");
      tests.products = true;
      console.log("✅ Products API working");
    } catch (error) {
      console.log("❌ Products API failed:", error);
    }

    // Test 2: Booking slots endpoint (the correct one!)
    try {
      await wooFetch("/wp-json/wc-bookings/v1/products/slots");
      tests.bookings_slots = true;
      console.log("✅ Booking Slots API working");
    } catch (error) {
      console.log("❌ Booking Slots API failed:", error);
    }

    // Test 3: Orders endpoint (used for booking data)
    try {
      await wooFetch("/wp-json/wc/v3/orders?per_page=1");
      tests.orders = true;
      console.log("✅ Orders API working");
    } catch (error) {
      console.log("❌ Orders API failed:", error);
    }

    const allWorking = Object.values(tests).every(Boolean);

    res.json({
      success: allWorking,
      message: allWorking ? "All WC-Bookings APIs working" : "Some APIs failed",
      tests,
      store_url: config.url,
      has_credentials: true,
    });
  } catch (error) {
    console.error("❌ Connection test failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Connection test failed",
    });
  }
};
