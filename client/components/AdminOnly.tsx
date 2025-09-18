import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminOnly({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers: Record<string, string> = { Accept: "application/json" };
        try {
          const { getToken } = await import("@/lib/auth");
          const token = getToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch {}
        const res = await fetch("/api/wp/users/me", { headers });
        const json = await res.json().catch(() => ({}));
        const roles: string[] = Array.isArray(json?.data?.roles)
          ? json.data.roles
          : [];
        if (!cancelled) setAllowed(roles.includes("administrator"));
      } catch {
        if (!cancelled) setAllowed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (allowed === false) navigate("/instructor");
  }, [allowed, navigate]);

  if (allowed === null) return null;
  if (!allowed) return null;
  return <>{children}</>;
}
