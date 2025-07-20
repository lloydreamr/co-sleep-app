#!/bin/bash

echo "🔐 Generating SSL certificates for HTTPS development..."
echo "====================================================="

# Create certs directory
mkdir -p certs

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Hence/CN=localhost"

if [ $? -eq 0 ]; then
    echo "✅ SSL certificates generated successfully!"
    echo "📁 Certificates saved in: certs/"
    echo ""
    echo "🚀 You can now start the HTTPS server with:"
    echo "   npm run start:https"
    echo ""
    echo "📱 Mobile URL will be: https://10.0.0.31:3000"
    echo "🔒 HTTPS is required for mobile microphone access"
else
    echo "❌ Failed to generate certificates. Please check if OpenSSL is installed."
    echo "   On macOS: brew install openssl"
    echo "   On Ubuntu: sudo apt-get install openssl"
fi 