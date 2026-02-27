# Stage 1: Build the application
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the client and server
RUN npm run build

# Stage 2: Runtime
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies (Java 17 for Lavalink)
RUN apt-get update && apt-get install -y \
    openjdk-17-jre-headless \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Lavalink
RUN curl -L https://github.com/lavalink-devs/Lavalink/releases/download/4.0.8/Lavalink.jar -o Lavalink.jar

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY application.yml ./
COPY start.sh ./

# Install only production dependencies
RUN npm install --omit=dev
RUN chmod +x start.sh

# Expose the port the app runs on (Cloud Run uses 8080 by default)
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Start the application using start.sh wrapper
CMD ["./start.sh"]
