import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Loader2, Users, DollarSign, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { wooCommerceService } from "@/lib/woocommerce-service";
import { WooCommerceProduct, WooCommerceCustomer, CreateBookingRequest } from "@shared/woocommerce";

interface CreateBookingModalProps {
  onBookingCreated?: () => void;
  defaultDate?: Date;
}

export function CreateBookingModal({ onBookingCreated, defaultDate }: CreateBookingModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [products, setProducts] = useState<WooCommerceProduct[]>([]);
  const [customers, setCustomers] = useState<WooCommerceCustomer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    productId: "",
    startDate: defaultDate ? defaultDate.toISOString().split('T')[0] : "",
    startTime: "09:00",
    endTime: "12:00",
    participants: 1,
    customerId: "",
    customerEmail: "",
    customerFirstName: "",
    customerLastName: "",
    customerPhone: "",
    useExistingCustomer: true,
  });

  // Load products and customers when modal opens
  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  const loadInitialData = async () => {
    try {
      setIsLoadingData(true);
      const [productsData, customersData] = await Promise.all([
        wooCommerceService.getBookingProducts(),
        wooCommerceService.getCustomers({ page: 1, perPage: 50 })
      ]);
      setProducts(productsData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const searchCustomers = async (search: string) => {
    if (search.length < 2) return;
    try {
      const results = await wooCommerceService.getCustomers({ 
        search, 
        page: 1, 
        perPage: 20 
      });
      setCustomers(results);
    } catch (error) {
      console.error('Failed to search customers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productId || !formData.startDate) {
      return;
    }

    try {
      setIsLoading(true);

      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.startDate}T${formData.endTime}`);

      const bookingRequest: CreateBookingRequest = {
        product_id: parseInt(formData.productId),
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        person_counts: [formData.participants],
      };

      if (formData.useExistingCustomer && formData.customerId) {
        bookingRequest.customer_id = parseInt(formData.customerId);
      } else {
        bookingRequest.customer_email = formData.customerEmail;
        bookingRequest.customer_first_name = formData.customerFirstName;
        bookingRequest.customer_last_name = formData.customerLastName;
        bookingRequest.customer_phone = formData.customerPhone;
      }

      await wooCommerceService.createBooking(bookingRequest);
      
      // Reset form and close modal
      setFormData({
        productId: "",
        startDate: defaultDate ? defaultDate.toISOString().split('T')[0] : "",
        startTime: "09:00",
        endTime: "12:00",
        participants: 1,
        customerId: "",
        customerEmail: "",
        customerFirstName: "",
        customerLastName: "",
        customerPhone: "",
        useExistingCustomer: true,
      });
      
      setOpen(false);
      onBookingCreated?.();
    } catch (error) {
      console.error('Failed to create booking:', error);
      // Here you could show a toast notification with the error
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id.toString() === formData.productId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-ocean-500" />
            Create New Booking
          </DialogTitle>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading booking options...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tour Selection */}
            <div className="space-y-2">
              <Label htmlFor="product">Select Tour</Label>
              <Select 
                value={formData.productId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, productId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tour..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{product.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          ${product.price}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProduct && (
                <div className="text-sm text-muted-foreground">
                  {selectedProduct.short_description}
                </div>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <Label htmlFor="participants">Number of Participants</Label>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="participants"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.participants}
                  onChange={(e) => setFormData(prev => ({ ...prev, participants: parseInt(e.target.value) || 1 }))}
                  className="w-20"
                  required
                />
                <span className="text-sm text-muted-foreground">participants</span>
              </div>
            </div>

            {/* Customer Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label>Customer</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.useExistingCustomer ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, useExistingCustomer: true }))}
                  >
                    Existing Customer
                  </Button>
                  <Button
                    type="button"
                    variant={!formData.useExistingCustomer ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, useExistingCustomer: false }))}
                  >
                    New Customer
                  </Button>
                </div>
              </div>

              {formData.useExistingCustomer ? (
                <div className="space-y-2">
                  <Select 
                    value={formData.customerId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select existing customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.first_name} {customer.last_name} ({customer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.customerFirstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerFirstName: e.target.value }))}
                      required={!formData.useExistingCustomer}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.customerLastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerLastName: e.target.value }))}
                      required={!formData.useExistingCustomer}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      required={!formData.useExistingCustomer}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Booking...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Create Booking
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
