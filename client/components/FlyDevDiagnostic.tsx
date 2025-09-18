import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Play,
  Cloud,
  AlertTriangle,
  Server,
  Globe
} from "lucide-react";

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'testing';
  message: string;
  details?: any;
  responseTime?: number;
}

export function FlyDevDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runFlyDevDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    
    const isFlyDev = window.location.hostname.includes('fly.dev');
    const baseUrl = window.location.origin;
    
    const tests = [
      {
        name: 'Environment Detection',
        test: async () => {
          const envInfo = {
            hostname: window.location.hostname,
            origin: window.location.origin,
            protocol: window.location.protocol,
            port: window.location.port,
            isFlyDev,
            timestamp: new Date().toISOString()
          };
          
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            url: 'environment-check',
            headers: new Headers({'content-type': 'application/json'}),
            json: async () => ({ environment: envInfo })
          };
        }
      },
      {
        name: 'Direct API Ping (Absolute URL)',
        test: () => fetch(`${baseUrl}/api/ping`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        })
      },
      {
        name: 'Direct API Ping (Relative URL)',
        test: () => fetch('/api/ping', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        })
      },
      {
        name: 'Health Check Endpoint',
        test: () => fetch('/api/health', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        })
      },
      {
        name: 'WooCommerce Test Endpoint',
        test: () => fetch('/api/woocommerce/test', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        })
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
        console.log(`🔍 Running Fly.dev diagnostic: ${test.name}`);
        const response = await test.test();
        const responseTime = Date.now() - startTime;
        
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
            data = { error: 'Non-JSON response', text: text.substring(0, 500) };
          } catch (textError) {
            data = { error: 'Could not read response', details: textError.message };
          }
          message = response.ok 
            ? `⚠️ ${test.name} non-JSON response`
            : `❌ ${test.name} failed (${response.status})`;
        }

        setResults(prev => prev.map(result => 
          result.test === test.name 
            ? {
                test: test.name,
                status: response.ok ? 'success' : 'error',
                message,
                details: {
                  status: response.status,
                  statusText: response.statusText,
                  url: response.url,
                  headers: response.headers ? Object.fromEntries(response.headers.entries()) : {},
                  data
                },
                responseTime
              }
            : result
        ));
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        console.error(`🚨 Fly.dev diagnostic ${test.name} failed:`, error);
        
        let diagnosis = '';
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          diagnosis = 'Network/Server Error - API endpoints not reachable';
        } else if (error instanceof TypeError && error.message.includes('NetworkError')) {
          diagnosis = 'Network connectivity issue';
        } else {
          diagnosis = 'Unknown error occurred';
        }
        
        setResults(prev => prev.map(result => 
          result.test === test.name 
            ? {
                test: test.name,
                status: 'error',
                message: `❌ ${diagnosis}`,
                details: {
                  error: error instanceof Error ? error.message : String(error),
                  diagnosis,
                  environment: {
                    hostname: window.location.hostname,
                    origin: window.location.origin,
                    isFlyDev,
                    userAgent: navigator.userAgent
                  }
                },
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

  const isFlyDev = window.location.hostname.includes('fly.dev');

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-purple-500" />
            Fly.dev Deployment Diagnostic
            {isFlyDev ? (
              <Badge className="bg-purple-100 text-purple-800">
                <Cloud className="h-3 w-3 mr-1" />
                Fly.dev
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800">
                <Server className="h-3 w-3 mr-1" />
                Local
              </Badge>
            )}
          </CardTitle>
          <Button 
            onClick={runFlyDevDiagnostics} 
            disabled={isRunning}
            className="flex items-center gap-2"
            variant={isFlyDev ? "destructive" : "default"}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Diagnosing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Fly.dev Test
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {!isFlyDev && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Local Environment Detected</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              This diagnostic is designed for Fly.dev production issues. You're currently running locally.
            </p>
          </div>
        )}

        {results.length === 0 && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <Cloud className="h-12 w-12 mx-auto mb-4 text-purple-300" />
            <p>Click "Run Fly.dev Test" to diagnose deployment connectivity</p>
            <p className="text-xs mt-2">Tests API endpoint accessibility in Fly.dev environment</p>
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

        {/* Fly.dev specific info */}
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Fly.dev Deployment Information
          </h4>
          <div className="text-sm space-y-1 text-purple-700">
            <div><strong>Current Host:</strong> {window.location.hostname}</div>
            <div><strong>Origin:</strong> {window.location.origin}</div>
            <div><strong>Protocol:</strong> {window.location.protocol}</div>
            <div><strong>Is Fly.dev:</strong> {isFlyDev ? 'Yes' : 'No'}</div>
            {isFlyDev && (
              <div className="mt-2 p-2 bg-purple-100 rounded text-purple-800">
                <strong>⚠️ Production Issue:</strong> API endpoints are not responding. 
                This suggests the server is not properly configured in Fly.dev.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
