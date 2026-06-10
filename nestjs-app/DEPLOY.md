# HRM NestJS — Prod Deploy (Linux VPS + pm2 + Nginx)

NestJS app'ni prod serverga chiqarish yo'riqnomasi. Process manager: **pm2**, oldida **Nginx** (TLS + reverse proxy → `:8001`).

> DB migration'ni **Laravel boshqaradi**. NestJS prodда migration yugurtirmaydi (`drizzle-kit pull` faqat lokal o'qish uchun) — shuning uchun bu deploy DB'ga tegmaydi.

---

## 0. Server talablari

Server tarmog'idan ko'rinishi/ulanishi shart bo'lgan servislar:

| Servis | Eslatma |
|--------|---------|
| **PostgreSQL** | Laravel bilan **bir xil** `hrm` baza |
| **Redis** | socket presence (`SOCKET_REDIS_DB=2`) |
| **MinIO / S3** | `s3.jamacoder.uz` (tashqi) |
| **e-imzo server** | `SIGNATURE_SERVER` (`e-imzo-app`) |
| **OnlyOffice DS** | `OO_FILE_BASE_URL` (`onlyoffice-app`) |
| **LibreOffice** | `ConvertService.docxToPdf` `soffice` CLI'ga tayanadi — serverga o'rnatish shart |
| **HikCentral** | davomat (internal `192.168.x` tarmoq) |

O'rnatish (Ubuntu/Debian):
```bash
# Node 20 LTS + pnpm + pm2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs nginx libreoffice
sudo npm i -g pnpm pm2

# (agar Postgres/Redis shu serverда bo'lsa)
sudo apt-get install -y postgresql redis-server
```

---

## 1. Kodni olib build qilish

```bash
git clone <repo> /opt/hrm && cd /opt/hrm/nestjs-app
pnpm install --frozen-lockfile
pnpm build                     # dist/main.js yaratadi
mkdir -p logs
```

---

## 2. Prod `.env` tayyorlash

```bash
cp .env.production.example .env
# .env'ni to'ldiring: DB_HOST/PASSWORD, MINIO_SECRET_KEY, REDIS_PASSWORD,
# SOCKET_SECRET (frontend VITE_SOCKET_SECRET bilan bir xil), ZOOM_*, HIK_*
```

⚠️ **APP_KEY'ni o'zgartirmang** — lokaldagi qiymatni AYNAN saqlang, aks holda
eski signed URL'lar (OnlyOffice, document signature) buziladi.

---

## 3. pm2 bilan ishga tushirish

```bash
pm2 start ecosystem.config.js --env production
pm2 save                       # joriy holatni saqlash
pm2 startup                    # chiqqan buyruqni nusxalab bajaring (boot'da auto-start)

pm2 logs hrm-nestjs            # log kuzatish
pm2 status                    # holat
```

Test:
```bash
curl http://127.0.0.1:8001/docs   # Swagger ochilsa — app tirik
```

---

## 4. Nginx reverse proxy + TLS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/hrm-api
sudo ln -s /etc/nginx/sites-available/hrm-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# TLS (Let's Encrypt)
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d hrm-api.railway.uz
```

`deploy/nginx.conf` ichida `server_name` va sertifikat yo'llarini o'z domeningizga moslang.

---

## 5. Keyingi deploylar (update)

```bash
cd /opt/hrm/nestjs-app
git pull
pnpm install --frozen-lockfile
pnpm build
pm2 reload hrm-nestjs          # zero-downtime qayta yuklash
```

---

## Tekshiruv ro'yxati (prod sog'lig'i)

- [ ] `pm2 status` → `hrm-nestjs` = `online`
- [ ] `curl https://hrm-api.railway.uz/docs` ochiladi
- [ ] DB ulanish ishlaydi (login endpoint 200)
- [ ] MinIO fayl URL'lari ochiladi (foto/hujjat)
- [ ] Socket.io ulanish (`/socket.io/` 101 Switching Protocols)
- [ ] OnlyOffice hujjat ochiladi (signed doc_url to'g'ri)
- [ ] e-imzo imzo oqimi ishlaydi
- [ ] DOCX → PDF eksport (`soffice` o'rnatilgan)
