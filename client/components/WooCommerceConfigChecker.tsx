import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Play,
  Settings,
  Package,
  Calendar,
  ShoppingCart,
  AlertTriangle,
  Info
} from "lucide-react";

interface ConfigResult {
  check: string;
  status: 'success' | 'error' | 'warning' | 'testing';
  message: string;
  details?: any;
  suggestion?: string;
}

export function WooCommerceConfigChecker() {
  const [results, setResults] = useState<ConfigResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runConfigCheck = async () => {
    setIsRunning(true);
    setResults([]);
    
    const checks = [
      {
        name: 'System Status',
        test: () => fetch('/api/debug/woocommerce/system'),
        icon: Settings
      },
      {
        name: 'Products Available',
        test: () => fetch('/api/woocommerce/products'),
        icon: Package
      },
      {
        name: 'Orders Available', 
        test: () => fetch('/api/woocommerce/orders'),
        icon: ShoppingCart
      },
      {
        name: 'Bookings Endpoints',
        test: () => fetch('/api/debug/woocommerce/booking-endpoints'),
        icon: Calendar
      },
      {
        name: 'Recent Data Check',
        test: () => fetch('/api/woocommerce/recent-data?count=5'),
        icon: Info
      }
    ];

    for (const check of checks) {
      // Update status to testing
      setResults(prev => [...prev, {
        check: check.name,
        status: 'testing',
        message: 'Checking...'
      }]);

      try {
        const response = await fetch(check.test().url, check.test());
        const data = await response.json();

        let status: 'success' | 'error' | 'warning' = 'success';
        let message = '';
        let suggestion = '';

        if (check.name === 'System Status') {
          const hasBookingsPlugin = data.data?.active_plugins?.some((plugin: string) => 
            plugin.includes('woocommerce-bookings') || plugin.includes('booking')
          );
          
          if (hasBookingsPlugin) {
            message = '✅ WooCommerce Bookings plugin detected';
          } else {
            status = 'warning';
            message = '⚠️ WooCommerce Bookings plugin not found';
            suggestion = 'Install WooCommerce Bookings plugin to enable booking functionality';
          }
        } 
        else if (check.name === 'Products Available') {
          const productCount = data.data?.length || 0;
          const bookingProducts = data.data?.filter((p: any) => p.type === 'booking')?.length || 0;
          
          if (bookingProducts > 0) {
            message = `✅ ${bookingProducts} booking products found (${productCount} total)`;
          } else {
            status = 'warning';
            message = `⚠️ No booking products found (${productCount} regular products)`;
            suggestion = 'Create products with type "booking" to enable bookable tours';
          }
        }
        else if (check.name === 'Orders Available') {
          const orderCount = data.data?.length || 0;
          message = orderCount > 0 
            ? `✅ ${orderCount} orders found` 
            : '⚠️ No orders found';
          status = orderCount > 0 ? 'success' : 'warning';
        }
        else if (check.name === 'Bookings Endpoints') {
          if (data.success && data.available_endpoints?.length > 0) {
            message = `✅ ${data.available_endpoints.length} booking endpoints available`;
          } else {
            status = 'error';
            message = '❌ No booking endpoints accessible';
            suggestion = 'WooCommerce Bookings plugin may not be properly configured';
          }
        }
        else if (check.name === 'Recent Data Check') {
          const bookingCount = data.data?.bookings?.count || 0;
          const orderCount = data.data?.orders?.count || 0;
          
          if (bookingCount > 0) {
            message = `✅ ${bookingCount} bookings, ${orderCount} orders found`;
          } else {
            status = 'warning';
            message = `⚠️ 0 bookings, ${orderCount} orders found`;
            suggestion = 'Create test bookings or check if existing orders should be bookings';
          }
        }

        if (!response.ok) {
          status = 'error';
          message = `❌ ${check.name} failed (${response.status})`;
        }

        setResults(prev => prev.map(result => 
          result.check === check.name 
            ? {
                check: check.name,
                status,
                message,
                details: data,
                suggestion
              }
            : result
        ));
      } catch (error) {
        setResults(prev => prev.map(result => 
          result.check === check.name 
            ? {
                check: check.name,
                status: 'error',
                message: `❌ ${check.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                suggestion: 'Check API connectivity and server configuration'
              }
            : result
        ));
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'testing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'testing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-500" />
            WooCommerce Configuration Check
            <Badge className="bg-purple-100 text-purple-800">
              Booking Setup
            </Badge>
          </CardTitle>
          <Button 
            onClick={runConfigCheck} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Check Config
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {results.length === 0 && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 text-purple-300" />
            <p>Click "Check Config" to diagnose WooCommerce booking setup</p>
            <p className="text-xs mt-2">This will help identify why no bookings are found</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.check}</span>
                  </div>
                  <Badge className={getStatusColor(result.status)}>
                    {result.status}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                
                {result.suggestion && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-2">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Suggestion:</strong> {result.suggestion}
                    </p>
                  </div>
                )}
                
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800 mb-2">
                      View Details
                    </summary>
                    <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-xs">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Configuration Guide */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-800 mb-2">📋 Booking Setup Checklist</h4>
          <div className="text-sm space-y-2 text-amber-700">
            <div className="flex items-start gap-2">
              <span>1.</span>
              <span><strong>Install WooCommerce Bookings Plugin:</strong> Required for booking functionality</span>
            </div>
            <div className="flex items-start gap-2">
              <span>2.</span>
              <span><strong>Create Booking Products:</strong> Set product type to "Booking" for tours</span>
            </div>
            <div className="flex items-start gap-2">
              <span>3.</span>
              <span><strong>Configure Booking Settings:</strong> Set availability, duration, and pricing</span>
            </div>
            <div className="flex items-start gap-2">
              <span>4.</span>
              <span><strong>Test Booking Creation:</strong> Create a test booking to verify setup</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
