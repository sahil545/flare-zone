import {
  BookingCalendarEvent,
  WooCommerceProduct,
  WooCommerceCustomer,
  WooCommerceOrder,
  CreateBookingRequest,
} from "@shared/woocommerce";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
  message?: string;
  bookings_available?: boolean;
  demo_mode?: boolean;
}

type AvailabilitySlot = {
  productId: number;
  productName: string;
  start: Date;
  end: Date;
  used: number;
  total: number | null;
};

class WooCommerceService {
  private async safeFetch(
    input: string,
    init?: RequestInit,
  ): Promise<Response> {
    const method = (init?.method || "GET").toUpperCase();
    if (method === "GET") {
      try {
        // Use XHR first to bypass analytics wrappers around fetch and reduce console noise
        return await this.xhrFetch(input);
      } catch (e) {
        // Fallback to fetch if XHR fails for any reason
        try {
          return await fetch(input, init as any);
        } catch (err) {
          throw err;
        }
      }
    }
    // Non-GET: use fetch (supports body, credentials, etc.)
    return await fetch(input, init as any);
  }
  private async xhrFetch(url: string): Promise<Response> {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            const ok = xhr.status >= 200 && xhr.status < 300;
            const body = xhr.responseText || "";
            const res: Response = {
              ok,
              status: xhr.status,
              statusText: String(xhr.status),
              url,
              headers: new Headers(),
              redirected: false,
              type: "basic",
              body: null,
              bodyUsed: false,
              clone: function () {
                return this;
              },
              arrayBuffer: async () => new TextEncoder().encode(body).buffer,
              blob: async () => new Blob([body], { type: "application/json" }),
              formData: async () => new FormData(),
              json: async () => {
                try {
                  return body ? JSON.parse(body) : null;
                } catch {
                  throw new Error("Invalid JSON");
                }
              },
              text: async () => body,
            } as any;
            resolve(res);
          }
        };
        xhr.onerror = () => reject(new TypeError("Network request failed"));
        xhr.send();
      } catch (e) {
        reject(e);
      }
    });
  }
  private baseUrl = "/api/woocommerce";
  private monthCache = new Map<string, BookingCalendarEvent[]>();
  private availabilityCache = new Map<
    string,
    Record<string, AvailabilitySlot[]>
  >();
  private availabilityInflight = new Map<
    string,
    Promise<Record<string, AvailabilitySlot[]>>
  >();

  private normalizeEvents(data: any[]): BookingCalendarEvent[] {
    return (data || []).map((e: any) => {
      const startMs =
        typeof e.start === "number"
          ? e.start > 1e12
            ? e.start
            : e.start * 1000
          : Date.parse(e.start);
      const endMs =
        typeof e.end === "number"
          ? e.end > 1e12
            ? e.end
            : e.end * 1000
          : Date.parse(e.end);
      return {
        ...e,
        start: new Date(startMs),
        end: new Date(isNaN(endMs) ? startMs : endMs),
      } as BookingCalendarEvent;
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      console.log("🏥 Starting health check...");

      const response = await fetch("/api/health", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });

      console.log("🏥 Health check response:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Health check successful:", data.status);
        return true;
      } else {
        console.error(
          "❌ Health check failed:",
          response.status,
          response.statusText,
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Health check error:", error);
      console.error("🔍 Error details:", {
        type: typeof error,
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    // Declare testUrl at function scope so it's available in catch block
    let testUrl = "/api/wc-bookings/test";

    try {
      console.log("🔗 Starting WooCommerce connection test...");
      console.log("🌍 Environment:", {
        location: window.location.href,
        origin: window.location.origin,
        baseUrl: this.baseUrl,
      });

      // First test basic API connectivity
      console.log("🏓 Testing basic API connectivity first...");
      try {
        const pingResponse = await fetch("/api/ping?t=" + Date.now(), {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (pingResponse.ok) {
          const pingData = await pingResponse.json();
          console.log("✅ Basic API connectivity working:", pingData);
        } else {
          console.warn(
            "⚠️ Basic API ping failed:",
            pingResponse.status,
            pingResponse.statusText,
          );
        }
      } catch (pingError) {
        console.error("❌ Basic API ping completely failed:", pingError);
        console.error("🚨 API server appears to be unreachable");
        return false;
      }

      console.log("�� NEW ENDPOINT: Testing WC-Bookings endpoint:", testUrl);
      console.log(
        "🌐 Full URL being tested:",
        new URL(testUrl, window.location.origin).toString(),
      );
      console.log("⏰ Timestamp:", new Date().toISOString());

      // Add cache busting to force fresh fetch
      const cacheBuster = `?t=${Date.now()}`;
      const response = await fetch(testUrl + cacheBuster, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      console.log("📊 Response details:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        url: response.url,
      });

      // Handle different types of responses
      if (response.status === 400) {
        // Credentials not configured
        const result = await response.json();
        console.log("⚠�� WooCommerce credentials missing:", result);

        if (
          result.error &&
          result.error.includes("credentials not configured")
        ) {
          console.log("📝 WooCommerce credentials need to be set up");
          return false; // Connection not working, but it's a config issue
        }
      }

      if (!response.ok) {
        console.error(
          "❌ Response not ok:",
          response.status,
          response.statusText,
        );

        // Try to get more details from the response
        try {
          const errorResult = await response.json();
          console.error("❌ Error details:", errorResult);
        } catch (parseError) {
          console.error("❌ Could not parse error response");
        }

        return false;
      }

      const result = await response.json();
      console.log("�� WooCommerce test result:", result);

      return result.success === true;
    } catch (error) {
      console.error("❌ WooCommerce connection test failed:", error);
      console.error("🔍 Error analysis:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        type: typeof error,
      });

      // Specific diagnosis for common errors
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        console.error("🚨 NETWORK ERROR DETECTED:");
        console.error(
          "   - This usually means the API server is not responding",
        );
        console.error("   - Check if the server is running properly");
        console.error("   - Verify network connectivity");
        console.error("   - URL attempted:", testUrl);
        console.error(
          "   - This could also mean WooCommerce credentials are not configured",
        );
        console.error("   - Server might not be running or reachable");
      }

      return false;
    }
  }

  private _cachedWpMe: { id: number } | null = null;

  private async getWpMe(): Promise<{ id: number } | null> {
    try {
      if (this._cachedWpMe) return this._cachedWpMe;
      const { getToken } = await import("@/lib/auth");
      const token = getToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      // Prefer proxy to avoid CORS/WAF
      const res = await this.safeFetch(`/api/wp/users/me`, { headers } as any);
      if (!res.ok) return null;
      const json = await res.json().catch(() => null as any);
      const id = json?.data?.id || json?.id;
      if (id) {
        this._cachedWpMe = { id: Number(id) };
        return this._cachedWpMe;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getInstructorAssignedBookings(params: {
    startDate: string;
    endDate: string;
  }): Promise<BookingCalendarEvent[]> {
    try {
      const { getToken } = await import("@/lib/auth");
      const token = getToken();
      const search = new URLSearchParams();
      if (params.startDate) search.set("start_date", params.startDate);
      if (params.endDate) search.set("end_date", params.endDate);
      // Prefer explicit instructor from URL slug/query for impersonation; fallback to current user
      let ensuredId: number | null = null;
      try {
        const path = (window.location.pathname || "").toLowerCase();
        const m = path.match(
          /^\/(?:instructor|bookings-instructor-role|bookingsinstructorrole)\/?([^\/?#]+)?/,
        );
        const slug = m && m[1] ? decodeURIComponent(m[1]) : "";
        const userQ =
          slug || new URLSearchParams(window.location.search).get("user") || "";
        if (userQ) {
          const resp = await this.safeFetch(
            `/api/wp/users/find?username=${encodeURIComponent(userQ)}`,
          );
          if (resp.ok) {
            const j = await resp.json().catch(() => null as any);
            const uid = j?.data?.id || j?.id;
            if (uid) ensuredId = Number(uid);
          }
        }
      } catch {}
      if (!ensuredId) {
        try {
          const me = await this.getWpMe();
          if (me?.id) ensuredId = Number(me.id);
        } catch {}
      }
      if (ensuredId) search.set("instructor_id", String(ensuredId));

      const res = await this.safeFetch(
        `/api/instructor/assigned-bookings?${search.toString()}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        } as any,
      );
      const json = await res.json().catch(() => null as any);
      if (!res.ok || !json?.success) {
        try {
          console.warn("Assigned bookings fetch failed:", {
            status: res.status,
            ok: res.ok,
            json,
            url: `/api/instructor/assigned-bookings?${search.toString()}`,
          });
        } catch {}
        return [];
      }
      try {
        console.log("Assigned bookings fetched:", {
          count: Array.isArray(json?.data) ? json.data.length : 0,
          first: Array.isArray(json?.data) ? json.data[0] : null,
        });
      } catch {}
      const events: BookingCalendarEvent[] = (json.data || []).map((b: any) => {
        const startMs =
          typeof b.start === "number"
            ? b.start > 1e12
              ? b.start
              : b.start * 1000
            : Date.parse(String(b.start));
        const endMs =
          typeof b.end === "number"
            ? b.end > 1e12
              ? b.end
              : b.end * 1000
            : Date.parse(String(b.end));
        return {
          id: `wb-${b.id}`,
          title: b.title || `Booking #${b.id}`,
          start: new Date(startMs),
          end: new Date(isNaN(endMs) ? startMs : endMs),
          participants: typeof b.persons === "number" ? b.persons : 1,
          maxParticipants: 15,
          status: "confirmed",
          customer: { name: "", email: "" },
          wooCommerceData: {
            bookingId: b.id,
            orderId: 0,
            productId: b.product_id,
          },
        } as any;
      });
      return events;
    } catch {
      return [];
    }
  }

  async getBookings(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<BookingCalendarEvent[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.startDate)
        searchParams.append("start_date", params.startDate);
      if (params?.endDate) searchParams.append("end_date", params.endDate);
      if (params?.status) searchParams.append("status", params.status);

      // Try new wc-bookings endpoint first, fallback to legacy
      const newUrl = `/api/wc-bookings${searchParams.toString() ? "?" + searchParams.toString() : ""}`;
      const legacyUrl = `${this.baseUrl}/bookings${searchParams.toString() ? "?" + searchParams.toString() : ""}`;

      const urlWithBust = legacyUrl;
      console.log("📅 Fetching real bookings from:", urlWithBust);

      let result: ApiResponse<BookingCalendarEvent[]>;
      let lastError: any = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await this.safeFetch(urlWithBust, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
            credentials: "same-origin",
          } as any);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          result = await response.json();
          console.log("📋 Bookings endpoint result:", result);
          break;
        } catch (err) {
          lastError = err;
          console.warn(`⚠️ Bookings fetch attempt ${attempt} failed`, err);
          if (attempt === 2) {
            throw err;
          }
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      if (!result.success && !result.demo_mode) {
        // Check if it's a credentials issue
        if (result.credentials_missing) {
          console.log("⚠️ WooCommerce credentials missing:", result.message);
          return []; // Return empty array instead of throwing error
        }
        throw new Error(result.error || "Failed to fetch bookings");
      }

      // If bookings are not available (e.g., WooCommerce Bookings plugin not installed)
      // return empty array but don't throw error
      if (result.bookings_available === false) {
        console.log("WooCommerce Bookings not available:", result.message);
        return [];
      }

      // Convert new API format to calendar events if needed
      if (
        result.data &&
        result.source === "wc_orders_api_converted_to_bookings"
      ) {
        console.log("🔄 Converting new API bookings to calendar format");
        return result.data.map(
          (booking: any): BookingCalendarEvent => ({
            id: `wc-${booking.id}`,
            title: booking.product?.name || `Booking #${booking.id}`,
            start: new Date(booking.start * 1000),
            end: new Date(booking.end * 1000),
            participants: booking.person_counts || 1,
            maxParticipants: 15,
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
          }),
        );
      }

      return result.data || [];
    } catch (error) {
      console.warn(
        "Bookings request failed (network or server). Falling back to empty list.",
      );
      // Do not throw; fail gracefully so calendar can render without noisy errors
      return [];
    }
  }

  async getProductById(id: number): Promise<WooCommerceProduct | null> {
    try {
      const url = `${this.baseUrl}/products/${id}?t=${Date.now()}`;
      const response = await this.safeFetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        credentials: "same-origin",
      } as any);
      if (!response.ok) return null;
      const result: ApiResponse<WooCommerceProduct> = await response.json();
      if (!result.success || !result.data) return null;
      return result.data;
    } catch (e) {
      console.warn("getProductById failed", id, e);
      return null;
    }
  }

  async getProductsByCategoryRoot(
    root: string,
    onlyBooking: boolean = false,
  ): Promise<WooCommerceProduct[]> {
    try {
      const url = `${this.baseUrl}/products/by-category-tree?root=${encodeURIComponent(root)}&only_booking=${onlyBooking ? "1" : "0"}&include_root=1`;
      const response = await this.safeFetch(url as any);
      if (!response.ok) return [];
      const result: ApiResponse<WooCommerceProduct[]> = await response.json();
      if (!result.success) return [];
      return result.data || [];
    } catch (e) {
      console.warn("getProductsByCategoryRoot failed", root, e);
      return [];
    }
  }

  async getBookingProducts(): Promise<WooCommerceProduct[]> {
    try {
      const response = await this.safeFetch(`${this.baseUrl}/products` as any);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<WooCommerceProduct[]> = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch products");
      }

      return result.data || [];
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  }

  async createBooking(
    bookingData: CreateBookingRequest,
  ): Promise<BookingCalendarEvent> {
    try {
      const response = await fetch(`${this.baseUrl}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<BookingCalendarEvent> = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create booking");
      }

      if (!result.data) {
        throw new Error("No booking data returned");
      }

      return result.data;
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  }

  async getCustomers(params?: {
    search?: string;
    page?: number;
    perPage?: number;
  }): Promise<WooCommerceCustomer[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append("search", params.search);
      if (params?.page) searchParams.append("page", params.page.toString());
      if (params?.perPage)
        searchParams.append("per_page", params.perPage.toString());

      const url = `${this.baseUrl}/customers${searchParams.toString() ? "?" + searchParams.toString() : ""}`;
      const response = await this.safeFetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<WooCommerceCustomer[]> = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch customers");
      }

      return result.data || [];
    } catch (error) {
      console.error("Error fetching customers:", error);
      throw error;
    }
  }

  async getOrderById(id: number): Promise<WooCommerceOrder> {
    const response = await this.safeFetch(`${this.baseUrl}/orders/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    } as any);
    if (!response.ok)
      throw new Error(`Failed to fetch order ${id}: ${response.status}`);
    const result: ApiResponse<WooCommerceOrder> = await response.json();
    if (!result.success || !result.data)
      throw new Error(result.error || "No order");
    return result.data;
  }

  async getOrders(params?: {
    per_page?: number;
    page?: number;
    status?: string;
  }): Promise<WooCommerceOrder[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.per_page)
        searchParams.append("per_page", params.per_page.toString());
      if (params?.page) searchParams.append("page", params.page.toString());
      if (params?.status) searchParams.append("status", params.status);

      const url = `${this.baseUrl}/orders${searchParams.toString() ? "?" + searchParams.toString() : ""}`;
      console.log("Fetching orders from:", url);

      const response = await this.safeFetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      } as any);

      if (!response.ok) {
        console.error(
          "Orders fetch failed:",
          response.status,
          response.statusText,
        );
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const result: ApiResponse<WooCommerceOrder[]> = await response.json();
      console.log("Orders fetch result:", result);

      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || "Failed to fetch orders");
      }
    } catch (error) {
      console.error("Get orders failed:", error);
      throw error;
    }
  }

  async getAvailabilityBlocks(params: {
    startDate: string;
    endDate: string;
    productIds?: number[];
    preferBookings?: boolean;
  }): Promise<Record<string, AvailabilitySlot[]>> {
    const keyIds = (params.productIds || [])
      .slice()
      .sort((a, b) => a - b)
      .join(",");
    const cacheKey = `${params.startDate}|${params.endDate}|${keyIds}`;

    if (this.availabilityCache.has(cacheKey)) {
      return this.availabilityCache.get(cacheKey)!;
    }
    if (this.availabilityInflight.has(cacheKey)) {
      return this.availabilityInflight.get(cacheKey)!;
    }

    const buildFromServer = async (): Promise<
      Record<string, AvailabilitySlot[]>
    > => {
      const searchParams = new URLSearchParams();
      searchParams.append("min_date", params.startDate);
      searchParams.append("max_date", params.endDate);
      if (params.productIds && params.productIds.length) {
        searchParams.append("product_ids", params.productIds.join(","));
      }
      const url = `/api/wc-bookings/availability?${searchParams.toString()}`;
      const res = await this.safeFetch(url, {
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      } as any);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      const slots = Array.isArray(result?.data) ? result.data : [];
      const byDate: Record<string, AvailabilitySlot[]> = {};
      for (const it of slots) {
        const start = new Date(it.start);
        const end = new Date(it.end);
        const dateKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
        const slot: AvailabilitySlot = {
          productId: it.product_id,
          productName: it.product_name || `Product #${it.product_id}`,
          start,
          end,
          used: Number(it.used) || 0,
          total:
            typeof it.total === "number"
              ? it.total
              : it.total == null
                ? null
                : Number(it.total) || null,
        };
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(slot);
      }
      Object.values(byDate).forEach((list) =>
        list.sort(
          (a, b) =>
            a.start.getTime() - b.start.getTime() ||
            a.productName.localeCompare(b.productName),
        ),
      );
      return byDate;
    };

    const buildFallbackFromBookings = async (): Promise<
      Record<string, AvailabilitySlot[]>
    > => {
      const events = await this.getCalendarBookings({
        startDate: params.startDate,
        endDate: params.endDate,
      });
      const byDate: Record<string, AvailabilitySlot[]> = {};
      // group by productId + start
      const grouped = new Map<
        string,
        { productId: number; start: number; end: number; used: number }
      >();
      const productIds = new Set<number>();
      for (const ev of events) {
        const pid = ev.wooCommerceData?.productId || 0;
        const start = ev.start.getTime();
        const end = ev.end?.getTime?.() || start;
        const key = `${pid}|${start}`;
        const prev = grouped.get(key);
        if (prev) {
          prev.used += ev.participants || 1;
          prev.end = Math.max(prev.end, end);
        } else {
          grouped.set(key, {
            productId: pid,
            start,
            end,
            used: ev.participants || 1,
          });
        }
        if (pid) productIds.add(pid);
      }

      // Prefetch names in parallel for missing ids
      const nameMap = new Map<number, string>();
      await Promise.all(
        Array.from(productIds).map(async (id) => {
          try {
            const p = await this.getProductById(id);
            if (p?.name) nameMap.set(id, p.name);
          } catch {}
        }),
      );

      for (const g of grouped.values()) {
        const productName =
          nameMap.get(g.productId) || `Product #${g.productId}`;
        const start = new Date(g.start);
        const end = new Date(g.end);
        const dateKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
        const slot: AvailabilitySlot = {
          productId: g.productId,
          productName,
          start,
          end,
          used: g.used,
          total: null,
        };
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(slot);
      }
      Object.values(byDate).forEach((list) =>
        list.sort(
          (a, b) =>
            a.start.getTime() - b.start.getTime() ||
            a.productName.localeCompare(b.productName),
        ),
      );
      return byDate;
    };

    const promise = (async () => {
      try {
        if (params.preferBookings) {
          const data = await buildFallbackFromBookings();
          this.availabilityCache.set(cacheKey, data);
          return data;
        }
        const data = await buildFromServer();
        this.availabilityCache.set(cacheKey, data);
        return data;
      } catch {
        const data = await buildFallbackFromBookings();
        this.availabilityCache.set(cacheKey, data);
        return data;
      } finally {
        this.availabilityInflight.delete(cacheKey);
      }
    })();

    this.availabilityInflight.set(cacheKey, promise);
    return promise;
  }

  async getRecentData(count: number = 5): Promise<{
    bookings: { success: boolean; count: number; data: any[]; error?: string };
    orders: { success: boolean; count: number; data: any[]; error?: string };
  }> {
    try {
      // Use the NEW wc-bookings endpoint that matches working project
      const url = `/api/wc-bookings?count=${count}`;
      console.log("📋 Fetching recent booking data from:", url);

      const response = await this.safeFetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      } as any);

      if (!response.ok) {
        console.error(
          "Recent data fetch failed:",
          response.status,
          response.statusText,
        );
        throw new Error(`Failed to fetch recent data: ${response.status}`);
      }

      const result = await response.json();
      console.log("📋 WC-Bookings result:", result);

      if (result.success && result.data) {
        // Format response to match expected structure
        return {
          bookings: {
            success: true,
            count: result.data.length,
            data: result.data,
          },
          orders: {
            success: true,
            count: 0,
            data: [],
          },
        };
      } else {
        throw new Error(result.error || "Failed to fetch recent data");
      }
    } catch (error) {
      console.error("Get recent data failed:", error);
      throw error;
    }
  }

  async testPostRecentData(count: number = 5): Promise<any> {
    try {
      const url = `${this.baseUrl}/test-post?count=${count}`;
      console.log("Testing post recent data to:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          "Post test failed:",
          response.status,
          response.statusText,
        );
        throw new Error(`Failed to test post: ${response.status}`);
      }

      const result = await response.json();
      console.log("Post test result:", result);

      return result;
    } catch (error) {
      console.error("Test post failed:", error);
      throw error;
    }
  }

  // Fallback: convert recent booking-list style item to calendar event
  private convertRecentItemToEvent(item: any): BookingCalendarEvent {
    const startMs =
      typeof item.start === "number"
        ? item.start * 1000
        : Date.parse(item.start);
    const endMs =
      typeof item.end === "number" ? item.end * 1000 : Date.parse(item.end);

    const participants = (() => {
      const pc = item.person_counts;
      if (!pc) return 1;
      if (typeof pc === "number") return Math.max(1, pc);
      if (Array.isArray(pc))
        return Math.max(
          1,
          pc.reduce((s: number, n: number) => s + (Number(n) || 0), 0),
        );
      if (typeof pc === "object")
        return Math.max(
          1,
          Object.values(pc).reduce(
            (s: number, n: any) => s + (Number(n) || 0),
            0,
          ),
        );
      return 1;
    })();

    return {
      id: `wc-${item.id}`,
      title:
        item.product?.name ||
        item.order?.line_items?.[0]?.name ||
        `Booking #${item.id}`,
      start: new Date(startMs),
      end: new Date(endMs || startMs + 2 * 60 * 60 * 1000),
      participants,
      maxParticipants: 15,
      status: (item.status as any) || "pending",
      customer: {
        name: item.customer
          ? `${item.customer.first_name || ""} ${item.customer.last_name || ""}`.trim()
          : `${item.order?.billing?.first_name || ""} ${item.order?.billing?.last_name || ""}`.trim() ||
            "Unknown",
        email: item.customer?.email || item.order?.billing?.email || "",
        phone: item.customer?.phone || item.order?.billing?.phone,
      },
      wooCommerceData: {
        bookingId: Number(item.id) || 0,
        orderId: Number(item.order_id || item.order?.id) || 0,
        productId:
          Number(item.product_id || item.order?.line_items?.[0]?.product_id) ||
          0,
      },
    };
  }

  // Calendar helper: only real bookings with simple month cache
  async getCalendarBookings(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<BookingCalendarEvent[]> {
    try {
      const key = `${params?.startDate || ""}|${params?.endDate || ""}|${params?.status || ""}`;
      const cached = this.monthCache.get(key);
      if (cached) return cached;

      const events = await this.getBookings(params);
      const normalized = Array.isArray(events)
        ? this.normalizeEvents(events)
        : [];
      this.monthCache.set(key, normalized);
      return normalized;
    } catch (e) {
      console.warn("Calendar bookings fetch failed. Rendering without data.");
      return [];
    }
  }

  // Utility methods
  formatBookingForCalendar(bookings: BookingCalendarEvent[]): {
    [dateKey: string]: BookingCalendarEvent[];
  } {
    const grouped: { [dateKey: string]: BookingCalendarEvent[] } = {};

    const toLocalKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    bookings.forEach((booking) => {
      const start =
        booking.start instanceof Date
          ? booking.start
          : new Date(booking.start as any);
      const dateKey = toLocalKey(start);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push({ ...booking, start });
    });

    return grouped;
  }

  getBookingStatusColor(status: string): string {
    switch (status) {
      case "confirmed":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  }
}

// Export singleton instance
export const wooCommerceService = new WooCommerceService();
export default wooCommerceService;
