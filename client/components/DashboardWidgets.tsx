import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Users,
  MapPin,
  Waves,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Sun,
  Wind,
  Thermometer,
  Eye,
  User,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { wooCommerceService } from "@/lib/woocommerce-service";
import { BookingCalendarEvent } from "@shared/woocommerce";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  description?: string;
}

function StatCard({ title, value, change, changeType, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className={cn(
            "text-xs flex items-center gap-1",
            changeType === "positive" && "text-green-600",
            changeType === "negative" && "text-red-600",
            changeType === "neutral" && "text-muted-foreground"
          )}>
            <TrendingUp className="h-3 w-3" />
            {change}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardWidgets() {
  type TourRow = {
    id: string;
    name: string;
    time: string;
    participants: number;
    maxParticipants: number;
    status: string;
    guide?: string;
  };

  const [todayTours, setTodayTours] = useState<TourRow[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [todayCount, setTodayCount] = useState(0);

  const fmtTime = (d: Date) =>
    new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingToday(true);
        const today = new Date();
        const day = today.toISOString().split("T")[0];
        const events: BookingCalendarEvent[] = await wooCommerceService.getCalendarBookings({
          startDate: day,
          endDate: day,
        });
        const rows: TourRow[] = (events || [])
          .filter((e) => e && e.start)
          .sort((a, b) => (a.start as any).getTime() - (b.start as any).getTime())
          .map((e) => ({
            id: String(e.id),
            name: e.title || `Booking #${e.wooCommerceData?.bookingId || ""}`,
            time: fmtTime(e.start as any),
            participants: Number(e.participants || 1),
            maxParticipants: Number(e.maxParticipants || 15),
            status: String(e.status || "pending"),
            guide: (e as any).guide || undefined,
          }));
        if (!mounted) return;
        setTodayTours(rows);
        setTodayCount(rows.length);
      } catch {
        if (!mounted) return;
        setTodayTours([]);
        setTodayCount(0);
      } finally {
        if (mounted) setLoadingToday(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const recentBookings = [
    { id: 1, customer: "John Smith", tour: "Beginner Scuba", time: "2 min ago", amount: "$120" },
    { id: 2, customer: "Maria Garcia", tour: "Advanced Wreck Dive", time: "15 min ago", amount: "$180" },
    { id: 3, customer: "David Chen", tour: "Snorkeling Tour", time: "1 hour ago", amount: "$75" },
    { id: 4, customer: "Sarah Wilson", tour: "Certification Course", time: "2 hours ago", amount: "$350" }
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Bookings"
          value={todayCount}
          change="+12% from yesterday"
          changeType="positive"
          icon={Calendar}
        />
        <StatCard
          title="Active Tours"
          value={todayCount}
          description="Currently scheduled"
          icon={MapPin}
        />
        <StatCard
          title="Revenue Today"
          value="$2,450"
          change="+8% from yesterday"
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title="Staff on Duty"
          value="12/15"
          description="3 staff off today"
          icon={Users}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weather & Conditions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-yellow-500" />
              Ocean Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Water Temp</span>
              </div>
              <span className="font-medium">78°F</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-cyan-500" />
                <span className="text-sm">Visibility</span>
              </div>
              <span className="font-medium">45 ft</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Wave Height</span>
              </div>
              <span className="font-medium">2-3 ft</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Conditions</span>
              </div>
              <Badge className="bg-green-100 text-green-800">Excellent</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tours */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-ocean-500" />
              Today's Tours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingToday && (
                <div className="text-sm text-muted-foreground">Loading today\'s tours...</div>
              )}
              {!loadingToday && todayTours.length === 0 && (
                <div className="text-sm text-muted-foreground">No tours scheduled today.</div>
              )}
              {todayTours.slice(0, 8).map((tour) => (
                <div key={tour.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{tour.name}</h4>
                      <Badge
                        variant={tour.status === "confirmed" ? "default" : "secondary"}
                        className={tour.status === "confirmed" ? "bg-green-100 text-green-800" : ""}
                      >
                        {tour.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {tour.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {tour.participants}/{tour.maxParticipants}
                      </span>
                      {tour.guide && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {tour.guide}
                        </span>
                      )}
                    </div>
                    <Progress
                      value={(tour.participants / tour.maxParticipants) * 100}
                      className="mt-2 h-2"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-500" />
              Recent Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <div className="font-medium">{booking.customer}</div>
                    <div className="text-sm text-muted-foreground">{booking.tour}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">{booking.amount}</div>
                    <div className="text-xs text-muted-foreground">{booking.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Bookings
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Create New Booking
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Add Staff Schedule
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              Schedule New Tour
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              Equipment Check
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <AlertCircle className="h-4 w-4 mr-2" />
              Safety Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
