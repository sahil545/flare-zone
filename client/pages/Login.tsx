import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const next =
    new URLSearchParams(location.search).get("next") || "/instructor";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Try direct call to WP (browser → WP) to avoid server-to-server 502/WAF
      const direct = await fetch(
        "https://keylargoscubadiving.com/wp-json/jwt-auth/v1/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ username: username.trim(), password }),
          credentials: "include",
        },
      );
      let djson: any = null;
      try {
        djson = await direct.json();
      } catch {
        djson = null;
      }

      if (direct.ok && djson?.token) {
        const token: string = djson.token;
        const { setToken } = await import("@/lib/auth");
        setToken(token);
        try {
          const meRes = await fetch(
            "https://keylargoscubadiving.com/wp-json/wp/v2/users/me?context=edit",
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            },
          );
          if (meRes.ok) {
            const me = await meRes.json();
            const slug = (
              me?.slug ||
              me?.username ||
              me?.user_nicename ||
              ""
            ).toLowerCase();
            navigate(next || (slug ? `/instructor/${slug}` : "/instructor"));
            return;
          }
        } catch {}
        navigate(next || "/instructor");
        return;
      }

      // Fallback to server proxy
      const res = await fetch("/api/wp/jwt/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      if (!res.ok || !json?.success || !json?.data?.token) {
        const details =
          djson?.message ||
          json?.data?.message ||
          json?.message ||
          json?.error ||
          `HTTP ${res.status}`;
        throw new Error(details || "Invalid credentials");
      }
      const token: string = json.data.token;
      const { setToken } = await import("@/lib/auth");
      setToken(token);
      try {
        const meRes = await fetch("/api/wp/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        const me = await meRes.json().catch(() => null);
        const slug = me?.data?.username || me?.data?.slug || "";
        navigate(
          next ||
            (slug
              ? `/instructor/${String(slug).toLowerCase()}`
              : "/instructor"),
        );
      } catch {
        navigate(next || "/instructor");
      }
    } catch (e: any) {
      setError(e?.message || "Login failed");
      try {
        console.error("JWT login failed", e);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-50 to-marine-50 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white shadow-md rounded-lg p-6 space-y-4"
      >
        <div className="flex justify-center mb-2">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F2a778920e8d54a37b1576086f79dd676%2Fb9c71c9390bb4ca692d70f8090875b5b?format=webp&width=800"
            alt="KLSD Logo"
            className="h-10 w-auto"
          />
        </div>
        <h1 className="text-xl font-semibold text-ocean-900 text-center">
          Staff Login
        </h1>
        <div className="space-y-2">
          <label className="block text-sm text-ocean-700">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-ocean-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marine-500"
            autoComplete="username"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-ocean-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-ocean-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marine-500"
            autoComplete="current-password"
            required
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        <p className="text-red-600 text-xs text-center mt-2">
          Powered By World Scuba Network
        </p>
      </form>
    </div>
  );
}
