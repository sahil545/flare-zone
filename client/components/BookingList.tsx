import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, User, Phone, Mail, MapPin, Clock, DollarSign, Hash, Package, AlertCircle, RefreshCw, Eye } from "lucide-react";
import { wooCommerceService } from "@/lib/woocommerce-service";

interface BookingData {
  id: string;
  title: string;
  start: Date;
  end: Date;
  participants: number;
  maxParticipants: number;
  status: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  wooCommerceData?: {
    bookingId: number;
    orderId: number;
    productId: number;
  };
}

interface ExtendedBookingData {
  // Standard booking fields
  id: number;
  order_id: number;
  product_id: number;
  status: string;
  start: number;
  end: number;
  all_day: boolean;
  cost: string;
  customer_id: number;
  person_counts: any;
  
  // Customer data
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    billing?: any;
    shipping?: any;
  };
  
  // Product data
  product?: {
    id: number;
    name: string;
    slug: string;
    type: string;
    description: string;
    price: string;
    categories: any[];
  };
  
  // Order data
  order?: {
    id: number;
    number: string;
    status: string;
    currency: string;
    total: string;
    date_created: string;
    billing: any;
    line_items: any[];
  };
  
  // Additional metadata
  date_created?: string;
  date_modified?: string;
  local_timezone?: string;
  google_calendar_event_id?: string;
  create_order?: boolean;
  persons?: any[];
  resource_id?: number;
  
  // Raw data for debugging
  _raw_data?: any;
}

export function BookingList() {
  const [bookings, setBookings] = useState<ExtendedBookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBooking, setExpandedBooking] = useState<number | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 Fetching recent booking data...');
      
      // Use the getRecentData method to get comprehensive booking information
      const response = await wooCommerceService.getRecentData(10);
      
      console.log('📋 Recent data response:', response);
      
      if (response.bookings.success && response.bookings.data) {
        setBookings(response.bookings.data);
        console.log(`✅ Loaded ${response.bookings.data.length} bookings`);
      } else {
        throw new Error(response.bookings.error || 'Failed to fetch bookings');
      }
    } catch (err) {
      console.error('❌ Error fetching bookings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatCurrency = (amount: string, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount || '0'));
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderParticipants = (personCounts: any) => {
    if (!personCounts) return 'N/A';
    
    if (typeof personCounts === 'number') {
      return personCounts.toString();
    }
    
    if (Array.isArray(personCounts)) {
      return personCounts.reduce((sum, count) => sum + count, 0).toString();
    }
    
    if (typeof personCounts === 'object') {
      const total = Object.values(personCounts).reduce((sum: number, count: any) => sum + (Number(count) || 0), 0);
      const details = Object.entries(personCounts).map(([key, value]) => `${key}: ${value}`).join(', ');
      return `${total} (${details})`;
    }
    
    return JSON.stringify(personCounts);
  };

  const toggleExpandBooking = (bookingId: number) => {
    setExpandedBooking(expandedBooking === bookingId ? null : bookingId);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Last 10 Bookings...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Error Loading Bookings
          </CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchBookings} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ocean-900">Booking List (Testing)</h2>
          <p className="text-muted-foreground">
            Last 10 bookings with comprehensive metadata
          </p>
        </div>
        <Button onClick={fetchBookings} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No bookings found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="border-l-4 border-l-ocean-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Booking #{booking.id}
                      {booking.product?.name && (
                        <span className="text-lg">- {booking.product.name}</span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                      {booking.cost && (
                        <span className="text-sm font-medium flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(booking.cost)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpandBooking(booking.id)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    {expandedBooking === booking.id ? 'Less' : 'More'}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Core Booking Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Start Date</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(booking.start)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">End Date</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(booking.end)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Participants</p>
                      <p className="text-sm text-muted-foreground">
                        {renderParticipants(booking.person_counts)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                {booking.customer && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium">Name</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.customer.first_name} {booking.customer.last_name}
                        </p>
                      </div>
                      {booking.customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {booking.customer.email}
                          </span>
                        </div>
                      )}
                      {booking.customer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {booking.customer.phone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reference IDs */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Reference IDs</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Booking ID</p>
                      <p className="text-muted-foreground">{booking.id}</p>
                    </div>
                    <div>
                      <p className="font-medium">Order ID</p>
                      <p className="text-muted-foreground">{booking.order_id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Product ID</p>
                      <p className="text-muted-foreground">{booking.product_id}</p>
                    </div>
                    <div>
                      <p className="font-medium">Customer ID</p>
                      <p className="text-muted-foreground">{booking.customer_id || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedBooking === booking.id && (
                  <div className="border-t pt-4 space-y-4">
                    {/* Product Details */}
                    {booking.product && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Product Details
                        </h4>
                        <div className="bg-gray-50 p-3 rounded-md space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Name</p>
                              <p className="text-muted-foreground">{booking.product.name}</p>
                            </div>
                            <div>
                              <p className="font-medium">Type</p>
                              <p className="text-muted-foreground">{booking.product.type}</p>
                            </div>
                            <div>
                              <p className="font-medium">Price</p>
                              <p className="text-muted-foreground">{formatCurrency(booking.product.price)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Slug</p>
                              <p className="text-muted-foreground">{booking.product.slug}</p>
                            </div>
                          </div>
                          {booking.product.description && (
                            <div>
                              <p className="font-medium">Description</p>
                              <p className="text-muted-foreground text-sm">
                                {booking.product.description.length > 200 
                                  ? `${booking.product.description.substring(0, 200)}...`
                                  : booking.product.description
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Additional Metadata */}
                    <div>
                      <h4 className="font-medium mb-2">Additional Metadata</h4>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium">All Day</p>
                            <p className="text-muted-foreground">{booking.all_day ? 'Yes' : 'No'}</p>
                          </div>
                          {booking.local_timezone && (
                            <div>
                              <p className="font-medium">Timezone</p>
                              <p className="text-muted-foreground">{booking.local_timezone}</p>
                            </div>
                          )}
                          {booking.resource_id && (
                            <div>
                              <p className="font-medium">Resource ID</p>
                              <p className="text-muted-foreground">{booking.resource_id}</p>
                            </div>
                          )}
                          {booking.date_created && (
                            <div>
                              <p className="font-medium">Created</p>
                              <p className="text-muted-foreground">
                                {new Date(booking.date_created).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Raw Data (for debugging) */}
                    <details className="border border-gray-200 rounded-md">
                      <summary className="p-3 font-medium cursor-pointer hover:bg-gray-50">
                        Raw Booking Data (Developer)
                      </summary>
                      <div className="p-3 border-t bg-gray-50">
                        <pre className="text-xs text-gray-600 overflow-x-auto">
                          {JSON.stringify(booking, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
