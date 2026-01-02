#!/usr/bin/with-contenv bashio

# Get configuration
MONGODB_URI=$(bashio::config 'mongodb_uri')
MONGODB_TIMEOUT=$(bashio::config 'mongodb_timeout')
NODE_ENV=$(bashio::config 'node_env')

# Export environment variables
export MONGODB_URI="${MONGODB_URI}"
export NODE_ENV="${NODE_ENV}"

bashio::log.info "Starting piSignage Server..."
bashio::log.info "MongoDB URI: ${MONGODB_URI}"
bashio::log.info "Node Environment: ${NODE_ENV}"
bashio::log.info "MongoDB Connection Timeout: ${MONGODB_TIMEOUT} seconds"

# Change to piSignage directory
cd /pisignage-server

# Extract MongoDB host and port from URI for wait-for-it
MONGO_HOST_PORT=$(echo "${MONGODB_URI}" | sed -E 's|mongodb://([^/]+)/.*|\1|')

bashio::log.info "Waiting for MongoDB at ${MONGO_HOST_PORT}..."

# Wait for MongoDB to be ready
./wait-for-it.sh "${MONGO_HOST_PORT}" --timeout="${MONGODB_TIMEOUT}" -- bashio::log.info "MongoDB is ready!"

# Start the server
bashio::log.info "Launching piSignage Server..."
exec node server.js