#!/bin/bash
# Start all Gasless Hub services

echo "🚀 Starting Gasless Hub..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to start service in new terminal (macOS)
start_service() {
    local name=$1
    local command=$2
    echo -e "${BLUE}Starting $name...${NC}"
    osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && $command\"" &
    sleep 1
}

# Check if Kora fee payer has SOL
echo "Checking Kora fee payer balance..."
export PATH="/Users/saroopmakhija/.local/share/solana/install/active_release/bin:$PATH"
BALANCE=$(solana balance -k kora-config/fee-payer.json --url devnet 2>/dev/null | awk '{print $1}')

if [ -z "$BALANCE" ] || (( $(echo "$BALANCE < 1" | bc -l) )); then
    echo "⚠️  Kora fee payer needs SOL!"
    echo "   Address: CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU"
    echo "   Get SOL: https://faucet.solana.com"
    echo ""
fi

# Start services
start_service "Kora RPC" "cd kora-config && ./start-kora.sh"
sleep 2

start_service "Backend API" "cd backend && npm start"
sleep 2

start_service "Frontend" "cd frontend && npm run dev"

echo ""
echo -e "${GREEN}✅ All services starting!${NC}"
echo ""
echo "📊 Access points:"
echo "   Frontend:  http://localhost:3000"
echo "   Kora RPC:  http://localhost:8080"
echo "   Backend:   http://localhost:3001"
echo ""
echo "Press Ctrl+C in each terminal to stop services"
