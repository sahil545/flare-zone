import { useEffect } from "react";
import BookingProductsList from "@/components/BookingProductsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";

export default function Tours() {
  // Disable FullStory here too to avoid fetch wrapping issues
  try {
    const FS: any = (window as any).FS;
    if (FS?.shutdown) FS.shutdown();
  } catch {}
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Bookable Tours</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingProductsList />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
