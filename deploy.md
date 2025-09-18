# Fly.dev Deployment Guide

## Prerequisites

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login to Fly: `fly auth login`

## Initial Setup

1. **Initialize Fly app** (if not done):
   ```bash
   fly apps create booking-management
   ```

2. **Set environment variables**:
   ```bash
   fly secrets set WOOCOMMERCE_STORE_URL="https://keylargoscubadiving.com"
   fly secrets set WOOCOMMERCE_CONSUMER_KEY="your_consumer_key"
   fly secrets set WOOCOMMERCE_CONSUMER_SECRET="your_consumer_secret"
   fly secrets set NODE_ENV="production"
   ```

## Deploy

1. **Build and deploy**:
   ```bash
   fly deploy
   ```

2. **Check logs**:
   ```bash
   fly logs
   ```

3. **Check app status**:
   ```bash
   fly status
   ```

## Troubleshooting

### If API endpoints are not working:

1. **Check if app is running**:
   ```bash
   fly status
   ```

2. **Check logs for errors**:
   ```bash
   fly logs -a booking-management
   ```

3. **Restart the app**:
   ```bash
   fly restart
   ```

4. **Test endpoints directly**:
   ```bash
   curl https://your-app.fly.dev/api/health
   curl https://your-app.fly.dev/api/ping
   ```

### Common Issues:

1. **Failed to fetch errors**: Usually means the server isn't responding
   - Check if the app is running: `fly status`
   - Check for build errors: `fly logs`
   - Verify environment variables: `fly secrets list`

2. **Server not starting**: 
   - Check Dockerfile build process
   - Ensure dependencies are installed correctly
   - Verify start command in package.json

3. **Port binding issues**:
   - Ensure server binds to `0.0.0.0:3000`
   - Check fly.toml port configuration

## Architecture

The app is deployed as a single container that:
1. Serves the React SPA on all non-API routes
2. Handles API requests on `/api/*` routes
3. Uses Express.js for the backend
4. Connects to WooCommerce REST API

## Files Structure

- `Dockerfile`: Container build instructions
- `fly.toml`: Fly.dev configuration
- `server/node-build.ts`: Production server entry point
- `dist/spa/`: Built React application
- `dist/server/`: Built Node.js server
