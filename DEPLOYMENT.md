# TrollLLM Deployment Guide - Ubuntu 22.04

## Cấu trúc Domain
- `trollllm.xyz` - Frontend (Next.js)
- `api.trollllm.xyz` - Backend API (Node.js)
- `chat.trollllm.xyz` - LLM Proxy API (Go)

## Bước 1: Chuẩn bị VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Cài Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Logout và login lại để apply docker group
exit
# SSH lại vào VPS

# Verify Docker
docker --version
docker compose version

# Mở firewall
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

## Bước 2: Cấu hình DNS

Tại nhà cung cấp domain (Cloudflare, Namecheap, etc.), tạo các record:

| Type | Name | Value |
|------|------|-------|
| A | @ | IP_VPS |
| A | www | IP_VPS |
| A | api | IP_VPS |
| A | chat | IP_VPS |

**Lưu ý:** Nếu dùng Cloudflare, tắt proxy (grey cloud) khi lấy SSL certificate.

## Bước 3: Clone và cấu hình

```bash
# Clone repo
git clone <repo-url> /opt/trollllm
cd /opt/trollllm

# Tạo file .env từ example
cp .env.production.example .env

# Chỉnh sửa .env
nano .env
```

**Nội dung .env:**
```env
# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?appName=TrollLLM
MONGODB_DB_NAME=trollllm

# Backend
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# GoProxy
DEBUG=false
MAIN_TARGET_SERVER=http://your-upstream:4141
MAIN_UPSTREAM_KEY=your-key
```

## Bước 4: Lấy SSL Certificate

```bash
# Chỉnh sửa email trong script
nano init-ssl.sh
# Đổi EMAIL="admin@trollllm.xyz" thành email của bạn

# Chạy script
chmod +x init-ssl.sh
./init-ssl.sh
```

## Bước 5: Deploy

```bash
# Build và start tất cả services
docker compose -f docker-compose.prod.yml up -d --build

# Kiểm tra logs
docker compose -f docker-compose.prod.yml logs -f

# Kiểm tra status
docker compose -f docker-compose.prod.yml ps
```

## Bước 6: Verify

```bash
# Test frontend
curl https://trollllm.xyz

# Test backend
curl https://api.trollllm.xyz/health

# Test goproxy
curl https://chat.trollllm.xyz/health
```

## Commands hữu ích

```bash
# Xem logs của service cụ thể
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f goproxy
docker compose -f docker-compose.prod.yml logs -f nginx

# Restart service
docker compose -f docker-compose.prod.yml restart backend

# Rebuild và restart
docker compose -f docker-compose.prod.yml up -d --build backend

# Stop tất cả
docker compose -f docker-compose.prod.yml down

# Xóa và rebuild hoàn toàn
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build
```

## Renew SSL Certificate

Certificate tự động renew bởi certbot container. Nếu cần manual:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

## Troubleshooting

### 502 Bad Gateway
- Kiểm tra service đang chạy: `docker compose -f docker-compose.prod.yml ps`
- Kiểm tra logs: `docker compose -f docker-compose.prod.yml logs backend`

### SSL Certificate Error
- Đảm bảo DNS đã propagate: `dig trollllm.xyz`
- Chạy lại init-ssl.sh

### MongoDB Connection Error
- Kiểm tra MONGODB_URI trong .env
- Đảm bảo IP VPS được whitelist trong MongoDB Atlas

## Cấu trúc files

```
/opt/trollllm/
├── .env                      # Environment variables (production)
├── docker-compose.prod.yml   # Docker orchestration
├── init-ssl.sh              # SSL certificate script
├── nginx/
│   └── nginx.conf           # Nginx reverse proxy config
├── certbot/
│   ├── conf/                # SSL certificates
│   └── www/                 # ACME challenge
├── frontend/
├── backend/
└── goproxy/
    └── config.prod.json     # GoProxy production config
```
