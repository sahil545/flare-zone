import { useEffect, useMemo, useState } from "react";
import { wooCommerceService } from "@/lib/woocommerce-service";
import { WooCommerceProduct } from "@shared/woocommerce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Search } from "lucide-react";

export default function BookingProductsList() {
  const [products, setProducts] = useState<WooCommerceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Array<{id:number; name:string; slug?:string}>>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [bookingOnly, setBookingOnly] = useState<boolean>(true);

  // Preferred category order based on reference (others will follow alphabetically)
  const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const allowedSlugs = useMemo(() => new Set([
    'snorkeling-trips',
    'dive-trips',
    'spearfishing',
    'sunset-cruise',
    'reef-dives',
    'wreck-dives',
    'shark-dive',
    'night-dive',
    'coral-restoration-dives',
    'private-snorkeling-trips',
    'private-dive-charters'
  ]), []);
  const preferredOrder = useMemo(() => [
    'Snorkeling Trips',
    'Dive Trips',
    'Spearfishing',
    'Sunset Cruise',
    'Reef Dives',
    'Wreck Dives',
    'Shark Dive',
    'Night Dive',
    'Coral Restoration Dives',
    'Private Snorkeling Trips',
    'Private Dive Charters',
  ], []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const roots = [
          'snorkeling-trips',
          'dive-trips',
          'spearfishing',
          'sunset-cruise',
          'reef-dives',
          'wreck-dives',
          'shark-dive',
          'night-dive',
          'coral-restoration-dives',
          'private-snorkeling-trips',
          'private-dive-charters'
        ];
        let data = await wooCommerceService.getProductsByCategoryRoot(roots.join(','), true);
        if (!Array.isArray(data) || data.length === 0) {
          data = await wooCommerceService.getBookingProducts();
        }
        if (mounted) {
          setProducts(Array.isArray(data) ? data : []);
          const catMap = new Map<number, {id:number; name:string; slug?:string}>();
          (data || []).forEach((p:any) => {
            (p.categories || []).forEach((c:any) => { if (c && typeof c.id==='number') catMap.set(c.id, { id:c.id, name:c.name, slug:c.slug }); });
          });
          const cats = Array.from(catMap.values()).filter(c => allowedSlugs.has((c.slug || slugify(c.name))));
          setCategories(cats);
        }
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Failed to load products");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const orderedCategories = useMemo(() => {
    const slugOrder = Array.from(allowedSlugs);
    const orderIndex = new Map(slugOrder.map((s, i) => [s, i] as const));
    return [...categories].sort((a, b) => {
      const sa = slugify(a.slug || a.name);
      const sb = slugify(b.slug || b.name);
      const ia = orderIndex.has(sa) ? (orderIndex.get(sa) as number) : 999;
      const ib = orderIndex.has(sb) ? (orderIndex.get(sb) as number) : 999;
      if (ia !== ib) return ia - ib;
      return a.name.localeCompare(b.name);
    });
  }, [categories, allowedSlugs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p:any) => {
      if (bookingOnly && p.type !== 'booking') return false;
      if (selectedCategory && !(p.categories || []).some((c:any)=> c.id === selectedCategory)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.short_description || "").toLowerCase().includes(q)
      );
    });
  }, [products, query, selectedCategory, bookingOnly]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Search className="h-4 w-4 text-ocean-500" />
        <Input placeholder="Search tours..." value={query} onChange={e => setQuery(e.target.value)} className="max-w-sm" />
        <Button variant={bookingOnly ? 'default' : 'outline'} size="sm" onClick={()=>setBookingOnly(v=>!v)}>
          {bookingOnly ? 'Booking Only' : 'All Types'}
        </Button>
        <div className="flex items-center gap-2 overflow-auto py-1">
          <Button
            variant={selectedCategory===null ? 'default' : 'outline'}
            size="sm"
            className="rounded-full"
            onClick={()=>setSelectedCategory(null)}
          >
            All
          </Button>
          {orderedCategories.map(c => (
            <Button
              key={c.id}
              variant={selectedCategory===c.id ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={()=>setSelectedCategory(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
        <Badge variant="secondary" className="ml-auto">{filtered.length} items</Badge>
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-3 bg-ocean-50 rounded">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading tours...</span>
        </div>
      )}
      {error && (
        <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="divide-y rounded border bg-white">
        {filtered.map(p => (
          <div key={p.id} className="flex items-center gap-4 p-3">
            <div className="h-16 w-24 bg-gray-100 flex items-center justify-center overflow-hidden rounded">
              {p.images && p.images[0]?.src ? (
                <img src={p.images[0].src} alt={p.images[0].alt || p.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="text-gray-400 flex items-center gap-2"><ImageIcon className="h-5 w-5" /> No image</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs text-gray-600 truncate" dangerouslySetInnerHTML={{ __html: p.short_description || '' }} />
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{p.type}</Badge>
                <Badge variant="secondary">#{p.id}</Badge>
              </div>
            </div>
            <div className="text-right whitespace-nowrap font-semibold">{p.price ? `$${p.price}` : "—"}</div>
          </div>
        ))}
      </div>

      {!loading && !error && filtered.length === 0 && (
        <div className="p-3 rounded bg-gray-50 text-gray-700 text-sm">No tours match your search.</div>
      )}
    </div>
  );
}
