import { DashboardLayout } from "@/components/DashboardLayout";
import { BookingList } from "@/components/BookingList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function BookingListPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/bookings" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Bookings
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-ocean-900">Booking List</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive view of the last 10 bookings with detailed metadata for testing and debugging.
            </p>
          </div>
        </div>
        
        <BookingList />
      </div>
    </DashboardLayout>
  );
}
