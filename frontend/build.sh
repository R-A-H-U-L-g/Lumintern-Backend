#!/bin/bash
# ====================
# LUMINTERN Frontend Build Script
# ====================
# This script replaces environment variable placeholders with actual values

echo "🔧 Building LUMINTERN Frontend..."

# Get the API URL from environment variable
API_URL="${VITE_API_URL:-http://localhost:10000}"

echo "📡 API URL: $API_URL"

# Replace placeholder in config.js
sed -i "s|%%API_URL%%|${API_URL}|g" config.js

echo "✅ Build complete!"
echo "📁 Files ready for deployment"