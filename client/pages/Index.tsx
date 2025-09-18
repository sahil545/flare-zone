import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardWidgets } from "@/components/DashboardWidgets";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getToken } = await import("@/lib/auth");
        const token = getToken();
        const headers: Record<string, string> = { Accept: "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch("/api/wp/users/me", { headers });
        const json = await res.json();
        const roles: string[] = Array.isArray(json?.data?.roles)
          ? json.data.roles
          : [];
        if (!cancelled && roles.includes("instructor")) navigate("/instructor");
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <DashboardLayout>
      <DashboardWidgets />
    </DashboardLayout>
  );
}
