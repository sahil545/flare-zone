import { PlaceholderPage } from "@/components/PlaceholderPage";
import { TrendingUp } from "lucide-react";

export default function Analytics() {
  return (
    <PlaceholderPage
      title="Analytics & Reports"
      description="Comprehensive analytics and reporting for business insights and performance tracking."
      icon={TrendingUp}
      suggestedFeatures={[
        "Customer behavior analysis",
        "Booking conversion rates",
        "Popular tour insights",
        "Staff performance metrics",
        "Seasonal demand patterns",
        "Customer satisfaction scores",
        "Marketing campaign effectiveness",
        "Competitor analysis tools"
      ]}
    />
  );
}
