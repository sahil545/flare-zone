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
  Server,
  Wifi
} from "lucide-react";

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'testing';
  message: string;
  details?: any;
  responseTime?: number;
}

export function NetworkDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    
    const tests = [
      {
        name: 'Basic Connectivity',
        test: () => fetch('/api/ping'),
        icon: Wifi
      },
      {
        name: 'Health Check',
        test: () => fetch('/api/health'),
        icon: Server
      },
      {
        name: 'WooCommerce Test',
        test: () => fetch('/api/woocommerce/test'),
        icon: Globe
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
        console.log(`Running diagnostic: ${test.name}`);
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
          data = { error: 'Invalid JSON response' };
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
                  status: response.status,
                  statusText: response.statusText,
                  headers: Object.fromEntries(response.headers.entries()),
                  data
                },
                responseTime
              }
            : result
        ));
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        console.error(`Diagnostic ${test.name} failed:`, error);
        
        setResults(prev => prev.map(result => 
          result.test === test.name 
            ? {
                test: test.name,
                status: 'error',
                message: `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                details: {
                  error: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                  } : String(error),
                  currentUrl: window.location.href,
                  baseUrl: window.location.origin
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-blue-500" />
            Network Diagnostic
          </CardTitle>
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Diagnostics
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {results.length === 0 && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <Wifi className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Click "Run Diagnostics" to test network connectivity</p>
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

        {/* Environment Info */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">🌐 Environment Information</h4>
          <div className="text-sm space-y-1 text-gray-700">
            <div><strong>Current URL:</strong> {window.location.href}</div>
            <div><strong>Origin:</strong> {window.location.origin}</div>
            <div><strong>Protocol:</strong> {window.location.protocol}</div>
            <div><strong>Host:</strong> {window.location.host}</div>
            <div><strong>User Agent:</strong> {navigator.userAgent}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
