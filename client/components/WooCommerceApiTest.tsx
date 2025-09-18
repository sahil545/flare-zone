import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Play,
  Globe,
  Package,
  Users,
  Calendar
} from "lucide-react";

interface ApiTestResult {
  endpoint: string;
  status: 'success' | 'error' | 'testing';
  message: string;
  data?: any;
  responseTime?: number;
}

export function WooCommerceApiTest() {
  const [results, setResults] = useState<ApiTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runApiTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    const tests = [
      {
        name: 'Connection Test',
        endpoint: '/api/debug/woocommerce/connection',
        icon: Globe
      },
      {
        name: 'System Status',
        endpoint: '/api/debug/woocommerce/system', 
        icon: CheckCircle
      },
      {
        name: 'Products API',
        endpoint: '/api/woocommerce/products',
        icon: Package
      },
      {
        name: 'Customers API',
        endpoint: '/api/woocommerce/customers',
        icon: Users
      },
      {
        name: 'Booking Endpoints',
        endpoint: '/api/debug/woocommerce/booking-endpoints',
        icon: Calendar
      }
    ];

    for (const test of tests) {
      const startTime = Date.now();
      
      // Update status to testing
      setResults(prev => [...prev, {
        endpoint: test.name,
        status: 'testing',
        message: 'Testing...',
        responseTime: 0
      }]);

      try {
        const response = await fetch(test.endpoint);
        const data = await response.json();
        const responseTime = Date.now() - startTime;

        setResults(prev => prev.map(result => 
          result.endpoint === test.name 
            ? {
                endpoint: test.name,
                status: response.ok ? 'success' : 'error',
                message: response.ok 
                  ? data.message || `✅ ${test.name} successful`
                  : data.error || `❌ ${test.name} failed`,
                data: data,
                responseTime
              }
            : result
        ));
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        setResults(prev => prev.map(result => 
          result.endpoint === test.name 
            ? {
                endpoint: test.name,
                status: 'error',
                message: `❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                responseTime
              }
            : result
        ));
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
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
            <Globe className="h-5 w-5 text-blue-500" />
            WooCommerce REST API Test
          </CardTitle>
          <Button 
            onClick={runApiTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run API Tests
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {results.length === 0 && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Click "Run API Tests" to check your WooCommerce REST API connection</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.endpoint}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.responseTime !== undefined && (
                      <span className="text-xs text-gray-500">
                        {result.responseTime}ms
                      </span>
                    )}
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                
                {result.data && result.status === 'success' && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800 mb-2">
                      View Response Data
                    </summary>
                    <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-xs">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Connection Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">🔗 Current Configuration</h4>
          <div className="text-sm space-y-1 text-blue-700">
            <div><strong>Store URL:</strong> https://keylargoscubadiving.com</div>
            <div><strong>Consumer Key:</strong> ck_d2e4...f525 ✓</div>
            <div><strong>Consumer Secret:</strong> cs_4ec2...817d ✓</div>
            <div><strong>API Version:</strong> WooCommerce REST API v3</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
