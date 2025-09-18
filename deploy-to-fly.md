# Deploy to Fly.dev

## The Issue
Your local development works perfectly, but the Fly.dev production deployment is showing "Failed to fetch" errors because it doesn't have the latest changes.

## Solution: Redeploy to Fly.dev

### Option 1: Quick Deploy (Recommended)
```bash
fly deploy
```

### Option 2: If you need to rebuild everything
```bash
# Build locally first
npm run build

# Then deploy
fly deploy
```

### Option 3: Check current deployment status
```bash
# Check if app is running
fly status

# Check logs
fly logs

# Restart if needed
fly restart
```

## What This Will Fix

The deployment will include:
✅ **Correct booking endpoint**: `wc-bookings/v1/bookings`
✅ **Fixed API routing**: All endpoints properly configured  
✅ **Latest server code**: Including the endpoint discovery fixes
✅ **Production build**: Optimized client and server code

## After Deployment

Your calendar should work with:
- ✅ Real WooCommerce bookings displayed
- ✅ No more "Failed to fetch" errors
- ✅ Live booking data from your site

## If Still Having Issues

1. Check deployment logs: `fly logs`
2. Verify environment variables: `fly secrets list`
3. Test API directly: `curl https://your-app.fly.dev/api/health`

---

**The key point**: Your setup is correct and working locally. We just need to get the latest code deployed to production.
