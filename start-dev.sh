#!/bin/bash

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down..."

    # Kill all child processes
    pkill -P $$ 2>/dev/null

    # Force kill tsx and vite-node processes
    pkill -9 -f "tsx watch" 2>/dev/null
    pkill -9 -f "vite-node" 2>/dev/null
    pkill -9 -f concurrently 2>/dev/null

    # Stop docker containers
    docker-compose down 2>/dev/null

    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Copy .env.example to .env if .env doesn't exist
echo "Checking environment files..."
if [ ! -f demo/merchant/.env ]; then
    echo "Creating demo/merchant/.env from demo/merchant/.env.example"
    cp demo/merchant/.env.example demo/merchant/.env
fi

if [ ! -f demo/psp/.env ]; then
    echo "Creating demo/psp/.env from demo/psp/.env.example"
    cp demo/psp/.env.example demo/psp/.env
fi

if [ ! -f demo/mcp-ui-server/.env ]; then
    echo "Creating demo/mcp-ui-server/.env from demo/mcp-ui-server/.env.example"
    cp demo/mcp-ui-server/.env.example demo/mcp-ui-server/.env
fi

# Clean up and start containers
docker-compose down -v
docker-compose up -d --wait

# Start all services
concurrently -n MCP,MERCHANT,PSP -c cyan,green,yellow \
    "cd demo/mcp-ui-server && npm run dev" \
    "cd demo/merchant && npm run seed && npm run dev" \
    "cd demo/psp && npm run dev" &

# Wait for background process
wait
