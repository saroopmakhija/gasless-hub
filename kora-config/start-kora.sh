#!/bin/bash
# Start Kora RPC Server for Gasless Hub

echo "🚀 Starting Kora RPC Server for Devnet..."
echo "Fee Payer: CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU"
echo ""

# Check if fee payer has SOL
echo "Checking fee payer balance on devnet..."
solana balance CrcUrpw22y5Fwum4jRBPBiMcw98FWKgsQFGEpYsFNPgU --url https://api.devnet.solana.com

echo ""
echo "Starting Kora on http://localhost:8080 (connected to Devnet)"
echo "Ctrl+C to stop"
echo ""

# Export fee payer key (base58, expected by kora signer)
export KORA_FEE_PAYER_KEY="3bGZdf1z4yWQfEP66XmpzxbXPE9uKUyrKJ2kKT9YML37Ch1hZ8kEVX2u1FTiQ7hmK5UHjeKp9NPTmdQBMuzmwsSp"
# Force RPC to devnet (avoid defaulting to local validator). Kora reads RPC_URL.
export RPC_URL="https://api.devnet.solana.com"
# Verbose logging including Solana program logs for simulation traces
export RUST_LOG="debug,solana_program=debug,kora_lib::rpc_server=debug"

# Start Kora RPC connected to Devnet (RPC URL configured in kora.toml)
cd /Users/saroopmakhija/gasless-hub/kora-config
kora rpc start --signers-config signers.toml
