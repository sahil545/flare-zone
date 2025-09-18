import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Play,
  Upload,
  Calendar,
  ShoppingCart,
  Database
} from "lucide-react";

interface PostTestResult {
  endpoint: string;
  status: 'success' | 'error' | 'testing';
  message: string;
  data?: any;
  responseTime?: number;
}

export function PostTestComponent() {
  const [results, setResults] = useState<PostTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testCount, setTestCount] = useState(5);

  const runPostTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    const tests = [
      {
        name: 'Fetch Recent Data',
        endpoint: `/api/woocommerce/recent-data?count=${testCount}`,
        icon: Database,
        method: 'GET'
      },
      {
        name: 'Test Post Bookings & Orders',
        endpoint: `/api/woocommerce/test-post?count=${testCount}`,
        icon: Upload,
        method: 'POST'
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
        const response = await fetch(test.endpoint, {
          method: test.method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
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

  const formatResults = (data: any) => {
    if (!data) return null;

    if (data.data && data.data.bookings && data.data.orders) {
      // Format recent data results
      return {
        bookings: {
          count: data.data.bookings.count,
          success: data.data.bookings.success,
          error: data.data.bookings.error
        },
        orders: {
          count: data.data.orders.count,
          success: data.data.orders.success,
          error: data.data.orders.error
        }
      };
    }

    if (data.summary) {
      // Format post test results
      return {
        summary: data.summary,
        details: data.details,
        note: data.note
      };
    }

    return data;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" />
            Post Test: Last {testCount} Bookings & Orders
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="count" className="text-sm font-medium">Count:</label>
              <select
                id="count"
                value={testCount}
                onChange={(e) => setTestCount(parseInt(e.target.value))}
                className="px-2 py-1 border rounded text-sm"
                disabled={isRunning}
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
            <Button 
              onClick={runPostTests} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Tests
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {results.length === 0 && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Click "Run Tests" to test posting the last {testCount} bookings and orders</p>
            <p className="text-xs mt-2">This will fetch recent data and simulate posting operations</p>
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
                  <div className="space-y-2">
                    {/* Summary for quick viewing */}
                    {result.data.summary && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h5 className="font-medium text-blue-800 mb-2">📊 Summary</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span>{result.data.summary.bookings}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-blue-600" />
                            <span>{result.data.summary.orders}</span>
                          </div>
                        </div>
                        {result.data.summary.total_errors > 0 && (
                          <div className="mt-2 text-red-600 text-sm">
                            ⚠️ {result.data.summary.total_errors} errors occurred
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recent data summary */}
                    {result.data.data && result.data.data.bookings && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <h5 className="font-medium text-green-800 mb-2">📋 Data Retrieved</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span>Bookings: {result.data.data.bookings.count} found</span>
                            {!result.data.data.bookings.success && (
                              <span className="text-red-500">❌</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-green-600" />
                            <span>Orders: {result.data.data.orders.count} found</span>
                            {!result.data.data.orders.success && (
                              <span className="text-red-500">❌</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Full details */}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800 mb-2">
                        View Full Response Data
                      </summary>
                      <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-xs">
                        {JSON.stringify(formatResults(result.data), null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Test Info */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-800 mb-2">ℹ️ Test Information</h4>
          <div className="text-sm space-y-1 text-amber-700">
            <div><strong>Purpose:</strong> Test posting last {testCount} bookings and orders</div>
            <div><strong>Mode:</strong> Simulation (no actual records created)</div>
            <div><strong>Endpoints:</strong> /api/woocommerce/recent-data, /api/woocommerce/test-post</div>
            <div><strong>Note:</strong> This validates data fetching and posting logic without creating duplicates</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
