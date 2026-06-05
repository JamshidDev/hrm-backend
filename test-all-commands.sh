#!/usr/bin/env bash
# Barcha command turlarini curl bilan sinab, hujjat yasalishini tekshiradi.
set -u
TOKEN="1231344|1e44c2967f272651d9d344ae5061eb7110d9e704"
BASE="http://localhost:8001"
H=(-H "Authorization: Bearer $TOKEN" -H "X-Auth-Type: sanctum" -H "Content-Type: application/json")
WP=9841; W=9842; DIR=1; POS=825; DP=5
CD="2026-06-05"; FROM="2026-06-10"; TO="2026-06-20"; WD="2026-06-21"
PF="2026-01-01"; PT="2026-12-31"; ND="2026-07-01"; CDATE="2025-01-01"; CTD="2027-01-01"
APP_KEY="base64:Q3kT6ZdOrPJHXgz0ocuMcl4rB23xbuE427wE3swPJ5E="

verify() { # uuid -> DOCX hajmi
  node -e '
  const c=require("crypto");const k="'"$APP_KEY"'",u="'"$1"'",m="commands";
  const e=Math.floor(Date.now()/1000)+1800;const p=new URLSearchParams({expires:String(e),model:m});
  const s=c.createHmac("sha256",k).update(`only-office/file/${u}?${p}`).digest("hex");p.set("signature",s);
  fetch(`http://localhost:8001/api/only-office/file/${u}?${p}`).then(r=>r.arrayBuffer()).then(b=>console.log(b.byteLength)).catch(()=>console.log(0));'
}

t() { # type json
  local type="$1" json="$2"
  local resp http id uuid size
  resp=$(curl -s -X POST "$BASE/api/v1/hr/commands" "${H[@]}" -d "$json" -w "\n%{http_code}")
  http=$(echo "$resp" | tail -1)
  id=$(echo "$resp" | head -1 | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{console.log(JSON.parse(s).data.command_id||"")}catch{console.log("")}})' 2>/dev/null)
  if [ "$http" = "200" ] && [ -n "$id" ]; then
    uuid=$(psql -h 127.0.0.1 -U mack -d hrm -tAc "select uuid from commands where id=$id;" 2>/dev/null | tr -d ' ')
    size=$(verify "$uuid")
    if [ "${size:-0}" -gt 1000 ]; then printf "tip %-3s HTTP %s  doc=%-7s bayt  ✅\n" "$type" "$http" "$size"
    else printf "tip %-3s HTTP %s  doc=%-7s bayt  ⚠️ hujjat yo'q/kichik\n" "$type" "$http" "${size:-0}"; fi
  else
    printf "tip %-3s HTTP %s  ❌ %s\n" "$type" "$http" "$(echo "$resp" | head -1 | cut -c1-80)"
  fi
}

cr() { echo "{\"command_type\":$1,\"director_id\":$DIR,\"worker_id\":$W,\"command_date\":\"$CD\",\"position_id\":$POS,\"position_date\":\"$CD\",\"salary\":1000000,\"rate\":1,\"group\":1,\"rank\":7,\"number\":\"T$1\",\"contract_date\":\"$CDATE\"$2}"; }

echo "==== CREATE (1-8) ===="
for ty in 1 2 4 5 7 8; do t $ty "$(cr $ty '')"; done
t 3 "$(cr 3 ",\"contract_to_date\":\"$CTD\"")"
t 6 "$(cr 6 ",\"temporary_worker_id\":$WP")"

echo "==== UPDATE (21,25) ===="
t 21 "{\"command_type\":21,\"director_id\":$DIR,\"worker_position_id\":$WP,\"command_date\":\"$CD\",\"department_position_id\":$DP,\"position_date\":\"$CD\",\"salary\":1000000,\"rate\":1,\"group\":1,\"rank\":7}"
t 25 "{\"command_type\":25,\"director_id\":$DIR,\"worker_position_id\":$WP,\"command_date\":\"$CD\",\"position_date\":\"$CD\",\"salary\":1000000,\"rate\":1,\"group\":1,\"rank\":7}"

echo "==== DELETE (31-39) ===="
for ty in 31 32 33 34 35 36 37 38 39; do t $ty "{\"command_type\":$ty,\"director_id\":$DIR,\"worker_position_id\":$WP,\"command_date\":\"$CD\",\"command_additional\":{}}"; done

