import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Bug,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Settings,
  Wifi
} from "lucide-react";

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export function WooCommerceDebug() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    
    const tests: TestResult[] = [];

    // Test 1: Basic WooCommerce Connection
    try {
      const response = await fetch('/api/debug/woocommerce/connection');
      const data = await response.json();
      
      tests.push({
        name: 'WooCommerce Connection',
        status: data.success ? 'success' : 'error',
        message: data.success ? 
          `Connected successfully (${data.productsCount} products found)` : 
          data.error || 'Connection failed',
        details: data
      });
    } catch (error) {
      tests.push({
        name: 'WooCommerce Connection',
        status: 'error',
        message: 'Failed to test connection',
        details: error
      });
    }

    // Test 2: System Status
    try {
      const response = await fetch('/api/debug/woocommerce/system');
      const data = await response.json();
      
      if (data.success) {
        const hasBookingsPlugin = data.data.active_plugins?.some((plugin: any) => 
          plugin.plugin.toLowerCase().includes('booking')
        );
        
        tests.push({
          name: 'WooCommerce System',
          status: 'success',
          message: `WooCommerce ${data.data.woocommerce_version} on WordPress ${data.data.wordpress_version}`,
          details: data.data
        });
        
        tests.push({
          name: 'WooCommerce Bookings Plugin',
          status: hasBookingsPlugin ? 'success' : 'warning',
          message: hasBookingsPlugin ? 
            'WooCommerce Bookings plugin detected' : 
            'WooCommerce Bookings plugin not found',
          details: data.data.active_plugins
        });
      } else {
        tests.push({
          name: 'WooCommerce System',
          status: 'error',
          message: data.error || 'Failed to get system status',
          details: data
        });
      }
    } catch (error) {
      tests.push({
        name: 'WooCommerce System',
        status: 'error',
        message: 'Failed to get system status',
        details: error
      });
    }

    // Test 3: Booking Endpoints
    try {
      const response = await fetch('/api/debug/woocommerce/booking-endpoints');
      const data = await response.json();
      
      if (data.success) {
        const workingEndpoints = data.results.filter((r: any) => r.success);
        
        tests.push({
          name: 'Booking Endpoints',
          status: workingEndpoints.length > 0 ? 'success' : 'warning',
          message: workingEndpoints.length > 0 ? 
            `Found ${workingEndpoints.length} working booking endpoints` : 
            'No working booking endpoints found',
          details: data.results
        });
      } else {
        tests.push({
          name: 'Booking Endpoints',
          status: 'error',
          message: data.error || 'Failed to test booking endpoints',
          details: data
        });
      }
    } catch (error) {
      tests.push({
        name: 'Booking Endpoints',
        status: 'error',
        message: 'Failed to test booking endpoints',
        details: error
      });
    }

    setResults(tests);
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-blue-500" />
                WooCommerce Debug Tools
              </CardTitle>
              <div className="flex items-center gap-2">
                {results.length > 0 && (
                  <Badge variant="secondary">
                    {results.filter(r => r.status === 'success').length}/{results.length} tests passed
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Run diagnostics to troubleshoot WooCommerce integration issues
                </p>
                <Button
                  onClick={runDiagnostics}
                  disabled={isRunning}
                  size="sm"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running Tests...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Run Diagnostics
                    </>
                  )}
                </Button>
              </div>

              {/* Test Results */}
              {results.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Diagnostic Results</h4>
                  {results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <span className="font-medium text-sm">{result.name}</span>
                        </div>
                        <Badge variant="secondary" className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                      
                      {result.details && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                            View Details
                          </summary>
                          <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Configuration Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-sm text-blue-800 mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Current Configuration
                </h4>
                <div className="text-xs space-y-1 text-blue-700">
                  <div>Store URL: https://keylargoscubadiving.com</div>
                  <div>Consumer Key: ✓ Configured</div>
                  <div>Consumer Secret: ✓ Configured</div>
                  <div className="text-blue-600 mt-2">
                    Configuration is managed server-side for security
                  </div>
                </div>
              </div>

              {/* Troubleshooting Tips */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h4 className="font-medium text-sm text-amber-800 mb-2">💡 Troubleshooting Tips</h4>
                <ul className="text-xs space-y-1 text-amber-700">
                  <li>• Ensure WooCommerce REST API is enabled in your store settings</li>
                  <li>• Verify your consumer key and secret are correct</li>
                  <li>• Install WooCommerce Bookings plugin for booking functionality</li>
                  <li>• Check that your WordPress site is accessible and not behind authentication</li>
                  <li>• Ensure SSL is configured if your store uses HTTPS</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
