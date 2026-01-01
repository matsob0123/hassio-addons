#!/usr/bin/with-contenv bashio

bashio::log.info "Uruchamianie bazy danych MongoDB..."
mkdir -p /data/db
mongod --fork --logpath /var/log/mongodb.log --dbpath /data/db

bashio::log.info "Uruchamianie serwera piSignage na porcie 8000..."
# Ustawienie zmiennych środowiskowych jeśli potrzebne
export PORT=8000
npm start