echo "==== MANY-WORKER (41,55,61,62,71,72,73) ===="
t 41 "{\"command_type\":41,\"director_id\":$DIR,\"command_date\":\"$CD\",\"worker_positions\":[{\"id\":$WP,\"period_from\":\"$PF\",\"period_to\":\"$PT\",\"from\":\"$FROM\",\"to\":\"$TO\",\"work_day\":\"$WD\",\"all_day\":14,\"additional\":[]}]}"
t 55 "{\"command_type\":55,\"director_id\":$DIR,\"command_date\":\"$CD\",\"worker_positions\":[{\"id\":$WP,\"from\":\"$FROM\",\"to\":\"$TO\",\"all_day\":1}]}"
t 61 "{\"command_type\":61,\"director_id\":$DIR,\"command_date\":\"$CD\",\"worker_positions\":[{\"id\":$WP,\"from\":\"$FROM\",\"to\":\"$TO\",\"reason\":\"ish\",\"to_organization\":\"Test tashkilot\"}]}"
t 62 "{\"command_type\":62,\"director_id\":$DIR,\"command_date\":\"$CD\",\"worker_positions\":[{\"id\":$WP,\"from\":\"$FROM\",\"to\":\"$TO\",\"reason\":\"ish\",\"to_organization\":\"Test tashkilot\"}]}"
t 71 "{\"command_type\":71,\"director_id\":$DIR,\"command_date\":\"$CD\",\"base\":\"asos\",\"worker_positions\":[{\"id\":$WP,\"reason\":\"yutuq\",\"gift\":\"medal\"}]}"
t 72 "{\"command_type\":72,\"director_id\":$DIR,\"command_date\":\"$CD\",\"worker_positions\":[{\"id\":$WP,\"reason\":\"qoidabuzarlik\",\"fine\":\"ogohlantirish\"}]}"
t 73 "{\"command_type\":73,\"director_id\":$DIR,\"command_date\":\"$CD\",\"worker_positions\":[{\"id\":$WP,\"reason\":\"yordam\",\"type\":1,\"amount\":2}]}"

echo "==== VACATION (43-54) ===="
t 43 "{\"command_type\":43,\"director_id\":$DIR,\"worker_position_id\":$WP,\"command_date\":\"$CD\",\"new_date\":\"$ND\",\"reason\":1,\"work_day\":\"$WD\"}"
t 44 "{\"command_type\":44,\"director_id\":$DIR,\"worker_position_id\":$WP,\"command_date\":\"$CD\",\"new_date\":\"$ND\",\"reason\":1,\"rest_day\":2,\"work_day\":\"$WD\"}"
t 45 "{\"command_type\":45,\"director_id\":$DIR,\"worker_position_id\":$WP,\"command_date\":\"$CD\",\"from\":\"$FROM\",\"to\":\"$TO\",\"work_day\":\"$WD\"}"
t 46 "{\"command_type\":46,\"director_id\":$DIR,\"worker_position_id\":$WP,\"command_date\":\"$CD\",\"from\":\"$FROM\",\"to\":\"$TO\",\"work_day\":\"$WD\",\"period_from\":\"$PF\",\"period_to\":\"$PT\",\"all_day\":10,\"half_one_day\":5,\"half_two_base\":false,\"additional\":[]}"
t 47 "{\"command_type\":47,\"director_id\":$DIR,\"worker_position_id\":$WP,\"command_date\":\"$CD\",\"from\":\"$FROM\",\"to\":\"$TO\",\"work_day\":\"$WD\",\"vacation_reason_type\":\"Kasallik\",\"vacation_reason_day\":5}"
t 48 "{\"command_type\":48,\"director_id\":$DIR,\"worker_position_id\":$WP,\"command_date\":\"$CD\",\"from\":\"$FROM\",\"to\":\"$TO\",\"work_day\":\"$WD\",\"all_day\":5,\"reason\":1}"
t 49 "{\"command_type\":49,\"director_id\":$DIR,\"worker_position_id\":$WP,\"command_date\":\"$CD\",\"from\":\"$FROM\",\"to\":\"$TO\",\"work_day\":\"$WD\"}"
t 50 "{\"command_type\":50,\"director_id\":$DIR,\"worker_position_id\":$WP,\"command_date\":\"$CD\",\"to\":\"$TO\",\"work_day\":\"$WD\",\"vacation_finish_status\":1,\"vacation_status\":1,\"child_age\":2}"
for ty in 51 52 53 54; do t $ty "{\"command_type\":$ty,\"director_id\":$DIR,\"worker_position_id\":$WP,\"command_date\":\"$CD\",\"from\":\"$FROM\",\"to\":\"$TO\",\"work_day\":\"$WD\",\"reason\":\"sabab\"}"; done
