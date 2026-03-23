#!/bin/bash

# Start Python CSP solver in background
echo "Starting CSP Solver on port 8001..."
CSP_PORT=8001 python3 artifacts/csp-solver/main.py &

# Wait for solver to be ready
sleep 5

# Start Node.js API server
echo "Starting API Server on port 8080..."
cd artifacts/api-server && node --enable-source-maps dist/index.mjs