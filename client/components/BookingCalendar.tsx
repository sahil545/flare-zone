import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtLocal } from "@/utils/datetime";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Clock,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { wooCommerceService } from "@/lib/woocommerce-service";
import { BookingCalendarEvent } from "@shared/woocommerce";
import { CreateBookingModal } from "./CreateBookingModal";
import { BookingDetailsModal } from "./BookingDetailsModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DayBookings {
  [key: string]: BookingCalendarEvent[];
}

const WEEKLY_ALLOWED_SLUGS = new Set([
  "snorkeling-trips",
  "dive-trips",
  "spearfishing",
  "sunset-cruise",
  "reef-dives",
  "wreck-dives",
  "shark-dive",
  "night-dive",
  "coral-restoration-dives",
  "private-snorkeling-trips",
  "private-dive-charters",
]);

export function BookingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<DayBookings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [bookingsAvailable, setBookingsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] =
    useState<BookingCalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productNames, setProductNames] = useState<Record<number, string>>({});
  const [viewMode, setViewMode] = useState<
    "booked" | "availability" | "weekly"
  >("booked");
  const [availability, setAvailability] = useState<Record<string, any[]>>({});
  const [weeklyMerged, setWeeklyMerged] = useState<Record<string, any[]>>({});
  const [weeklyStart, setWeeklyStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [weeklyAllowedProductIds, setWeeklyAllowedProductIds] = useState<
    Set<number>
  >(new Set());
  const [showAll, setShowAll] = useState(true);

  type WeeklySlot = {
    productId: number;
    productName: string;
    start: Date;
    end: Date;
    used: number;
    total: number | null;
    dateKey: string;
  };
  const [selectedWeeklySlot, setSelectedWeeklySlot] =
    useState<WeeklySlot | null>(null);
  const [isWeeklySlotOpen, setIsWeeklySlotOpen] = useState(false);
  const [slotBookings, setSlotBookings] = useState<
    BookingCalendarEvent[] | null
  >(null);
  const [isSlotLoading, setIsSlotLoading] = useState(false);

  // Helpers
  const formatDateKey = (date: Date) => date.toISOString().split("T")[0];
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const getWeekDays = (start: Date, count = 7) => {
    const days: Date[] = [];
    for (let i = 0; i < count; i++) days.push(addDays(start, i));
    return days;
  };

  // Prefetch a 4-week window into service caches (booked/availability/weekly)
  const prefetchFourWeeks = async (
    mode: "booked" | "availability" | "weekly",
  ) => {
    try {
      if (mode === "booked") {
        const base = new Date(currentDate);
        base.setHours(0, 0, 0, 0);
        const start = new Date(base);
        start.setDate(start.getDate() - (start.getDay() || 0));
        const end = addDays(start, 27);
        // Always warm admin-style bookings cache
        await wooCommerceService.getCalendarBookings({
          startDate: formatDateKey(start),
          endDate: formatDateKey(end),
        });
        // Optionally warm instructor assignment cache too (non-blocking)
        try {
          const pathLower = (window.location.pathname || "").toLowerCase();
          const isInstructor =
            pathLower.startsWith("/instructor") ||
            pathLower.startsWith("/bookings-instructor-role") ||
            pathLower.startsWith("/bookingsinstructorrole");
          if (isInstructor && !showAll) {
            void wooCommerceService.getInstructorAssignedBookings({
              startDate: formatDateKey(start),
              endDate: formatDateKey(end),
            });
          }
        } catch {}
      } else if (mode === "availability") {
        const base = new Date(currentDate);
        base.setHours(0, 0, 0, 0);
        const start = new Date(base);
        start.setDate(start.getDate() - (start.getDay() || 0));
        const end = addDays(start, 27);
        await wooCommerceService.getAvailabilityBlocks({
          startDate: formatDateKey(start),
          endDate: formatDateKey(end),
        });
      } else if (mode === "weekly") {
        const base = new Date(weeklyStart);
        base.setHours(0, 0, 0, 0);
        const start = new Date(base);
        const end = addDays(start, 27);
        const data = await wooCommerceService.getAvailabilityBlocks({
          startDate: formatDateKey(start),
          endDate: formatDateKey(end),
          productIds: Array.from(weeklyAllowedProductIds),
          preferBookings: true,
        });
        // Merge to local cache to enable instant render when user navigates weeks
        setWeeklyMerged((prev) => ({ ...prev, ...data }));
      }
    } catch {}
  };

  // Load allowed product ids for Weekly view (by category slugs)
  useEffect(() => {
    let mounted = true;
    const roots = Array.from(WEEKLY_ALLOWED_SLUGS);
    (async () => {
      try {
        const products = await wooCommerceService.getProductsByCategoryRoot(
          roots.join(","),
          true,
        );
        const ids = new Set<number>();
        for (const p of products) ids.add(p.id as any);
        if (ids.size === 0) {
          const all = await wooCommerceService.getBookingProducts();
          for (const p of all) {
            const cats = (p as any).categories || [];
            if (cats.some((c: any) => WEEKLY_ALLOWED_SLUGS.has(String(c.slug))))
              ids.add(p.id as any);
          }
        }
        if (mounted) setWeeklyAllowedProductIds(ids);
      } catch {
        if (mounted) setWeeklyAllowedProductIds(new Set());
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load bookings/availability for the visible month
  useEffect(() => {
    const loadMonth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const monthStart = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1,
        );
        const monthEnd = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0,
        );

        if (viewMode === "booked") {
          const pathLower = (window.location.pathname || "").toLowerCase();
          const isInstructor =
            pathLower.startsWith("/instructor") ||
            pathLower.startsWith("/bookings-instructor-role") ||
            pathLower.startsWith("/bookingsinstructorrole");
          const filterActive = isInstructor && !showAll;

          const [allEvents, assigned] = await Promise.all([
            wooCommerceService.getCalendarBookings({
              startDate: monthStart.toISOString().split("T")[0],
              endDate: monthEnd.toISOString().split("T")[0],
            }),
            filterActive
              ? wooCommerceService.getInstructorAssignedBookings({
                  startDate: monthStart.toISOString().split("T")[0],
                  endDate: monthEnd.toISOString().split("T")[0],
                })
              : Promise.resolve([] as any[]),
          ]);

          // Diagnostics
          try {
            console.log("Instructor filtering diagnostics:", {
              allEvents: allEvents.length,
              assigned: assigned.length,
              monthStart: monthStart.toISOString(),
              monthEnd: monthEnd.toISOString(),
            });
          } catch {}

          const events = filterActive
            ? allEvents.filter((e) => {
                const pid = e.wooCommerceData?.productId || 0;
                const estart =
                  e.start instanceof Date ? e.start : new Date(e.start as any);
                const eDay = `${estart.getFullYear()}-${String(estart.getMonth() + 1).padStart(2, "0")}-${String(estart.getDate()).padStart(2, "0")}`;
                // First pass: direct bookingId match
                const bid = e.wooCommerceData?.bookingId || 0;
                let match = false;
                match = assigned.some((a) => {
                  const abid =
                    a.wooCommerceData?.bookingId || (a as any).bookingId || 0;
                  return bid && abid && bid === abid;
                });
                if (match) return true;
                // Next pass: strict product + time proximity (±6h)
                match = assigned.some((a) => {
                  const apid = a.wooCommerceData?.productId || a.productId || 0;
                  const astart =
                    a.start instanceof Date
                      ? a.start
                      : new Date(a.start as any);
                  if (!pid || !apid || pid !== apid) return false;
                  const diff = Math.abs(astart.getTime() - estart.getTime());
                  return diff <= 6 * 60 * 60 * 1000;
                });
                if (match) return true;
                // Fallback: same product + same local calendar day
                match = assigned.some((a) => {
                  const apid = a.wooCommerceData?.productId || a.productId || 0;
                  const astart =
                    a.start instanceof Date
                      ? a.start
                      : new Date(a.start as any);
                  const aDay = `${astart.getFullYear()}-${String(astart.getMonth() + 1).padStart(2, "0")}-${String(astart.getDate()).padStart(2, "0")}`;
                  return pid && apid && pid === apid && aDay === eDay;
                });
                if (match) return true;
                // Final fallback: time-only proximity (±90m)
                match = assigned.some((a) => {
                  const astart =
                    a.start instanceof Date
                      ? a.start
                      : new Date(a.start as any);
                  const diff = Math.abs(astart.getTime() - estart.getTime());
                  return diff <= 90 * 60 * 1000;
                });
                return match;
              })
            : allEvents;

          if (events.length > 0) {
            const groupedBookings =
              wooCommerceService.formatBookingForCalendar(events);
            setBookings(groupedBookings);
            setIsConnected(true);
            setBookingsAvailable(true);
          } else {
            setBookings({});
            setIsConnected(true);
            setBookingsAvailable(false);
            setError("No bookings found for this rangevsss.");
          }
        } else if (viewMode === "availability") {
          const avail = await wooCommerceService.getAvailabilityBlocks({
            startDate: monthStart.toISOString().split("T")[0],
            endDate: monthEnd.toISOString().split("T")[0],
          });
          setAvailability(avail);
          setIsConnected(true);
          setBookingsAvailable(true);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load bookings",
        );
        setIsConnected(false);
        setBookings({});
      } finally {
        setIsLoading(false);
      }
    };

    if (viewMode === "booked" || viewMode === "availability") loadMonth();
  }, [currentDate, viewMode, showAll]);

  // Background prefetch of a 4-week window when month/availability views are active
  useEffect(() => {
    if (viewMode === "booked") prefetchFourWeeks("booked");
    if (viewMode === "availability") prefetchFourWeeks("availability");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, currentDate]);

  // Load availability for Weekly view with local merge cache and background prefetch
  useEffect(() => {
    let mounted = true;
    const loadWeekly = async () => {
      try {
        setError(null);
        const start = new Date(weeklyStart);
        start.setHours(0, 0, 0, 0);
        const end = addDays(start, 6);

        const keys = getWeekDays(start, 7).map(formatDateKey);
        const mergedSnapshot = weeklyMerged; // snapshot to avoid dependency re-runs
        const hasAll = keys.every((k) => mergedSnapshot[k]);
        if (hasAll) {
          const subset: Record<string, any[]> = {};
          for (const k of keys) subset[k] = mergedSnapshot[k];
          if (!mounted) return;
          setAvailability(subset);
          setIsConnected(true);
          setBookingsAvailable(
            keys.some((k) => (mergedSnapshot[k] || []).length > 0),
          );
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }

        const avail = await wooCommerceService.getAvailabilityBlocks({
          startDate: formatDateKey(start),
          endDate: formatDateKey(end),
          productIds: Array.from(weeklyAllowedProductIds),
          preferBookings: true,
        });
        const filtered: Record<string, any[]> = {};
        const hasFilter = weeklyAllowedProductIds.size > 0;
        for (const [k, list] of Object.entries(avail)) {
          const arr = hasFilter
            ? (list as any[]).filter((s) =>
                weeklyAllowedProductIds.has((s as any).productId),
              )
            : (list as any[]);
          if (arr.length) filtered[k] = arr;
        }
        const mergedAfter = { ...mergedSnapshot, ...filtered };
        if (!mounted) return;
        setWeeklyMerged(mergedAfter);
        const subset: Record<string, any[]> = {};
        for (const k of keys) subset[k] = mergedAfter[k] || [];
        setAvailability(subset);
        setIsConnected(true);
        setBookingsAvailable(
          Object.values(subset).some((v) => (v || []).length > 0),
        );
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load weekly data",
        );
        setIsConnected(false);
      } finally {
        if (mounted) setIsLoading(false);
      }

      // Background prefetch prev/next weeks
      const prevStart = addDays(weeklyStart, -7);
      const nextStart = addDays(weeklyStart, 7);
      for (const s of [prevStart, nextStart]) {
        (async () => {
          try {
            const s0 = new Date(s);
            s0.setHours(0, 0, 0, 0);
            const e0 = addDays(s0, 6);
            const data = await wooCommerceService.getAvailabilityBlocks({
              startDate: formatDateKey(s0),
              endDate: formatDateKey(e0),
              productIds: Array.from(weeklyAllowedProductIds),
            });
            if (!mounted) return;
            setWeeklyMerged((prev) => ({ ...prev, ...data }));
          } catch {}
        })();
      }
    };
    if (viewMode === "weekly") loadWeekly();
    return () => {
      mounted = false;
    };
  }, [viewMode, weeklyStart, weeklyAllowedProductIds]);

  // Background prefetch of 4 weeks for weekly view
  useEffect(() => {
    if (viewMode === "weekly") prefetchFourWeeks("weekly");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, weeklyStart, weeklyAllowedProductIds]);

  // Prefetch product names for events that still show Booking #
  useEffect(() => {
    const ids = new Set<number>();
    Object.values(bookings)
      .flat()
      .forEach((b) => {
        if (b.title?.startsWith("Booking #") && b.wooCommerceData?.productId) {
          const pid = b.wooCommerceData.productId;
          if (pid && !productNames[pid]) ids.add(pid);
        }
      });
    if (ids.size === 0) return;

    (async () => {
      const entries = await Promise.all(
        Array.from(ids).map(async (id) => {
          try {
            const p = await wooCommerceService.getProductById(id);
            return [id, p?.name || ""] as const;
          } catch {
            return [id, ""] as const;
          }
        }),
      );
      const map: Record<number, string> = { ...productNames };
      for (const [id, name] of entries) {
        if (name) map[id] = name;
      }
      setProductNames(map);
    })();
  }, [bookings]);

  // Mock data fallback
  const getMockBookings = (): DayBookings => {
    const today = new Date();
    const mockEvent: BookingCalendarEvent = {
      id: "mock-1",
      title: "Sample Coral Reef Tour",
      start: new Date(today.getFullYear(), today.getMonth(), 15, 9, 0),
      end: new Date(today.getFullYear(), today.getMonth(), 15, 12, 0),
      participants: 8,
      maxParticipants: 12,
      status: "confirmed",
      guide: "Demo Guide",
      location: "Demo Location",
      customer: {
        name: "Demo Customer",
        email: "demo@example.com",
      },
      wooCommerceData: {
        bookingId: 0,
        orderId: 0,
        productId: 0,
      },
    } as any;

    return {
      [formatDateKey(mockEvent.start)]: [mockEvent],
    };
  };

  const refreshBookings = async () => {
    const monthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const monthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );

    try {
      setIsLoading(true);
      if (viewMode === "booked") {
        const pathLower = (window.location.pathname || "").toLowerCase();
        const isInstructor =
          pathLower.startsWith("/instructor") ||
          pathLower.startsWith("/bookings-instructor-role") ||
          pathLower.startsWith("/bookingsinstructorrole");
        const filterActive = isInstructor && !showAll;

        const [allEvents, assigned] = await Promise.all([
          wooCommerceService.getCalendarBookings({
            startDate: monthStart.toISOString().split("T")[0],
            endDate: monthEnd.toISOString().split("T")[0],
          }),
          filterActive
            ? wooCommerceService.getInstructorAssignedBookings({
                startDate: monthStart.toISOString().split("T")[0],
                endDate: monthEnd.toISOString().split("T")[0],
              })
            : Promise.resolve([] as any[]),
        ]);
        // Diagnostics
        try {
          console.log("Instructor refresh filter diagnostics:", {
            allEvents: allEvents.length,
            assigned: assigned.length,
            monthStart: monthStart.toISOString(),
            monthEnd: monthEnd.toISOString(),
          });
        } catch {}

        const bookingEvents = filterActive
          ? allEvents.filter((e) => {
              const pid = e.wooCommerceData?.productId || 0;
              const estart =
                e.start instanceof Date ? e.start : new Date(e.start as any);
              const eDay = `${estart.getFullYear()}-${String(estart.getMonth() + 1).padStart(2, "0")}-${String(estart.getDate()).padStart(2, "0")}`;
              // First pass: strict product + time proximity (±6h)
              let match = false;
              match = assigned.some((a) => {
                const apid = a.wooCommerceData?.productId || a.productId || 0;
                const astart =
                  a.start instanceof Date ? a.start : new Date(a.start as any);
                if (!pid || !apid || pid !== apid) return false;
                const diff = Math.abs(astart.getTime() - estart.getTime());
                return diff <= 6 * 60 * 60 * 1000;
              });
              if (match) return true;
              // Fallback: same product + same local calendar day
              match = assigned.some((a) => {
                const apid = a.wooCommerceData?.productId || a.productId || 0;
                const astart =
                  a.start instanceof Date ? a.start : new Date(a.start as any);
                const aDay = `${astart.getFullYear()}-${String(astart.getMonth() + 1).padStart(2, "0")}-${String(astart.getDate()).padStart(2, "0")}`;
                return pid && apid && pid === apid && aDay === eDay;
              });
              if (match) return true;
              // Final fallback: time-only proximity (±90m)
              match = assigned.some((a) => {
                const astart =
                  a.start instanceof Date ? a.start : new Date(a.start as any);
                const diff = Math.abs(astart.getTime() - estart.getTime());
                return diff <= 90 * 60 * 1000;
              });
              return match;
            })
          : allEvents;
        const groupedBookings =
          wooCommerceService.formatBookingForCalendar(bookingEvents);
        setBookings(groupedBookings);
      } else if (viewMode === "availability") {
        const avail = await wooCommerceService.getAvailabilityBlocks({
          startDate: monthStart.toISOString().split("T")[0],
          endDate: monthEnd.toISOString().split("T")[0],
        });
        setAvailability(avail);
      } else {
        const start = new Date(weeklyStart);
        start.setHours(0, 0, 0, 0);
        const end = addDays(start, 6);
        const avail = await wooCommerceService.getAvailabilityBlocks({
          startDate: formatDateKey(start),
          endDate: formatDateKey(end),
          productIds: Array.from(weeklyAllowedProductIds),
          preferBookings: true,
        });
        setAvailability(avail);
      }
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh bookings",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openBookingDetails = (booking: BookingCalendarEvent) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  const openWeeklySlot = async (slot: any, dateKey: string) => {
    const s: WeeklySlot = { ...slot, dateKey };
    setSelectedWeeklySlot(s);
    setIsWeeklySlotOpen(true);
    setIsSlotLoading(true);
    try {
      const events = await wooCommerceService.getCalendarBookings({
        startDate: dateKey,
        endDate: dateKey,
      });
      const filtered = events.filter((b) => {
        const pid = b.wooCommerceData?.productId || 0;
        if (pid !== s.productId) return false;
        const bt = (
          b.start instanceof Date ? b.start : new Date(b.start as any)
        ).getTime();
        const st = s.start.getTime();
        const et = (
          s.end instanceof Date ? s.end : new Date(s.end as any)
        ).getTime();
        return bt >= st - 5 * 60 * 1000 && bt <= et + 5 * 60 * 1000;
      });
      setSlotBookings(filtered);
    } catch (e) {
      setSlotBookings([]);
    } finally {
      setIsSlotLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: Date[] = [];
    const currentDay = new Date(startDate);

    while (days.length < 42) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return days;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      return newDate;
    });
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setWeeklyStart((prev) => addDays(prev, direction === "next" ? 7 : -7));
  };

  const monthGridDays = getDaysInMonth(currentDate);
  const today = new Date();
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const weeklyDays = getWeekDays(weeklyStart, 7);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-ocean-500" />
            Booking Calendar
            {isConnected ? (
              bookingsAvailable ? (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  <Wifi className="h-3 w-3 mr-1" />
                  Live Bookings
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800"
                >
                  <Wifi className="h-3 w-3 mr-1" />
                  Store Connected
                </Badge>
              )
            ) : (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800"
              >
                <WifiOff className="h-3 w-3 mr-1" />
                Demo Mode
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center mr-2 rounded border">
              <button
                className={cn(
                  "px-2 py-1 text-sm",
                  viewMode === "booked"
                    ? "bg-ocean-500 text-white"
                    : "bg-white",
                )}
                onClick={() => setViewMode("booked")}
              >
                Booked
              </button>
              <button
                className={cn(
                  "px-2 py-1 text-sm",
                  viewMode === "availability"
                    ? "bg-ocean-500 text-white"
                    : "bg-white",
                )}
                onClick={() => setViewMode("availability")}
              >
                Availability
              </button>
              <button
                className={cn(
                  "px-2 py-1 text-sm",
                  viewMode === "weekly"
                    ? "bg-ocean-500 text-white"
                    : "bg-white",
                )}
                onClick={() => setViewMode("weekly")}
              >
                Weekly
              </button>
            </div>
            {(() => {
              const pathLower = (window.location.pathname || "").toLowerCase();
              const isInstructor =
                pathLower.startsWith("/instructor") ||
                pathLower.startsWith("/bookings-instructor-role") ||
                pathLower.startsWith("/bookingsinstructorrole");
              return isInstructor ? (
                <div className="flex items-center mr-2 rounded border">
                  <button
                    className={cn(
                      "px-2 py-1 text-sm",
                      !showAll ? "bg-ocean-500 text-white" : "bg-white",
                    )}
                    onClick={() => setShowAll(false)}
                    title="Show only my bookings"
                  >
                    Mine
                  </button>
                  <button
                    className={cn(
                      "px-2 py-1 text-sm",
                      showAll ? "bg-ocean-500 text-white" : "bg-white",
                    )}
                    onClick={() => setShowAll(true)}
                    title="Show all bookings"
                  >
                    All
                  </button>
                </div>
              ) : null;
            })()}

            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshBookings}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
            {viewMode !== "weekly" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                  disabled={isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[140px] text-center">
                  {monthYear}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                  disabled={isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="mb-4 flex items-center justify-center p-4 bg-ocean-50 rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm text-ocean-700">Loading bookings...</span>
          </div>
        )}

        {viewMode === "weekly" ? (
          <div className="relative">
            <button
              aria-label="Previous"
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border rounded-full p-2 shadow"
              onClick={() => navigateWeek("prev")}
              disabled={isLoading}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Next"
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border rounded-full p-2 shadow"
              onClick={() => navigateWeek("next")}
              disabled={isLoading}
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {weeklyDays.map((day) => {
                const dateKey = formatDateKey(day);
                const slots = availability[dateKey] || [];
                const dow = day.toLocaleDateString("en-US", {
                  weekday: "short",
                });
                const dateLabel = day.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                return (
                  <div key={dateKey} className="bg-white min-h-[200px]">
                    <div className="p-2 border-b bg-ocean-50 text-center text-sm font-medium text-ocean-700">
                      {dow} • {dateLabel}
                    </div>
                    <div className="p-2 space-y-2">
                      {slots
                        .filter(
                          (s) =>
                            weeklyAllowedProductIds.size === 0 ||
                            weeklyAllowedProductIds.has(s.productId),
                        )
                        .map((slot, idx) => (
                          <div
                            key={idx}
                            className="text-xs p-2 rounded-md bg-white border text-ocean-900 shadow-sm cursor-pointer hover:bg-ocean-50"
                            onClick={() => openWeeklySlot(slot, dateKey)}
                            title="View bookings"
                          >
                            <div className="truncate font-semibold">
                              {slot.productName}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {fmtLocal(slot.start, "UTC", { year: undefined, month: undefined, day: undefined })}
                              </div>
                              <div className="font-semibold">
                                {typeof slot.total === "number"
                                  ? `${slot.used}/${slot.total}`
                                  : `${slot.used}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      {slots.length === 0 && (
                        <div className="text-xs text-gray-500">No slots</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {viewMode === "availability" &&
              !isLoading &&
              Object.keys(availability).length === 0 && (
                <div className="mb-3 p-2 text-sm bg-amber-50 text-amber-800 rounded">
                  No availability data found for this range.
                </div>
              )}
            {viewMode === "booked" &&
              !isLoading &&
              Object.keys(bookings).length === 0 && (
                <div className="mb-3 p-2 text-sm bg-amber-50 text-amber-800 rounded">
                  {error || "No bookings found for this range fff."}
                </div>
              )}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="bg-ocean-50 p-2 text-center text-sm font-medium text-ocean-700"
                >
                  {day}
                </div>
              ))}
              {monthGridDays.map((day, index) => {
                const dateKey = formatDateKey(day);
                const dayBookings = bookings[dateKey] || [];
                const dayAvailability = availability[dateKey] || [];
                const isCurrentMonth =
                  day.getMonth() === currentDate.getMonth();
                const isToday = day.toDateString() === today.toDateString();

                return (
                  <div
                    key={index}
                    className={cn(
                      "bg-white min-h-[120px] p-2 border-r border-b border-gray-100",
                      !isCurrentMonth && "bg-gray-50 text-gray-400",
                      dayBookings.length > 0 && isCurrentMonth && "bg-blue-50",
                    )}
                  >
                    <div
                      className={cn(
                        "text-sm font-medium mb-1",
                        isToday &&
                          "bg-ocean-500 text-white rounded-full w-6 h-6 flex items-center justify-center",
                      )}
                    >
                      {day.getDate()}
                    </div>

                    <div className="space-y-1">
                      {viewMode === "booked" &&
                        dayBookings.slice(0, 3).map((booking) => (
                          <div
                            key={booking.id}
                            className={cn(
                              "text-xs p-2 rounded-md text-white font-medium shadow-sm cursor-pointer hover:shadow-md transition-shadow",
                              wooCommerceService.getBookingStatusColor(
                                booking.status,
                              ),
                            )}
                            title={`${booking.title} - ${booking.customer.name} (${booking.participants} guests)`}
                            onClick={() => openBookingDetails(booking)}
                          >
                            <div className="truncate font-semibold">
                              {productNames[
                                booking.wooCommerceData.productId
                              ] || booking.title}
                            </div>
                            <div className="flex items-center justify-between text-xs opacity-90 mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {fmtLocal(booking.start, booking.localTimezone || "UTC", { year: undefined, month: undefined, day: undefined })}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {booking.participants}
                              </div>
                            </div>
                          </div>
                        ))}
                      {viewMode === "booked" && dayBookings.length > 3 && (
                        <div className="text-xs text-gray-600 p-1 bg-gray-100 rounded text-center font-medium">
                          +{dayBookings.length - 3} more
                        </div>
                      )}

                      {viewMode === "availability" &&
                        dayAvailability.slice(0, 5).map((slot, idx) => (
                          <div
                            key={idx}
                            className="text-xs p-2 rounded-md bg-white border text-ocean-900 shadow-sm"
                          >
                            <div className="truncate font-semibold">
                              {slot.productName}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {fmtLocal(slot.start, "UTC", { year: undefined, month: undefined, day: undefined })}
                              </div>
                              <div className="font-semibold">
                                {typeof slot.total === "number"
                                  ? `${slot.used}/${slot.total}`
                                  : `${slot.used}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      {viewMode === "availability" &&
                        dayAvailability.length > 5 && (
                          <div className="text-xs text-gray-600 p-1 bg-gray-100 rounded text-center font-medium">
                            +{dayAvailability.length - 5} more
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Cancelled</span>
          </div>
        </div>

        {/* Weekly slot popup */}
        <Dialog open={isWeeklySlotOpen} onOpenChange={setIsWeeklySlotOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedWeeklySlot?.productName || "Trip"}
              </DialogTitle>
              <DialogDescription>
                {selectedWeeklySlot && (
                  <span className="inline-flex items-center gap-2 text-ocean-700">
                    <span>
                      {new Date(selectedWeeklySlot.start).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </span>
                    <span>•</span>
                    <span>
                      {new Intl.DateTimeFormat("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: selectedWeeklySlot?.start?.getTimezoneOffset ? "UTC" : "UTC",
                      }).format(selectedWeeklySlot.start)}
                    </span>
                    <span className="ml-2 text-sm">
                      {typeof selectedWeeklySlot.total === "number"
                        ? `${selectedWeeklySlot.used}/${selectedWeeklySlot.total} booked`
                        : `${selectedWeeklySlot.used} booked`}
                    </span>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2">
              {isSlotLoading ? (
                <div className="text-sm text-gray-600">Loading bookings…</div>
              ) : slotBookings && slotBookings.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto py-1">
                  {slotBookings.map((b) => (
                    <div
                      key={b.id}
                      className="min-w-[220px] p-3 rounded-md border bg-white shadow-sm cursor-pointer hover:shadow"
                      onClick={() => {
                        setIsWeeklySlotOpen(false);
                        openBookingDetails(b);
                      }}
                      title="Open booking details"
                    >
                      <div className="font-semibold truncate">
                        {productNames[b.wooCommerceData.productId] || b.title}
                      </div>
                      <div className="mt-1 text-xs text-gray-600 truncate">
                        {b.customer?.name || "Customer"}
                      </div>
                      <div className="mt-1 text-xs flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {new Intl.DateTimeFormat("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                          timeZone: b.localTimezone || "America/New_York",
                        }).format(b.start)}
                        <span className="ml-2">{b.participants} guests</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  No individual bookings found for this slot.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <BookingDetailsModal
          booking={selectedBooking}
          isOpen={isModalOpen}
          onClose={handleModalClose}
        />
      </CardContent>
    </Card>
  );
}
