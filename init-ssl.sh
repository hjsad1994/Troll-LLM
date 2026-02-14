#!/bin/bash

# Script to initialize SSL certificates with Let's Encrypt
# Run this ONCE on first deployment

DOMAIN="trollllm.xyz"
EMAIL="admin@trollllm.xyz"  # Change this to your email

# Create directories
mkdir -p certbot/conf certbot/www

# Create temporary nginx config for initial certificate
cat > nginx/nginx-init.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name trollllm.xyz www.trollllm.xyz api.trollllm.xyz chat.trollllm.xyz chat2.trollllm.xyz chat-priority.trolllm.xyz chat-priority.trollllm.xyz;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'TrollLLM - Setting up SSL...';
            add_header Content-Type text/plain;
        }
    }
}
EOF

echo "=== Step 1: Starting temporary nginx for SSL verification ==="
docker run -d --name nginx-init \
    -p 80:80 \
    -v $(pwd)/nginx/nginx-init.conf:/etc/nginx/nginx.conf:ro \
    -v $(pwd)/certbot/www:/var/www/certbot:ro \
    nginx:alpine

sleep 5

echo "=== Step 2: Requesting SSL certificate ==="
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN \
    -d api.$DOMAIN \
    -d chat.$DOMAIN \
    -d chat2.$DOMAIN \
    -d chat-priority.trolllm.xyz \
    -d chat-priority.$DOMAIN

echo "=== Step 3: Stopping temporary nginx ==="
docker stop nginx-init
docker rm nginx-init
rm nginx/nginx-init.conf

echo "=== SSL Certificate setup complete! ==="
echo "Now run: docker compose -f docker-compose.prod.yml up -d"
