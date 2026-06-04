# Lokal OnlyOffice (dev)

Prod (`office.dasuty.com`) bilan bir xil **OnlyOffice Document Server 8.3.0, JWT off**
lokal nusxasi. Hujjat yaratish → tahrirlash → saqlash oqimini lokalda, prod ma'lumotga
tegmasdan sinash uchun.

## Arxitektura

```
Browser (client.html) ──► DS (localhost:8080)         editor api.js
DS (docker) ──► host backend (host.docker.internal:8001)   doc_url yuklab oladi + callback
backend ──► MinIO (s3.jamacoder.uz, bucket=hrm-media)      saqlaydi (prod `hrm` EMAS)
```

- DS o'zi backendga gaplashadi (backend DS'ga emas) → shuning uchun `OO_FILE_BASE_URL=host.docker.internal`.
- JWT off — prod frontend config'da token yo'q (tekshirilgan).

## Ishga tushirish

```bash
# 1. DS
cd onlyoffice-local && docker compose up -d
# tayyorligini kuting (~30-60s):
curl -s http://localhost:8080/healthcheck    # => true

# 2. backend .env'da quyidagilar borligini tekshiring (nestjs-app/.env):
#    OO_FILE_BASE_URL=http://host.docker.internal:8001
#    MINIO_BUCKET=hrm-media         # prod `hrm` EMAS — xavfsiz
# backendni qayta ishga tushiring.
```

## To'liq oqimni sinash

1. **Yaratish** — command yarating (template `public/resumes/commands/{type}.docx` bo'lishi shart, masalan 32):
   `POST /api/v1/hr/commands` (auth token bilan). DOCX → MinIO(hr-media), DB(local hrm).
2. **doc_url olish** — `GET /api/v1/document/show?model=commands&document_id=<command_id>` → javobdan `document.doc_url`.
3. **Editor** — `client.html` ni brauzerda oching → `doc_url`, `model=commands`, `document_id` ni qo'ying → **Editorni och**.
4. **Saqlash** — editorda o'zgartiring; DS avto/force-save bilan `callbackUrl` (status 2/6) ga yuboradi
   → backend tahrirlangan DOCX'ni MinIO'ga + PDF qiladi. Backend log'ida kuzating.

## Buyruqlar

| | |
|---|---|
| Yoqish | `docker compose up -d` |
| To'xtatish (RAM bo'shatish) | `docker compose stop` |
| Holati | `docker compose ps` / `curl -s localhost:8080/healthcheck` |
| Log | `docker compose logs -f` |
| O'chirish (volume saqlanadi) | `docker compose down` |
| To'liq tozalash | `docker compose down -v` |

## ⚠️ MUHIM: private/meta IP ruxsati (har `up`/recreate'dan keyin)

DS ichidagi `request-filtering-agent` filtri default holda private/meta IP'larni bloklaydi.
OrbStack'da `host.docker.internal` = `0.250.250.254` (meta-IP) → DS host backendga ulana
olmaydi ("DNS lookup ... is not allowed. Because, It is meta IP address"). Natijada
hujjat **saqlanmaydi** ("Не удается сохранить документ"). Tuzatish:

```bash
cd onlyoffice-local && ./allow-private-ip.sh
```

- `docker compose down` + `up` (container qayta yaratiladi) dan keyin **qayta ishga tushiring**.
- `docker compose stop` + `start` da **shart emas** — patch saqlanadi.

## Eslatmalar

- **RAM**: DS ~2 GB. 8 GB mashinada tig'iz — ishlatmaganda `docker compose stop`.
- **Callback host**: DS tahrirlangan-fayl URL'ida `localhost` ko'rsatsa, backend allowlist'i (`document.service.ts`)
  allaqachon ruxsat beradi. Boshqa host chiqsa — `ONLY_OFFICE_ALLOWED_HOSTS` env qo'shiladi.
- **Versiya**: prod yangilansa, `docker-compose.yml` dagi `:8.3.0` ni o'zgartiring.
