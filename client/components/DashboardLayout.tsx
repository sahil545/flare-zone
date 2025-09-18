import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  MapPin,
  Waves,
  DollarSign,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  Bell,
  Code,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  try {
    const FS: any = (window as any).FS;
    if (FS?.shutdown) FS.shutdown();
  } catch {}
  const location = useLocation();

  // Navigation will be built based on role below

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem("sidebar-collapsed");
      return stored === "true";
    } catch {
      return false;
    }
  });
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", String(sidebarCollapsed));
    } catch {}
  }, [sidebarCollapsed]);
  const isSidebarExpanded = !sidebarCollapsed || isSidebarHovered;

  // Ensure FullStory is shut down on dashboard pages to avoid wrapping fetch
  useEffect(() => {
    try {
      const FS: any = (window as any).FS;
      if (FS?.shutdown) FS.shutdown();
    } catch {}
    return () => {
      try {
        const FS: any = (window as any).FS;
        if (FS?.restart) FS.restart();
      } catch {}
    };
  }, []);

  const [wpName, setWpName] = useState<string | null>(null);
  const [wpNickname, setWpNickname] = useState<string | null>(null);
  const [wpRoles, setWpRoles] = useState<string[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const userParam = params.get("user") || params.get("username");
        const headers: Record<string, string> = { Accept: "application/json" };
        let ok = false;
        let token: string | null = null;
        let lastStatus: number | null = null;

        const safeGetJson = async (
          url: string,
          hdrs: Record<string, string>,
        ): Promise<{ ok: boolean; status: number; json: any }> => {
          try {
            // Prefer XHR to avoid fetch being wrapped by analytics
            const xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            Object.entries(hdrs || {}).forEach(([k, v]) =>
              xhr.setRequestHeader(k, v),
            );
            return await new Promise((resolve) => {
              xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                  const status = xhr.status;
                  let parsed: any = {};
                  try {
                    parsed = xhr.responseText
                      ? JSON.parse(xhr.responseText)
                      : {};
                  } catch {}
                  resolve({
                    ok: status >= 200 && status < 300,
                    status,
                    json: parsed,
                  });
                }
              };
              xhr.onerror = () =>
                resolve({ ok: false, status: 0, json: { success: false } });
              xhr.send();
            });
          } catch {
            try {
              const res = await fetch(url, { headers: hdrs });
              const j = await res.json().catch(() => ({}));
              return { ok: res.ok, status: res.status, json: j };
            } catch {
              return { ok: false, status: 0, json: { success: false } };
            }
          }
        };

        try {
          const auth = await import("@/lib/auth");
          token = auth.getToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch {}

        let json: any = null;
        const endpoint = userParam
          ? `/api/wp/users/find?username=${encodeURIComponent(userParam)}`
          : "/api/wp/users/me";
        const r = await safeGetJson(endpoint, headers);
        lastStatus = r.status;
        json = r.json;
        if (!cancelled && r.ok && json?.success) {
          setWpName(json.data?.name || json.data?.username || null);
          setWpNickname(json.data?.nickname || null);
          setWpRoles(Array.isArray(json.data?.roles) ? json.data.roles : []);
          ok = true;
        }

        if (!ok && !userParam && (!token || lastStatus === 401) && !cancelled) {
          try {
            (await import("@/lib/auth")).clearToken();
          } catch {}
          navigate("/login");
          return;
        }

        if (
          !cancelled &&
          (pathLower === "/instructor" || pathLower === "/instructor/")
        ) {
          const slug = (
            (json && (json.data?.username || json.data?.slug)) ||
            wpName ||
            ""
          )
            .toLowerCase()
            .replace(/\s+/g, "-");
          if (slug) navigate(`/instructor/${slug}`);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Role-based navigation
  const pathLower = (location.pathname || "").toLowerCase();
  const isInstructorRoute =
    pathLower.startsWith("/instructor") ||
    pathLower.startsWith("/bookings-instructor-role") ||
    pathLower.startsWith("/bookingsinstructorrole");
  const isInstructor =
    (wpRoles || []).includes("instructor") || isInstructorRoute;

  const instructorSlug = (wpName || "").toLowerCase().replace(/\s+/g, "-");
  const instructorPath = instructorSlug
    ? `/instructor/${instructorSlug}`
    : "/instructor";

  const navigation = isInstructor
    ? [
        { name: "Dashboard", href: instructorPath, icon: Waves },
        { name: "Bookings", href: instructorPath, icon: Calendar },
      ]
    : [
        { name: "Dashboard", href: "/", icon: Waves },
        { name: "Bookings", href: "/bookings", icon: Calendar },
        { name: "Customers", href: "/customers", icon: Users },
        { name: "Staff Schedule", href: "/staff", icon: Users },
        { name: "Tours", href: "/tours", icon: MapPin },
        { name: "Revenue", href: "/revenue", icon: DollarSign },
        { name: "Analytics", href: "/analytics", icon: TrendingUp },
        { name: "CMS", href: "/cms", icon: Code },
        { name: "CMS Pages", href: "/cms/pages", icon: Code },
        { name: "Blog", href: "/cms/blog", icon: Code },
        { name: "Settings", href: "/settings", icon: Settings },
        { name: "API Test", href: "/api-test", icon: Code },
      ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 to-marine-50">
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 z-50 flex flex-col transition-all duration-200 ease-in-out",
          isSidebarExpanded ? "w-72" : "w-16",
        )}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div
          className={cn(
            "flex grow flex-col gap-y-5 overflow-y-auto bg-ocean-900 pt-4 pb-4 transition-all duration-200 ease-in-out",
            isSidebarExpanded ? "px-6" : "px-2",
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between">
            <div
              className={cn(
                "flex items-center gap-3",
                isSidebarExpanded ? "" : "hidden",
              )}
            >
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F2a778920e8d54a37b1576086f79dd676%2Fb9c71c9390bb4ca692d70f8090875b5b?format=webp&width=800"
                alt="KLSD Logo"
                className="w-full max-w-[180px] h-auto object-contain"
              />
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={
                isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"
              }
              className="rounded-md p-2 text-ocean-200 hover:text-white hover:bg-ocean-800 focus:outline-none focus:ring-2 focus:ring-marine-500"
            >
              {isSidebarExpanded ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isCurrent = location.pathname === item.href;
                    return (
                      <li key={item.name}>
                        <a
                          href={item.href}
                          title={item.name}
                          className={cn(
                            isCurrent
                              ? "bg-ocean-700 text-white"
                              : "text-ocean-200 hover:text-white hover:bg-ocean-800",
                            "group flex rounded-md p-2 text-sm leading-6 font-medium transition-all duration-200",
                            isSidebarExpanded ? "gap-x-3" : "justify-center",
                          )}
                        >
                          <item.icon
                            className={cn(
                              isCurrent
                                ? "text-white"
                                : "text-ocean-200 group-hover:text-white",
                              "h-6 w-6 shrink-0",
                            )}
                            aria-hidden="true"
                          />
                          {isSidebarExpanded && (
                            <span className="whitespace-nowrap">
                              {item.name}
                            </span>
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div
        className={cn(
          "transition-all duration-200 ease-in-out",
          isSidebarExpanded ? "pl-72" : "pl-16",
        )}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-ocean-200 bg-white/80 backdrop-blur-sm px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-ocean-700 lg:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-ocean-900">Dashboard</h2>
                <Badge
                  variant="secondary"
                  className="bg-marine-100 text-marine-800"
                >
                  Live
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button
                type="button"
                className="-m-2.5 p-2.5 text-ocean-400 hover:text-ocean-500"
              >
                <span className="sr-only">View notifications</span>
                <Bell className="h-6 w-6" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-x-4">
                <span className="text-sm font-medium text-ocean-700">
                  {wpNickname && wpNickname.trim()
                    ? `Hi ${wpNickname}`
                    : wpName && String(wpName).trim()
                      ? `Hi ${wpName}`
                      : "Hi"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-ocean-600"
                  onClick={async () => {
                    try {
                      const { clearToken } = await import("@/lib/auth");
                      clearToken();
                    } catch {}
                    const redirect = window.location.origin;
                    const url = `https://keylargoscubadiving.com/?klsd_logout=1&redirect_to=${encodeURIComponent(redirect)}`;
                    window.location.href = url;
                  }}
                  title="Log out via WordPress"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className={cn("py-10", className)}>
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
