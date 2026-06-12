#!/usr/bin/env bash
# api-diff.sh — bitta endpointni Laravel(8002) va NestJS(8001) da solishtiradi.
# Body (jq -S sortlangan) + muhim header'lar diff qilinadi. S3 X-Amz imzolari normallashtiriladi.
#
# Foydalanish:
#   scripts/api-diff.sh METHOD PATH ROLE [BODY] [LANG]
# Misol:
#   scripts/api-diff.sh GET /api/v1/hr/workers Admin
#   scripts/api-diff.sh POST /api/v1/hr/polyclinics HR '{"name":"x"}' uz
#   scripts/api-diff.sh GET /api/v1/hr/workers RAW         # token'siz (401 test)
#
# ROLE — scripts/tokens.sh dagi kalit; "RAW" → token yubormaydi.
# Chiqish: MATCH / DIFFER (+ unified diff) va har ikki status kodi.

set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DIR/tokens.sh"

METHOD="${1:?METHOD kerak}"
APIPATH="${2:?PATH kerak}"
ROLE="${3:?ROLE kerak (yoki RAW)}"
BODY="${4:-}"
LANG="${5:-uz}"

COMMON=(-s -H "Accept: application/json" -H "Accept-Language: $LANG")
if [ "$ROLE" != "RAW" ]; then
  TOK="$(get_token "$ROLE")"
  [ -z "$TOK" ] && { echo "ROLE '$ROLE' uchun token yo'q (tokens.sh)"; exit 2; }
  COMMON+=(-H "Authorization: Bearer $TOK" -H "X-Auth-Type: sanctum")
fi
[ -n "$BODY" ] && COMMON+=(-H "Content-Type: application/json" --data "$BODY")

tmp=$(mktemp -d)
curl "${COMMON[@]}" -X "$METHOD" -D "$tmp/lh" -o "$tmp/lb" -w "%{http_code}" "$LARAVEL_BASE$APIPATH" > "$tmp/lc"
curl "${COMMON[@]}" -X "$METHOD" -D "$tmp/nh" -o "$tmp/nb" -w "%{http_code}" "$NEST_BASE$APIPATH"  > "$tmp/nc"

LC=$(cat "$tmp/lc"); NC=$(cat "$tmp/nc")

python3 - "$tmp" "$METHOD" "$APIPATH" "$ROLE" "$LC" "$NC" << 'PY'
import json, sys, difflib
from urllib.parse import urlparse
tmp,method,path,role,lc,nc = sys.argv[1:7]
def norm(o):
    if isinstance(o,dict): return {k:norm(v) for k,v in o.items()}
    if isinstance(o,list): return [norm(x) for x in o]
    if isinstance(o,str) and 'X-Amz-' in o:
        p=urlparse(o); return f"{p.scheme}://{p.netloc}{p.path}"
    return o
def load(p):
    try: return json.load(open(p))
    except Exception: return open(p).read()
lb=load(f"{tmp}/lb"); nb=load(f"{tmp}/nb")
ls=json.dumps(norm(lb),sort_keys=True,ensure_ascii=False,indent=1)
ns=json.dumps(norm(nb),sort_keys=True,ensure_ascii=False,indent=1)
status_ok = (lc==nc)
body_ok = (ls==ns)
print(f"[{role}] {method} {path}  Laravel:{lc} NestJS:{nc}  status:{'OK' if status_ok else 'DIFF'}  body:{'MATCH' if body_ok else 'DIFFER'}")
if not body_ok:
    for line in difflib.unified_diff(ls.splitlines(),ns.splitlines(),'laravel','nestjs',lineterm='',n=1):
        print(line)
# muhim header diff
def hdr(p):
    d={}
    for ln in open(p):
        if ':' in ln:
            k,v=ln.split(':',1); k=k.strip().lower()
            if k in ('content-type','x-total-count'): d[k]=v.strip()
    return d
lh,nh=hdr(f"{tmp}/lh"),hdr(f"{tmp}/nh")
if lh!=nh: print("HEADER DIFF:", lh, "vs", nh)
sys.exit(0 if (status_ok and body_ok) else 1)
PY
rc=$?
rm -rf "$tmp"
exit $rc
