import { DashboardLayout } from "@/components/DashboardLayout";
import { BookingCalendar } from "@/components/BookingCalendar";
import { WooCommerceDebug } from "@/components/WooCommerceDebug";
import { WooCommerceApiTest } from "@/components/WooCommerceApiTest";
import { NetworkDiagnostic } from "@/components/NetworkDiagnostic";
import { PostTestComponent } from "@/components/PostTestComponent";
import { ProductionDebugger } from "@/components/ProductionDebugger";
import { FlyDevDiagnostic } from "@/components/FlyDevDiagnostic";
import { BookingEndpointFinder } from "@/components/BookingEndpointFinder";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { List, ExternalLink, Settings } from "lucide-react";
import { Link } from "react-router-dom";

export default function ApiTest() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ocean-900">API Test & Diagnostics</h1>
            <p className="text-muted-foreground mt-2">
              Development tools for testing WooCommerce API connections, debugging endpoints, and diagnostic utilities.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="flex items-center gap-2">
              <Link to="/bookings">
                <Settings className="h-4 w-4" />
                Back to Bookings
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex items-center gap-2">
              <Link to="/bookings/list">
                <List className="h-4 w-4" />
                Booking List (Testing)
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>

        <ErrorBoundary>
          <BookingCalendar />
        </ErrorBoundary>

        {/* Diagnostic Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ErrorBoundary>
            <BookingEndpointFinder />
          </ErrorBoundary>
          <ErrorBoundary>
            <FlyDevDiagnostic />
          </ErrorBoundary>
          <ErrorBoundary>
            <ProductionDebugger />
          </ErrorBoundary>
          <ErrorBoundary>
            <NetworkDiagnostic />
          </ErrorBoundary>
          <ErrorBoundary>
            <WooCommerceApiTest />
          </ErrorBoundary>
          <ErrorBoundary>
            <PostTestComponent />
          </ErrorBoundary>
        </div>

        <ErrorBoundary>
          <WooCommerceDebug />
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  );
}
