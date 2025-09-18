import { DashboardLayout } from "@/components/DashboardLayout";
import { CustomerManagement } from "@/components/CustomerManagement";

export default function Customers() {
  return (
    <DashboardLayout>
      <CustomerManagement />
    </DashboardLayout>
  );
}
