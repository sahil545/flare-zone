import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  User,
  CreditCard,
  Package,
  DollarSign,
  Hash,
} from "lucide-react";
import { BookingCalendarEvent } from "@shared/woocommerce";
import { useState, useEffect } from "react";
import { wooCommerceService } from "@/lib/woocommerce-service";
import { fmtLocal } from "@/utils/datetime";

interface BookingDetailsModalProps {
  booking: BookingCalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BookingDetailsModal({
  booking,
  isOpen,
  onClose,
}: BookingDetailsModalProps) {
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Fetch order details when booking changes
  useEffect(() => {
    if (booking?.wooCommerceData?.orderId && isOpen) {
      fetchOrderDetails(booking.wooCommerceData.orderId);
    }
  }, [booking, isOpen]);

  const fetchOrderDetails = async (orderId: number) => {
    try {
      setLoadingOrder(true);
      const order = await wooCommerceService.getOrderById(orderId);
      setOrderDetails(order);
    } catch (error) {
      console.error("Failed to fetch order details:", error);
      setOrderDetails(null);
    } finally {
      setLoadingOrder(false);
    }
  };

  if (!booking) return null;

  const formatDate = (date: Date) => {
    const tz = booking?.localTimezone || "UTC";
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: tz,
    }).format(date);
  };

  const formatTime = (date: Date) => {
    const tz = booking?.localTimezone || "UTC";
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-ocean-500" />
            {booking.title}
          </DialogTitle>
          <DialogDescription>
            Booking details and associated order information
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge className={getStatusColor(booking.status)}>
                  {booking.status.charAt(0).toUpperCase() +
                    booking.status.slice(1)}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">
                      {formatDate(booking.start)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {(() => {
                        const tz = booking.localTimezone || "UTC";
                        return `${fmtLocal(booking.start, tz, { year: undefined, month: undefined, day: undefined })} - ${fmtLocal(booking.end, tz, { year: undefined, month: undefined, day: undefined })}`;
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">
                      {booking.participants} participants
                    </div>
                    <div className="text-sm text-gray-600">
                      Max: {booking.maxParticipants || "Unlimited"}
                    </div>
                  </div>
                </div>

                {booking.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div className="font-medium">{booking.location}</div>
                  </div>
                )}

                {booking.guide && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium">Guide: {booking.guide}</div>
                    </div>
                  </div>
                )}

                {/* Booking metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {typeof booking.allDay !== "undefined" && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">All Day:</span>{" "}
                      {booking.allDay ? "Yes" : "No"}
                    </div>
                  )}
                  {typeof booking.resourceId !== "undefined" && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Resource ID:</span>{" "}
                      {booking.resourceId}
                    </div>
                  )}
                  {booking.localTimezone && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Timezone:</span>{" "}
                      {booking.localTimezone}
                    </div>
                  )}
                  {booking.personCountsRaw && (
                    <div className="text-sm text-gray-700 break-all">
                      <span className="font-medium">Person Counts:</span>{" "}
                      {typeof booking.personCountsRaw === "string"
                        ? booking.personCountsRaw
                        : JSON.stringify(booking.personCountsRaw)}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">WooCommerce Data</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3 w-3" />
                    Booking ID: {booking.wooCommerceData?.bookingId || "N/A"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-3 w-3" />
                    Order ID: {booking.wooCommerceData?.orderId || "N/A"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-3 w-3" />
                    Product ID: {booking.wooCommerceData?.productId || "N/A"}
                  </div>
                </div>
              </div>

              {booking.bookingMeta && (
                <>
                  <Separator />
                  <div className="space-y-1 text-sm text-gray-700">
                    <h4 className="font-medium">Booking Meta</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {booking.bookingMeta.google_calendar_event_id && (
                        <div>
                          <span className="font-medium">Google Event:</span>{" "}
                          {booking.bookingMeta.google_calendar_event_id}
                        </div>
                      )}
                      {booking.bookingMeta.date_created != null && (
                        <div>
                          <span className="font-medium">Created:</span>{" "}
                          {new Intl.DateTimeFormat("en-US", {
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                            timeZone: booking.localTimezone || "UTC",
                          }).format(new Date(Number(booking.bookingMeta.date_created)))}
                        </div>
                      )}
                      {booking.bookingMeta.date_modified != null && (
                        <div>
                          <span className="font-medium">Modified:</span>{" "}
                          {new Intl.DateTimeFormat("en-US", {
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                            timeZone: booking.localTimezone || "UTC",
                          }).format(new Date(Number(booking.bookingMeta.date_modified)))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">{booking.customer.name}</div>
                    <div className="text-sm text-gray-600">Customer</div>
                  </div>
                </div>

                {booking.customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div className="font-medium">{booking.customer.email}</div>
                  </div>
                )}

                {booking.customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div className="font-medium">{booking.customer.phone}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          {orderDetails && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm font-medium">Order Number</span>
                    <div className="font-mono">#{orderDetails.number}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Order Date</span>
                    <div>
                      {new Date(orderDetails.date_created).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Order Status</span>
                    <Badge className={getStatusColor(orderDetails.status)}>
                      {orderDetails.status}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Total Amount</span>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-bold">{orderDetails.total}</span>
                      <span className="text-sm text-gray-600">
                        {orderDetails.currency}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Payment Method</span>
                    <div>{orderDetails.payment_method_title || "N/A"}</div>
                  </div>
                </div>

                {orderDetails.line_items &&
                  orderDetails.line_items.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-3">Order Items</h4>
                        <div className="space-y-2">
                          {orderDetails.line_items.map(
                            (item: any, index: number) => (
                              <div
                                key={index}
                                className="flex justify-between items-center p-2 bg-gray-50 rounded"
                              >
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-sm text-gray-600">
                                    Qty: {item.quantity}
                                  </div>
                                </div>
                                <div className="font-medium">${item.total}</div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </>
                  )}

                {orderDetails.meta_data &&
                  orderDetails.meta_data.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-3">Order Meta</h4>
                        <div className="space-y-1 text-sm text-gray-700">
                          {orderDetails.meta_data.map((m: any, i: number) => (
                            <div key={i} className="grid grid-cols-3 gap-2">
                              <div className="font-medium col-span-1 break-all">
                                {m.key}
                              </div>
                              <div className="col-span-2 break-all">
                                {typeof m.value === "string"
                                  ? m.value
                                  : JSON.stringify(m.value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                {orderDetails.line_items &&
                  orderDetails.line_items.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-3">Item Options (EPO)</h4>
                        <div className="space-y-3">
                          {orderDetails.line_items.map(
                            (item: any, idx: number) => (
                              <div key={idx} className="p-2 rounded bg-gray-50">
                                <div className="text-sm font-medium mb-1">
                                  {item.name}
                                </div>
                                {item.meta_data && item.meta_data.length > 0 ? (
                                  <div className="space-y-1 text-sm text-gray-700">
                                    {item.meta_data.map((m: any, i: number) => (
                                      <div
                                        key={i}
                                        className="grid grid-cols-3 gap-2"
                                      >
                                        <div className="font-medium col-span-1 break-all">
                                          {m.key}
                                        </div>
                                        <div className="col-span-2 break-all">
                                          {typeof m.value === "string"
                                            ? m.value
                                            : JSON.stringify(m.value)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">
                                    No extra options
                                  </div>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </>
                  )}

                {orderDetails.billing && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Billing Address</h4>
                        <div className="text-sm space-y-1">
                          <div>
                            {orderDetails.billing.first_name}{" "}
                            {orderDetails.billing.last_name}
                          </div>
                          {orderDetails.billing.company && (
                            <div>{orderDetails.billing.company}</div>
                          )}
                          <div>{orderDetails.billing.address_1}</div>
                          {orderDetails.billing.address_2 && (
                            <div>{orderDetails.billing.address_2}</div>
                          )}
                          <div>
                            {orderDetails.billing.city},{" "}
                            {orderDetails.billing.state}{" "}
                            {orderDetails.billing.postcode}
                          </div>
                          <div>{orderDetails.billing.country}</div>
                          {orderDetails.billing.email && (
                            <div>{orderDetails.billing.email}</div>
                          )}
                          {orderDetails.billing.phone && (
                            <div>{orderDetails.billing.phone}</div>
                          )}
                        </div>
                      </div>
                      {orderDetails.shipping && (
                        <div>
                          <h4 className="font-medium mb-2">Shipping Address</h4>
                          <div className="text-sm space-y-1">
                            <div>
                              {orderDetails.shipping.first_name}{" "}
                              {orderDetails.shipping.last_name}
                            </div>
                            {orderDetails.shipping.company && (
                              <div>{orderDetails.shipping.company}</div>
                            )}
                            <div>{orderDetails.shipping.address_1}</div>
                            {orderDetails.shipping.address_2 && (
                              <div>{orderDetails.shipping.address_2}</div>
                            )}
                            <div>
                              {orderDetails.shipping.city},{" "}
                              {orderDetails.shipping.state}{" "}
                              {orderDetails.shipping.postcode}
                            </div>
                            <div>{orderDetails.shipping.country}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {loadingOrder && (
            <Card className="lg:col-span-2">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ocean-500"></div>
                  <span>Loading order details...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
