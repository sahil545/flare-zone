export interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface WooCommerceBooking {
  id: number;
  product_id: number;
  order_id: number;
  resource_id?: number;
  person_counts: number[];
  status: "confirmed" | "pending" | "cancelled" | "completed";
  start: string; // ISO date string
  end: string; // ISO date string
  all_day: boolean;
  customer_id: number;
  customer?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  product?: {
    id: number;
    name: string;
    description: string;
    price: string;
  };
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  status: "publish" | "pending" | "draft";
  type: "booking" | "simple" | "variable";
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
}

export interface WooCommerceOrder {
  id: number;
  number: string;
  status:
    | "pending"
    | "processing"
    | "on-hold"
    | "completed"
    | "cancelled"
    | "refunded"
    | "failed";
  currency: string;
  date_created: string;
  date_modified: string;
  total: string;
  total_tax: string;
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    price: number;
    total: string;
  }>;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phone: string;
    email: string;
  };
  customer_id: number;
  customer_note: string;
}

export interface WooCommerceCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phone: string;
  };
}

export interface CreateBookingRequest {
  product_id: number;
  start_date: string;
  end_date: string;
  person_counts: number[];
  customer_id?: number;
  customer_email?: string;
  customer_first_name?: string;
  customer_last_name?: string;
  customer_phone?: string;
}

export interface BookingCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  participants: number;
  maxParticipants: number;
  status: "confirmed" | "pending" | "cancelled" | "completed";
  guide?: string;
  location?: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  // Extra booking metadata
  allDay?: boolean;
  resourceId?: number;
  localTimezone?: string;
  personCountsRaw?: any;
  bookingMeta?: any;
  wooCommerceData: {
    bookingId: number;
    orderId: number;
    productId: number;
  };
  // Optional attached order (when fetched)
  order?: WooCommerceOrder | null;
}

// API Response types
export interface WooCommerceApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface WooCommerceApiError {
  code: string;
  message: string;
  data?: {
    status: number;
  };
}
