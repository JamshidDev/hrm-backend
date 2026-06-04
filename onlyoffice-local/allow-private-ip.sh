#!/usr/bin/env bash
# OnlyOffice DS'ga private/meta IP'larga ulanishga ruxsat beradi.
#
# NEGA KERAK: DS ichidagi `request-filtering-agent` xavfsizlik filtri default holda
# private/meta IP'larni bloklaydi. OrbStack'da `host.docker.internal` = 0.250.250.254
# (meta-IP) → DS host backendga (doc_url + callback) ULANA OLMAYDI:
#   "DNS lookup 0.250.250.254 is not allowed. Because, It is meta IP address."
#
# QACHON ISHLATISH: har `docker compose down` + `up` (container qayta yaratilganda)
# dan keyin bir marta. `docker compose stop/start` da SHART EMAS — patch saqlanadi.
#
# Ishlatish:  ./allow-private-ip.sh
set -e
CT=onlyoffice
echo "1) config olinmoqda..."
docker cp "$CT:/etc/onlyoffice/documentserver/local.json" /tmp/oo-local.json
echo "2) request-filtering-agent qo'shilmoqda..."
node -e '
const fs=require("fs"); const p="/tmp/oo-local.json";
const j=JSON.parse(fs.readFileSync(p,"utf8"));
j.services=j.services||{}; j.services.CoAuthoring=j.services.CoAuthoring||{};
j.services.CoAuthoring["request-filtering-agent"]={allowPrivateIPAddress:true,allowMetaIPAddress:true};
fs.writeFileSync(p, JSON.stringify(j,null,2));
'
docker cp /tmp/oo-local.json "$CT:/etc/onlyoffice/documentserver/local.json"
echo "3) DS servislari restart..."
docker exec "$CT" sh -c "supervisorctl restart all" | tail -6
echo "4) tayyorligini kutish..."
for i in $(seq 1 30); do [ "$(curl -s --max-time 5 http://localhost:8080/healthcheck 2>/dev/null)" = "true" ] && { echo " ✅ DS tayyor"; exit 0; }; sleep 3; done
echo "⚠️ healthcheck javob bermadi — docker compose logs -f bilan tekshiring"
