#!/bin/bash

# Deployment verification script for Fly.dev

echo "🔍 Checking Fly.dev deployment..."

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not found. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Get app name from fly.toml
APP_NAME=$(grep 'app = ' fly.toml | cut -d'"' -f2)
echo "📱 App name: $APP_NAME"

# Check app status
echo "🔄 Checking app status..."
fly status -a $APP_NAME

# Check if app is running
if fly status -a $APP_NAME | grep -q "running"; then
    echo "��� App is running"
    
    # Test API endpoints
    APP_URL="https://$APP_NAME.fly.dev"
    echo "🌐 Testing endpoints at $APP_URL"
    
    echo "🏓 Testing ping endpoint..."
    if curl -s "$APP_URL/api/ping" | grep -q "pong"; then
        echo "✅ Ping endpoint working"
    else
        echo "❌ Ping endpoint failed"
    fi
    
    echo "🔧 Testing health endpoint..."
    if curl -s "$APP_URL/api/health" | grep -q "ok"; then
        echo "✅ Health endpoint working"
    else
        echo "❌ Health endpoint failed"
    fi
    
    echo "🛒 Testing WooCommerce endpoint..."
    if curl -s "$APP_URL/api/woocommerce/test" | grep -q "success"; then
        echo "✅ WooCommerce endpoint working"
    else
        echo "❌ WooCommerce endpoint failed"
    fi
    
else
    echo "❌ App is not running"
    echo "📋 Recent logs:"
    fly logs -a $APP_NAME --lines=20
fi

echo "✅ Deployment check complete"
