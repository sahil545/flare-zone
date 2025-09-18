import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Play,
  Search,
  Database,
  Target,
  AlertTriangle
} from "lucide-react";

interface EndpointResult {
  endpoint: string;
  status: number;
  success: boolean;
  hasBookingData: boolean;
  itemCount: number;
  sampleData?: any;
  error?: string;
}

export function BookingEndpointFinder() {
  const [results, setResults] = useState<EndpointResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const findEndpoints = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);
    
    try {
      const response = await fetch('/api/debug/find-booking-endpoints');
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.summary);
        setResults(data.all_results || []);
        
        // Log the working endpoints
        if (data.booking_endpoints.length > 0) {
          console.log('🎉 Found working booking endpoints:', data.booking_endpoints);
        }
      } else {
        console.error('❌ Endpoint discovery failed:', data.error);
      }
      
    } catch (error) {
      console.error('❌ Failed to discover endpoints:', error);
    }
    
    setIsRunning(false);
  };

  const getStatusIcon = (result: EndpointResult) => {
    if (result.hasBookingData) {
      return <Target className="h-4 w-4 text-green-500" />;
    } else if (result.success) {
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (result: EndpointResult) => {
    if (result.hasBookingData) {
      return 'bg-green-100 text-green-800';
    } else if (result.success) {
      return 'bg-blue-100 text-blue-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  };

  const getStatusText = (result: EndpointResult) => {
    if (result.hasBookingData) {
      return 'Has Bookings!';
    } else if (result.success) {
      return 'Working';
    } else {
      return 'Failed';
    }
  };

  const bookingEndpoints = results.filter(r => r.hasBookingData);
  const workingEndpoints = results.filter(r => r.success && !r.hasBookingData);
  const failedEndpoints = results.filter(r => !r.success);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-green-500" />
            Booking Endpoint Discovery
            <Badge className="bg-green-100 text-green-800">
              Live Site
            </Badge>
          </CardTitle>
          <Button 
            onClick={findEndpoints} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Find Endpoints
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {results.length === 0 && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 text-green-300" />
            <p>Click "Find Endpoints" to discover your WooCommerce booking endpoints</p>
            <p className="text-xs mt-2">This will test multiple endpoints to find your actual bookings</p>
          </div>
        )}

        {summary && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Discovery Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-blue-700">Total Tested</div>
                <div className="text-blue-600">{summary.total_tested}</div>
              </div>
              <div>
                <div className="font-medium text-blue-700">Working</div>
                <div className="text-blue-600">{summary.working_endpoints}</div>
              </div>
              <div>
                <div className="font-medium text-green-700">With Bookings</div>
                <div className="text-green-600">{summary.booking_endpoints}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Store</div>
                <div className="text-gray-600 truncate">{summary.store_url}</div>
              </div>
            </div>
          </div>
        )}

        {/* Booking Endpoints */}
        {bookingEndpoints.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium text-green-800 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Found Booking Data! ({bookingEndpoints.length})
            </h3>
            <div className="space-y-3">
              {bookingEndpoints.map((result, index) => (
                <div key={index} className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result)}
                      <span className="font-medium text-green-800">{result.endpoint}</span>
                      <Badge className="bg-green-100 text-green-800">
                        {result.itemCount} bookings
                      </Badge>
                    </div>
                    <Badge className={getStatusColor(result)}>
                      {getStatusText(result)}
                    </Badge>
                  </div>
                  
                  {result.sampleData && (
                    <div className="mt-2 p-2 bg-white rounded border">
                      <div className="text-xs text-green-700">
                        <strong>Sample Booking:</strong>
                        <div className="mt-1">
                          ID: {result.sampleData.id} | 
                          Start: {result.sampleData.start} | 
                          Status: {result.sampleData.status}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Working Endpoints */}
        {workingEndpoints.length > 0 && bookingEndpoints.length === 0 && (
          <div className="mb-6">
            <h3 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Working Endpoints ({workingEndpoints.length})
            </h3>
            <div className="space-y-2">
              {workingEndpoints.slice(0, 5).map((result, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result)}
                      <span className="font-medium">{result.endpoint}</span>
                      {result.itemCount > 0 && (
                        <Badge variant="outline">
                          {result.itemCount} items
                        </Badge>
                      )}
                    </div>
                    <Badge className={getStatusColor(result)}>
                      {getStatusText(result)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Bookings Found Warning */}
        {results.length > 0 && bookingEndpoints.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">No Booking Data Found</span>
            </div>
            <p className="text-sm text-yellow-700">
              None of the tested endpoints returned booking data. This might mean:
            </p>
            <ul className="text-sm text-yellow-700 mt-2 ml-4 list-disc">
              <li>WooCommerce Bookings plugin isn't active</li>
              <li>No bookings have been created yet</li>
              <li>Bookings are stored in a custom endpoint</li>
              <li>Different API credentials are needed</li>
            </ul>
          </div>
        )}

        {/* Quick Guide */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">🎯 Goal</h4>
          <p className="text-sm text-gray-700">
            Find the correct WooCommerce endpoint that contains your actual booking data. 
            Once found, we'll use that endpoint to populate your calendar with real bookings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
