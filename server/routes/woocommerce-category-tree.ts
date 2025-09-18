import { RequestHandler } from "express";
import { WooCommerceProduct } from "@shared/woocommerce";

// Minimal local helpers to avoid circular dependencies
const getWooConfig = () => {
  const url = process.env.WOOCOMMERCE_STORE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  if (!url || !consumerKey || !consumerSecret) return null;
  return { url, consumerKey, consumerSecret };
};
const createApiUrl = (endpoint: string) => {
  const cfg = getWooConfig();
  if (!cfg) return null;
  const url = new URL(`${cfg.url}/wp-json/wc/v3/${endpoint}`);
  url.searchParams.append('consumer_key', cfg.consumerKey);
  url.searchParams.append('consumer_secret', cfg.consumerSecret);
  return url.toString();
};
const wooFetch = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const url = createApiUrl(endpoint);
  if (!url) throw new Error('WooCommerce configuration missing');
  const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers||{}) } });
  if (!res.ok) {
    const data = await res.json().catch(()=>({message:'Unknown error'}));
    throw new Error(`WooCommerce API Error: ${res.status} - ${data.message}`);
  }
  return res.json();
};

const categoryTreeProductsCache = new Map<string, { ts: number; data: WooCommerceProduct[] }>();
const CATEGORY_TREE_TTL_MS = 10 * 60 * 1000;

const fetchAllCategories = async (): Promise<any[]> => {
  const all: any[] = [];
  for (let page = 1; page <= 10; page++) {
    try {
      const cats = await wooFetch<any[]>(`products/categories?per_page=100&page=${page}`, { method: 'GET' });
      if (!Array.isArray(cats) || cats.length === 0) break;
      all.push(...cats);
      if (cats.length < 100) break;
    } catch {
      break;
    }
  }
  return all;
};

const getChildCategoryIds = (allCats: any[], rootName: string, includeRoot: boolean): number[] => {
  const root = allCats.find(c => (c.name || '').toLowerCase() === rootName.toLowerCase() || (c.slug || '').toLowerCase() === rootName.toLowerCase());
  if (!root) return [];
  const rootId = Number(root.id);
  const byParent = new Map<number, any[]>();
  for (const c of allCats) {
    const p = Number(c.parent) || 0;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(c);
  }
  const result: number[] = includeRoot ? [rootId] : [];
  const queue: number[] = [rootId];
  while (queue.length) {
    const pid = queue.shift()!;
    const children = byParent.get(pid) || [];
    for (const child of children) {
      result.push(Number(child.id));
      queue.push(Number(child.id));
    }
  }
  return Array.from(new Set(result));
};

export const getProductsByCategoryTree: RequestHandler = async (req, res) => {
  try {
    const { root = 'All Trips & Tours', only_booking, include_root } = req.query as any;
    const onlyBooking = String(only_booking) === '1' || String(only_booking).toLowerCase() === 'true';
    const includeRoot = String(include_root) === '1' || String(include_root).toLowerCase() === 'true';

    // Allow comma-separated multiple roots in a single request
    const roots = String(root)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const cacheKey = `${roots.join(',').toLowerCase()}|${onlyBooking ? '1' : '0'}|${includeRoot ? '1' : '0'}`;
    const cached = categoryTreeProductsCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CATEGORY_TREE_TTL_MS) {
      return res
        .set('Cache-Control','public, max-age=300, stale-while-revalidate=900')
        .json({ success: true, data: cached.data, total: cached.data.length, cached: true });
    }

    // Fetch all categories and build the union set of included category IDs (roots and descendants)
    const cats = await fetchAllCategories();
    const includeSet = new Set<number>();
    for (const r of roots.length ? roots : [String(root)]) {
      const ids = getChildCategoryIds(cats, r, includeRoot);
      for (const id of ids) includeSet.add(Number(id));
    }

    if (includeSet.size === 0) {
      return res.json({ success: true, data: [], total: 0, note: 'No categories found for root(s)' });
    }

    // Fetch products in a minimal number of requests then filter locally by category membership
    const products: WooCommerceProduct[] = [];
    const PER_PAGE = 100;
    const MAX_PAGES = 10; // safety cap
    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const typeParam = onlyBooking ? `&type=booking` : '';
        const url = `products?per_page=${PER_PAGE}&page=${page}${typeParam}`;
        const batch = await wooFetch<WooCommerceProduct[]>(url, { method: 'GET' });
        if (!Array.isArray(batch) || batch.length === 0) break;
        products.push(...batch);
        if (batch.length < PER_PAGE) break;
      } catch {
        break;
      }
    }

    const filtered = products.filter((p: any) =>
      Array.isArray(p.categories) && p.categories.some((c: any) => includeSet.has(Number(c?.id)))
    );

    // De-duplicate and cache
    const map = new Map<number, WooCommerceProduct>();
    for (const p of filtered) map.set(p.id, p);
    const list = Array.from(map.values());

    categoryTreeProductsCache.set(cacheKey, { ts: Date.now(), data: list });
    return res
      .set('Cache-Control','public, max-age=300, stale-while-revalidate=900')
      .json({ success: true, data: list, total: list.length });
  } catch (e) {
    return res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Failed to fetch products by category tree' });
  }
};
