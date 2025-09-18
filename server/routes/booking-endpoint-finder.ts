import { RequestHandler } from "express";
import { WooCommerceConfig } from "@shared/woocommerce";

// WooCommerce configuration from environment variables
const getWooConfig = (): WooCommerceConfig => {
  const url = process.env.WOOCOMMERCE_STORE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) {
    throw new Error('Missing WooCommerce configuration.');
  }

  return { url, consumerKey, consumerSecret };
};

// Test multiple possible booking endpoints
export const findBookingEndpoints: RequestHandler = async (req, res) => {
  try {
    const config = getWooConfig();
    console.log('🔍 Searching for working booking endpoints...');
    
    const endpointsToTest = [
      // Standard WooCommerce endpoints
      'wc/v3/bookings',
      'wc/v2/bookings', 
      'wc/v1/bookings',
      
      // WooCommerce Bookings plugin endpoints
      'wc-bookings/v1/bookings',
      'wc-bookings/v2/bookings',
      'wc-bookings/bookings',
      
      // Alternative endpoints
      'bookings/v1/bookings',
      'bookings',
      'booking',
      
      // Custom endpoints some setups use
      'wp/v2/bookings',
      'custom/bookings',
      
      // Check what endpoints are actually available
      '',  // Root to see available endpoints
    ];

    const results: any[] = [];

    for (const endpoint of endpointsToTest) {
      const testUrl = endpoint 
        ? `${config.url}/wp-json/${endpoint}?consumer_key=${config.consumerKey}&consumer_secret=${config.consumerSecret}&per_page=1`
        : `${config.url}/wp-json/?consumer_key=${config.consumerKey}&consumer_secret=${config.consumerSecret}`;
      
      console.log(`Testing: ${testUrl}`);
      
      try {
        const response = await fetch(testUrl);
        const data = await response.json();
        
        const result = {
          endpoint: endpoint || 'root',
          url: testUrl,
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          dataType: Array.isArray(data) ? 'array' : typeof data,
          itemCount: Array.isArray(data) ? data.length : 0,
          hasBookingData: false,
          sampleData: null
        };

        // Check if this looks like booking data
        if (Array.isArray(data) && data.length > 0) {
          const firstItem = data[0];
          if (firstItem.id && (firstItem.start || firstItem.booking_start || firstItem.date_created)) {
            result.hasBookingData = true;
            result.sampleData = {
              id: firstItem.id,
              start: firstItem.start || firstItem.booking_start || firstItem.date_created,
              status: firstItem.status,
              customer_id: firstItem.customer_id,
              product_id: firstItem.product_id
            };
          }
        }

        // For root endpoint, check what namespaces are available
        if (!endpoint && data.namespaces) {
          result.availableNamespaces = data.namespaces;
        }

        results.push(result);
        
        if (result.hasBookingData) {
          console.log(`✅ Found booking data at: ${endpoint}`);
        }
        
      } catch (error) {
        results.push({
          endpoint: endpoint || 'root',
          url: testUrl,
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Find the best endpoints
    const workingEndpoints = results.filter(r => r.success);
    const bookingEndpoints = results.filter(r => r.hasBookingData);
    
    console.log(`📊 Results: ${workingEndpoints.length} working endpoints, ${bookingEndpoints.length} with booking data`);

    res.json({
      success: true,
      message: `Tested ${endpointsToTest.length} potential booking endpoints`,
      summary: {
        total_tested: endpointsToTest.length,
        working_endpoints: workingEndpoints.length,
        booking_endpoints: bookingEndpoints.length,
        store_url: config.url
      },
      working_endpoints: workingEndpoints,
      booking_endpoints: bookingEndpoints,
      all_results: results
    });

  } catch (error) {
    console.error('❌ Error testing booking endpoints:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test endpoints'
    });
  }
};

// Test a specific endpoint with detailed logging
export const testSpecificEndpoint: RequestHandler = async (req, res) => {
  try {
    const { endpoint } = req.query;
    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please provide an endpoint parameter'
      });
    }

    const config = getWooConfig();
    const testUrl = `${config.url}/wp-json/${endpoint}?consumer_key=${config.consumerKey}&consumer_secret=${config.consumerSecret}&per_page=10`;
    
    console.log(`🔍 Testing specific endpoint: ${testUrl}`);
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    const result = {
      endpoint,
      url: testUrl,
      status: response.status,
      statusText: response.statusText,
      success: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      dataType: Array.isArray(data) ? 'array' : typeof data,
      itemCount: Array.isArray(data) ? data.length : 0,
      fullData: data
    };

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('❌ Error testing specific endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test endpoint'
    });
  }
};
