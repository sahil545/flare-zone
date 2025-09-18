import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign,
  Loader2,
  User,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { wooCommerceService } from "@/lib/woocommerce-service";
import { WooCommerceCustomer } from "@shared/woocommerce";

interface CustomerCardProps {
  customer: WooCommerceCustomer;
  onCustomerClick?: (customer: WooCommerceCustomer) => void;
}

function CustomerCard({ customer, onCustomerClick }: CustomerCardProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onCustomerClick?.(customer)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-ocean-100 text-ocean-700">
              {getInitials(customer.first_name, customer.last_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 truncate">
                {customer.first_name} {customer.last_name}
              </h3>
              <Badge variant="secondary" className="text-xs">
                ID: {customer.id}
              </Badge>
            </div>
            
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Mail className="h-3 w-3" />
                <span className="truncate">{customer.email}</span>
              </div>
              
              {customer.phone && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Phone className="h-3 w-3" />
                  <span>{customer.phone}</span>
                </div>
              )}
              
              {customer.billing.city && customer.billing.country && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">
                    {customer.billing.city}, {customer.billing.country}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CustomerManagement() {
  const [customers, setCustomers] = useState<WooCommerceCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = async (page: number = 1, search: string = "") => {
    try {
      setIsLoading(true);
      setError(null);
      
      const perPage = 20;
      const customersData = await wooCommerceService.getCustomers({
        page,
        perPage,
        search: search.trim() || undefined,
      });
      
      if (page === 1) {
        setCustomers(customersData);
      } else {
        setCustomers(prev => [...prev, ...customersData]);
      }
      
      setHasMore(customersData.length === perPage);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
      console.error('Error loading customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers(1, searchTerm);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadCustomers(1, searchTerm);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadCustomers(currentPage + 1, searchTerm);
    }
  };

  const handleCustomerClick = (customer: WooCommerceCustomer) => {
    // Here you could open a customer detail modal or navigate to a customer page
    console.log('Customer clicked:', customer);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
          <p className="text-gray-600 mt-1">
            Manage customers from your WooCommerce store
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-ocean-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-ocean-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.length}</p>
                <p className="text-sm text-gray-600">Total Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">24</p>
                <p className="text-sm text-gray-600">Active Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">$12.5k</p>
                <p className="text-sm text-gray-600">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <div className="h-4 w-4 rounded-full bg-red-500" />
              <span className="font-medium">Error loading customers</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => loadCustomers(1, searchTerm)}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Customer Grid */}
      {customers.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onCustomerClick={handleCustomerClick}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More Customers"
                )}
              </Button>
            </div>
          )}
        </>
      ) : !isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "No customers found" : "No customers yet"}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? `No customers match "${searchTerm}". Try a different search term.`
                : "Customers from your WooCommerce store will appear here."
              }
            </p>
            {searchTerm && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  loadCustomers(1, "");
                }}
              >
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Loading State */}
      {isLoading && customers.length === 0 && (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading customers...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
