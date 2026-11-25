#!/usr/bin/env bash
# Integracni test: lokalni PHP, zadne skutecne platby ani SMTP tajemstvi.
set -euo pipefail
TEMP_DIR=$(mktemp -d)
SESSION_ID="hlinenkacibilling202611230001"
HOST="http://127.0.0.1:8766"
API="$HOST/api/rezervace.php"
DATA_DIR=".hlinenka-private"
SERVER_PID=""
cleanup() {
  if test -n "$SERVER_PID"; then kill "$SERVER_PID" 2>/dev/null || true; fi
  rm -rf "$TEMP_DIR" "$DATA_DIR"
}
trap cleanup EXIT
mkdir -p "$TEMP_DIR/sessions"
printf 'admin|b:1;' > "$TEMP_DIR/sessions/sess_$SESSION_ID"
php -d "session.save_path=$TEMP_DIR/sessions" -S 127.0.0.1:8766 -t dist > "$TEMP_DIR/server.log" 2>&1 &
SERVER_PID=$!
for i in {1..30}; do
  if curl -fsS "$API?action=health" > /dev/null 2>&1; then break; fi
  sleep 1
done
request() {
  local action="$1" data="$2"
  curl -fsS "$API?action=$action" -H "Cookie: HLINENKA_ADMIN=$SESSION_ID" \
    -H 'Content-Type: application/json' -d "$data"
}
get_admin() {
  curl -fsS "$API?action=admin" -H "Cookie: HLINENKA_ADMIN=$SESSION_ID"
}
test -f dist/js/qrcode.min.js
request billing-settings '{"sellerName":"Testovaci ubytovatel","sellerAddress":"Testovaci 1, 768 41 Bystrice pod Hostynem","sellerId":"12345678","sellerVatId":"","vatMode":"nonvat","iban":"CZ6508000000192000145399","bankAccount":"19-2000145399/0800"}' | jq -e '.ok==true and .ready==true'
request inquiry '{"name":"Zkusebni host","phone":"+420123456789","email":"zakaznik@example.cz","people":2,"start":"2029-04-09","end":"2029-04-11","message":"Test fakturace"}' | jq -e '.ok==true and .saved==true'
R=$(get_admin | jq -r '.records[0].id')
test -n "$R"
request invoice-customer "$(jq -nc --arg id "$R" '{id:$id,name:"Zkusebni host",address:"Testovaci 2, 768 41 Bystrice pod Hostynem"}')" | jq -e '.ok==true'
request decision "$(jq -nc --arg id "$R" '{id:$id,status:"awaiting_deposit"}')" | jq -e '.ok==true and .invoice != null'
curl -fsS "$API?action=calendar" | jq -e '.occupied|length==0'
get_admin | jq -e '.invoices|length==1'
get_admin | jq -e '.invoices[0].type=="deposit" and .invoices[0].amount==10000 and (.invoices[0].number|test("^Z[0-9]{4}-0001$"))'
INV_TOKEN=$(get_admin | jq -r '.invoices[0].token')
curl -fsS "$API?action=invoice-view&token=$INV_TOKEN" > "$TEMP_DIR/invoice.html"
grep -q 'SPD\*1.0\*ACC:' "$TEMP_DIR/invoice.html"
grep -q 'QR' "$TEMP_DIR/invoice.html"
grep -Fq 'HOSTÝNSKÉ VRCHY' "$TEMP_DIR/invoice.html"
grep -Fq '/email/logo-hlinenka-prirodni.jpg' "$TEMP_DIR/invoice.html"
grep -Fq '7 Kč/kWh' "$TEMP_DIR/invoice.html"
grep -Fq 'ZÁLOHOVÁ FAKTURA' "$TEMP_DIR/invoice.html"
request decision "$(jq -nc --arg id "$R" '{id:$id,status:"approved"}')" | jq -e '.ok==true'
curl -fsS "$API?action=calendar" | jq -e '.occupied|length==1'
get_admin | jq -e '.invoices|length==2'
get_admin | jq -e '.invoices[1].type=="balance" and .invoices[1].amount==10000'
request record-balance "$(jq -nc --arg id "$R" '{id:$id}')" | jq -e '.ok==true'
get_admin | jq -e '.invoices|length==3'
get_admin | jq -e '.invoices[2].type=="final" and .invoices[2].amount==0 and .invoices[2].status=="paid"'
FINAL_TOKEN=$(get_admin | jq -r '.invoices[2].token')
curl -fsS "$API?action=invoice-view&token=$FINAL_TOKEN" > "$TEMP_DIR/final.html"
grep -Fq 'ZÚČTOVACÍ FAKTURA' "$TEMP_DIR/final.html"
grep -Fq 'PLNĚ UHRAZENO' "$TEMP_DIR/final.html"
grep -Fq 'Zbývá k úhradě' "$TEMP_DIR/final.html"
if grep -Fq 'id="payment-qr"' "$TEMP_DIR/final.html"; then echo 'QR platba se nesmí zobrazit na uhrazené faktuře'; exit 1; fi
code=$(curl -sS -o "$TEMP_DIR/delete.json" -w '%{http_code}' -H "Cookie: HLINENKA_ADMIN=$SESSION_ID" -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg id "$R" '{id:$id}')" "$API?action=delete")
test "$code" = "409"
echo 'Fakturace: proforma, potvrzeni po zaloze, doplatek, vyuctovani i QR prosly.'
