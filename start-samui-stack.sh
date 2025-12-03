#!/bin/bash

# Gasless Hub + Samui Wallet Start Script

echo "🚀 Starting Gasless Hub Stack with Samui Wallet..."

# Export paths
export PATH="/Users/saroopmakhija/.local/share/solana/install/active_release/bin:$PATH"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export ANCHOR_WALLET=~/.config/solana/id.json

# 1. Start Backend API
echo "📡 Starting Backend API..."
cd backend
node server.js &
BACKEND_PID=$!
cd ..

# 2. Start Kora RPC
echo "⚡ Starting Kora RPC..."
cd kora-config
./start-kora.sh &
KORA_PID=$!
cd ..

# 3. Start Samui Wallet
echo "💼 Starting Samui Wallet..."
cd samui-wallet
bun --filter=web dev &
SAMUI_PID=$!
cd ..

echo ""
echo "✅ All services started!"
echo "📡 Backend API: http://localhost:3001"
echo "⚡ Kora RPC: http://localhost:8080"
echo "💼 Samui Wallet: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and cleanup on exit
trap "kill $BACKEND_PID $KORA_PID $SAMUI_PID 2>/dev/null; exit" INT TERM
wait
