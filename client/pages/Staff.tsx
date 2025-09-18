import { PlaceholderPage } from "@/components/PlaceholderPage";
import { Users } from "lucide-react";

export default function Staff() {
  return (
    <PlaceholderPage
      title="Staff Schedule Management"
      description="Manage dive instructor schedules, certifications, and availability for tours and courses."
      icon={Users}
      suggestedFeatures={[
        "Staff availability calendar",
        "Certification tracking",
        "Shift scheduling",
        "Tour guide assignments",
        "Emergency contact information",
        "Performance metrics",
        "Training schedule management",
        "Payroll integration"
      ]}
    />
  );
}
