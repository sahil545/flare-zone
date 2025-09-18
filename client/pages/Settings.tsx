import { PlaceholderPage } from "@/components/PlaceholderPage";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="System Settings"
      description="Configure dive shop settings, integrations, and system preferences."
      icon={Settings}
      suggestedFeatures={[
        "WooCommerce integration settings",
        "Email notification templates",
        "Booking rules and policies",
        "Payment gateway configuration",
        "User permissions management",
        "Backup and data export",
        "API key management",
        "System maintenance tools"
      ]}
    />
  );
}
