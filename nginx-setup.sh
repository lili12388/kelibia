#!/bin/bash

# Nginx setup script for Darna
echo "🌐 Setting up Nginx reverse proxy..."

# Install Nginx
sudo apt update
sudo apt install -y nginx

# Create Nginx configuration for Darna
sudo tee /etc/nginx/sites-available/darna > /dev/null <<EOF
server {
    listen 80;
    server_name _;  # Accept any domain/IP

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Serve uploaded files directly
    location /uploads {
        alias /var/www/darna/public/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Remove default Nginx site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable Darna site
sudo ln -sf /etc/nginx/sites-available/darna /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

if [ $? -eq 0 ]; then
    # Restart Nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    # Open firewall for HTTP
    sudo ufw allow 'Nginx Full'
    
    echo "✅ Nginx setup complete!"
    echo "🌐 Your website will be accessible at: http://your-server-ip"
    echo "🔧 Node.js app runs on port 5000, Nginx proxies it to port 80"
else
    echo "❌ Nginx configuration test failed!"
    exit 1
fi
