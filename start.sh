#!/bin/bash
echo "Starting Lavalink..."
java -jar Lavalink.jar &

# Wait for Lavalink to be ready (naive check)
echo "Waiting for Lavalink to start..."
sleep 10

echo "Starting Node.js Application..."
npm start