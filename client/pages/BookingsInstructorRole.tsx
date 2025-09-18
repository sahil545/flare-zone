import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BookingCalendar } from "@/components/BookingCalendar";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon } from "lucide-react";

export default function BookingsInstructorRole() {
  try {
    const FS: any = (window as any).FS;
    if (FS?.shutdown) FS.shutdown();
  } catch {}

  const location = useLocation();
  const navigate = useNavigate();

  // Ensure FullStory is disabled on this page to avoid wrapping fetch
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

  // For testing on this page, impersonate the instructor "inst-testing"
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("user") !== "inst-testing") {
      params.set("user", "inst-testing");
      navigate(
        { pathname: location.pathname, search: `?${params.toString()}` },
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ocean-900">
              Instructor Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              View schedules and bookings relevant to your instructor role.
            </p>
          </div>
        </div>

        <BookingCalendar />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold text-ocean-900">0</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-ocean-500" />
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
                <CalendarIcon className="h-8 w-8 text-ocean-500" />
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
                <CalendarIcon className="h-8 w-8 text-ocean-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
