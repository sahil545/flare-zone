import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { BookingCalendar } from "@/components/BookingCalendar";
import { useEffect, useState } from "react";

export default function Bookings() {
  // Hard shutdown FullStory ASAP to avoid fetch wrappers interfering
  try {
    const FS: any = (window as any).FS;
    if (FS?.shutdown) FS.shutdown();
  } catch {}
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [wpUser, setWpUser] = useState<{ name?: string } | null>(null);

  useEffect(() => {
    try {
      const FS: any = (window as any).FS;
      if (FS?.shutdown) FS.shutdown();
    } catch {}
    return () => {
      try {
        const FS: any = (window as any).FS;
        if (FS?.restart) FS.restart();
      } catch {}
    };
  }, []);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch("/api/wp/users/me", {
          headers: { Accept: "application/json" },
        });
        const json = await res.json();
        if (aborted) return;
        if (res.ok && json?.success) {
          const roles: string[] = json.data?.roles || [];
          setIsAdmin(roles.includes("administrator"));
          setWpUser({ name: json.data?.name });
        } else {
          if (import.meta.env?.DEV) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        }
      } catch {
        if (import.meta.env?.DEV) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } finally {
        if (!aborted) setAuthChecked(true);
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);

  if (authChecked && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto mt-10 p-4 border rounded bg-white">
          <h1 className="text-2xl font-bold text-ocean-900">
            Access restricted
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is for administrators only.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ocean-900">
              Booking Management {wpUser?.name ? `– ${wpUser.name}` : ""}
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage all dive tour bookings, schedules, and customer
              reservations.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              asChild
              className="flex items-center gap-2"
            >
              <Link to="/api-test">
                <Settings className="h-4 w-4" />
                API Test
              </Link>
            </Button>
          </div>
        </div>

        {/* Booking Calendar */}
        <BookingCalendar />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Tours</p>
                  <p className="text-2xl font-bold text-ocean-900">0</p>
                </div>
                <Calendar className="h-8 w-8 text-ocean-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold text-ocean-900">0</p>
                </div>
                <Calendar className="h-8 w-8 text-ocean-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold text-ocean-900">0</p>
                </div>
                <Calendar className="h-8 w-8 text-ocean-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Bookings
                  </p>
                  <p className="text-2xl font-bold text-ocean-900">0</p>
                </div>
                <Calendar className="h-8 w-8 text-ocean-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
