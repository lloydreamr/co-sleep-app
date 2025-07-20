#!/bin/bash

echo "🔍 Testing Hence Server Connections..."
echo "====================================="

# Test local HTTPS
echo "📱 Testing local HTTPS..."
if curl -k -s https://localhost:3000/health > /dev/null; then
    echo "✅ Local HTTPS: https://localhost:3000 - WORKING"
else
    echo "❌ Local HTTPS: https://localhost:3000 - FAILED"
fi

# Test network HTTPS
echo "📱 Testing network HTTPS..."
if curl -k -s https://10.0.0.31:3000/health > /dev/null; then
    echo "✅ Network HTTPS: https://10.0.0.31:3000 - WORKING"
else
    echo "❌ Network HTTPS: https://10.0.0.31:3000 - FAILED"
fi

# Test local HTTP (should fail)
echo "📱 Testing local HTTP (should fail)..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "⚠️  Local HTTP: http://localhost:3000 - WORKING (unexpected)"
else
    echo "✅ Local HTTP: http://localhost:3000 - FAILED (expected)"
fi

# Test network HTTP (should fail)
echo "📱 Testing network HTTP (should fail)..."
if curl -s http://10.0.0.31:3000/health > /dev/null 2>&1; then
    echo "⚠️  Network HTTP: http://10.0.0.31:3000 - WORKING (unexpected)"
else
    echo "✅ Network HTTP: http://10.0.0.31:3000 - FAILED (expected)"
fi

echo ""
echo "📋 Troubleshooting Tips:"
echo "1. Make sure your phone is on the same WiFi network"
echo "2. Try accessing https://10.0.0.31:3000 on your mobile browser"
echo "3. Accept the security warning (it's safe for development)"
echo "4. If it still doesn't work, try restarting your WiFi router"
echo "5. Check if your computer's firewall is blocking port 3000" 