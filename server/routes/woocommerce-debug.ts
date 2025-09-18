import { RequestHandler } from "express";
import { WooCommerceConfig } from "@shared/woocommerce";

// WooCommerce configuration from environment variables
const getWooConfig = (): WooCommerceConfig => {
  const url = process.env.WOOCOMMERCE_STORE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) {
    throw new Error('Missing WooCommerce configuration. Please set WOOCOMMERCE_STORE_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET environment variables.');
  }

  return { url, consumerKey, consumerSecret };
};

// Create WooCommerce API URL with authentication
const createApiUrl = (endpoint: string, params: Record<string, string> = {}): string => {
  const config = getWooConfig();
  const url = new URL(`${config.url}/wp-json/wc/v3/${endpoint}`);
  
  // Add authentication parameters
  url.searchParams.append('consumer_key', config.consumerKey);
  url.searchParams.append('consumer_secret', config.consumerSecret);
  
  // Add additional parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  return url.toString();
};

// Test basic WooCommerce connection
export const testWooConnection: RequestHandler = async (req, res) => {
  try {
    const config = getWooConfig();
    
    // Test basic products endpoint first
    const productsUrl = createApiUrl('products', { per_page: '1' });
    console.log('Testing WooCommerce URL:', productsUrl);
    
    const response = await fetch(productsUrl);
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `WooCommerce API Error: ${response.status} - ${data.message || JSON.stringify(data)}`,
        url: config.url,
        endpoint: 'products',
        statusCode: response.status
      });
    }
    
    res.json({
      success: true,
      message: 'WooCommerce connection successful',
      url: config.url,
      productsCount: Array.isArray(data) ? data.length : 0,
      sampleProduct: Array.isArray(data) && data.length > 0 ? {
        id: data[0].id,
        name: data[0].name,
        type: data[0].type
      } : null
    });
  } catch (error) {
    console.error('WooCommerce connection test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
    });
  }
};

// Test different booking endpoints
export const testBookingEndpoints: RequestHandler = async (req, res) => {
  try {
    const config = getWooConfig();
    const results: any[] = [];
    
    // List of possible booking endpoints to test
    const endpointsToTest = [
      'bookings',
      'booking',
      'wc-bookings/v1/bookings',
      'bookable-products',
      'products?type=booking'
    ];
    
    for (const endpoint of endpointsToTest) {
      try {
        let url: string;
        if (endpoint.startsWith('wc-bookings')) {
          // Try WC Bookings plugin specific endpoint
          url = `${config.url}/wp-json/${endpoint}?consumer_key=${config.consumerKey}&consumer_secret=${config.consumerSecret}&per_page=1`;
        } else {
          url = createApiUrl(endpoint, { per_page: '1' });
        }
        
        console.log(`Testing endpoint: ${endpoint} - ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        results.push({
          endpoint,
          status: response.status,
          success: response.ok,
          url,
          data: response.ok ? (Array.isArray(data) ? `Array with ${data.length} items` : typeof data) : data,
          error: !response.ok ? data.message || 'Unknown error' : null
        });
      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          success: false,
          error: error instanceof Error ? error.message : 'Request failed'
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Booking endpoints test completed',
      store_url: config.url,
      results
    });
  } catch (error) {
    console.error('Booking endpoints test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
    });
  }
};

// Get WooCommerce system status for debugging
export const getSystemStatus: RequestHandler = async (req, res) => {
  try {
    const config = getWooConfig();
    
    // Test system status endpoint
    const systemUrl = createApiUrl('system_status');
    console.log('Getting system status:', systemUrl);
    
    const response = await fetch(systemUrl);
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `WooCommerce API Error: ${response.status} - ${data.message || JSON.stringify(data)}`,
        statusCode: response.status
      });
    }
    
    // Extract relevant info
    const relevantInfo = {
      wordpress_version: data.environment?.wp_version,
      woocommerce_version: data.environment?.version,
      active_plugins: data.active_plugins?.filter((plugin: any) => 
        plugin.plugin.toLowerCase().includes('booking') || 
        plugin.plugin.toLowerCase().includes('woocommerce')
      ),
      theme: data.theme?.name,
      settings: {
        api_enabled: data.settings?.api_enabled,
        currency: data.settings?.currency,
        timezone: data.settings?.timezone
      }
    };
    
    res.json({
      success: true,
      message: 'System status retrieved',
      data: relevantInfo,
      full_data: data
    });
  } catch (error) {
    console.error('System status failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'System status failed',
    });
  }
};
