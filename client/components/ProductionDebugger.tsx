import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Play,
  Server,
  Globe,
  AlertTriangle
} from "lucide-react";

interface DebugResult {
  test: string;
  status: 'success' | 'error' | 'testing';
  message: string;
  details?: any;
  responseTime?: number;
}

export function ProductionDebugger() {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runProductionTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    const tests = [
      {
        name: 'Environment Check',
        test: async () => {
          // Create a proper Response-like object for environment check
          const envData = {
            environment: {
              hostname: window.location.hostname,
              protocol: window.location.protocol,
              port: window.location.port,
              origin: window.location.origin,
              userAgent: navigator.userAgent,
              isProduction: window.location.hostname.includes('fly.dev'),
              timestamp: new Date().toISOString()
            }
          };

          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            url: 'environment-check',
            headers: new Headers({'content-type': 'application/json'}),
            json: async () => envData,
            text: async () => JSON.stringify(envData)
          };
        }
      },
      {
        name: 'Direct API Test',
        test: async () => {
          // Try absolute URL first
          const absoluteUrl = `${window.location.origin}/api/ping`;
          console.log('Testing absolute URL:', absoluteUrl);
          return fetch(absoluteUrl);
        }
      },
      {
        name: 'Relative API Test',
        test: () => fetch('/api/ping')
      },
      {
        name: 'Health Check',
        test: () => fetch('/api/health')
      },
      {
        name: 'WooCommerce Test',
        test: () => fetch('/api/woocommerce/test')
      }
    ];

    for (const test of tests) {
      const startTime = Date.now();
      
      // Update status to testing
      setResults(prev => [...prev, {
        test: test.name,
        status: 'testing',
        message: 'Testing...',
        responseTime: 0
      }]);

      try {
        console.log(`Running production test: ${test.name}`);
        const response = await test.test();
        const responseTime = Date.now() - startTime;

        // Check if we got a valid response object
        if (!response) {
          throw new Error('No response received from server');
        }

        let data;
        let message;

        try {
          data = await response.json();
          message = response.ok
            ? `✅ ${test.name} successful (${response.status})`
            : `❌ ${test.name} failed (${response.status})`;
        } catch (jsonError) {
          try {
            const text = await response.text();
            data = { error: 'Invalid JSON response', text: text.substring(0, 200) };
          } catch (textError) {
            data = { error: 'Could not read response body', originalError: textError.message };
          }
          message = response.ok
            ? `⚠️ ${test.name} returned non-JSON`
            : `❌ ${test.name} failed (${response.status})`;
        }

        setResults(prev => prev.map(result =>
          result.test === test.name
            ? {
                test: test.name,
                status: response.ok ? 'success' : 'error',
                message,
                details: {
                  status: response.status || 'unknown',
                  statusText: response.statusText || 'unknown',
                  url: response.url || 'unknown',
                  headers: response.headers ? Object.fromEntries(response.headers.entries()) : {},
                  data
                },
                responseTime
              }
            : result
        ));
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        console.error(`Production test ${test.name} failed:`, error);
        
        let errorDetails = {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : String(error),
          currentUrl: window.location.href,
          baseUrl: window.location.origin,
          timestamp: new Date().toISOString()
        };

        // Add specific diagnostics for TypeError: Failed to fetch
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          errorDetails = {
            ...errorDetails,
            diagnosis: {
              issue: 'Network connectivity failure',
              possibleCauses: [
                'Server not responding on the expected port',
                'API routes not properly registered in production',
                'CORS configuration issue',
                'Production build missing server components',
                'Network firewall or proxy blocking requests'
              ],
              troubleshooting: [
                'Check if server is running on correct port',
                'Verify API routes are registered in production build',
                'Check server logs for route registration',
                'Test direct server endpoint access'
              ]
            }
          };
        }
        
        setResults(prev => prev.map(result => 
          result.test === test.name 
            ? {
                test: test.name,
                status: 'error',
                message: `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                details: errorDetails,
                responseTime
              }
            : result
        ));
      }

      // Small delay between tests
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
            <Server className="h-5 w-5 text-red-500" />
            Production Debugger
            <Badge className="bg-red-100 text-red-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Error Mode
            </Badge>
          </CardTitle>
          <Button 
            onClick={runProductionTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
            variant="destructive"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Debugging...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Debug Production
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {results.length === 0 && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <Server className="h-12 w-12 mx-auto mb-4 text-red-300" />
            <p>Click "Debug Production" to diagnose the "Failed to fetch" errors</p>
            <p className="text-xs mt-2">This will test various aspects of the production deployment</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.test}</span>
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
                
                {result.details && (
                  <div className="space-y-2">
                    {/* Show diagnosis for errors */}
                    {result.details.diagnosis && (
                      <div className="bg-red-50 p-3 rounded-lg">
                        <h5 className="font-medium text-red-800 mb-2">🔍 Diagnosis</h5>
                        <p className="text-sm text-red-700 mb-2">{result.details.diagnosis.issue}</p>
                        
                        <div className="text-xs text-red-600">
                          <div className="mb-2">
                            <strong>Possible Causes:</strong>
                            <ul className="list-disc ml-4 mt-1">
                              {result.details.diagnosis.possibleCauses.map((cause: string, idx: number) => (
                                <li key={idx}>{cause}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <strong>Troubleshooting:</strong>
                            <ul className="list-disc ml-4 mt-1">
                              {result.details.diagnosis.troubleshooting.map((step: string, idx: number) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show environment info */}
                    {result.details.data?.environment && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h5 className="font-medium text-blue-800 mb-2">🌐 Environment</h5>
                        <div className="text-xs text-blue-700">
                          <div><strong>Host:</strong> {result.details.data.environment.hostname}</div>
                          <div><strong>Origin:</strong> {result.details.data.environment.origin}</div>
                          <div><strong>Production:</strong> {result.details.data.environment.isProduction ? 'Yes (Fly.dev)' : 'No'}</div>
                        </div>
                      </div>
                    )}

                    {/* Full details */}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800 mb-2">
                        View Full Details
                      </summary>
                      <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-xs">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Production Info */}
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-medium text-red-800 mb-2">🚨 Production Error Analysis</h4>
          <div className="text-sm space-y-1 text-red-700">
            <div><strong>Environment:</strong> Fly.dev deployment (production)</div>
            <div><strong>Issue:</strong> "Failed to fetch" errors on API requests</div>
            <div><strong>Status:</strong> Client-side requests not reaching server endpoints</div>
            <div><strong>Next Steps:</strong> Check server logs and verify API route registration</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
