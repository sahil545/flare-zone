import { PlaceholderPage } from "@/components/PlaceholderPage";
import { DollarSign } from "lucide-react";

export default function Revenue() {
  return (
    <PlaceholderPage
      title="Revenue Management"
      description="Track financial performance, revenue streams, and profitability across all dive shop operations."
      icon={DollarSign}
      suggestedFeatures={[
        "Daily/monthly revenue reports",
        "Tour profitability analysis",
        "Equipment rental income",
        "Seasonal trend analysis",
        "Payment method breakdown",
        "Refund and cancellation tracking",
        "Commission calculations",
        "Tax reporting integration"
      ]}
    />
  );
}
