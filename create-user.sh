#!/bin/bash

# Prompt for username and password
echo -n "Enter username: "
read -r USERNAME
echo -n "Enter password: "
stty -echo
read -r PASSWORD
stty echo
echo

# Hash the password (SHA-256 then SHA-512 using OpenSSL)
SHA256_HASH=$(echo -n "$PASSWORD" | openssl dgst -sha256 -hex | awk '{print $NF}')
HASHED_PASSWORD=$(echo -n "$SHA256_HASH" | openssl dgst -sha512 -hex | awk '{print $NF}')

# Write to .env file
echo "CONFIG_PANEL_USERNAME=$USERNAME" > .env
echo "CONFIG_PANEL_PASSWORD=$HASHED_PASSWORD" >> .env

echo ".env file created successfully."