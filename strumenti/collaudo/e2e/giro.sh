# uso: giro.sh <database> <prova...> ; un backend fresco (8012) per ogni prova
SP="$(cd "$(dirname "$0")" && pwd)"; OUT="${E2E_OUT:-$SP/uscita}"; mkdir -p "$OUT/e2e" "$OUT/doc"
cd /c/Progetti/Decobrands_CRM/app/backend
DB=$1; shift
B=$(grep ^DATABASE_URL= .env | cut -d= -f2-)
export DATABASE_URL=$(echo $B | sed "s#/decobrands_db#/$DB#") PONTE_URL=$(echo $B | sed 's#/decobrands_db?schema=public#/decobrands_ponte_prova#') PORT=8012 NODE_ENV=development DOCUMENTI_DIR="$OUT/doc" PYTHONIOENCODING=utf-8
node ../../strumenti/prove/utenti_prova.js crea r1 > /dev/null 2>&1 || echo "utenti di prova NON creati"
for f in "$@"; do
  node "$SP/prep.js" > /dev/null || echo "prep KO"
  node dist-prove/src/main.js > "$OUT/backend-$f.log" 2>&1 & PID=$!
  for i in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:8012/api/accesso/io && break; sleep 1; done
  timeout 900 python ../../strumenti/prove/$f.py r1 "$OUT/e2e/$f" http://localhost:8071 > "$OUT/e2e/$f.txt" 2>&1
  echo "$f exit=$? OK=$(grep -c '^OK' $OUT/e2e/$f.txt) KO=$(grep -c '^KO' $OUT/e2e/$f.txt)"
  kill $PID; taskkill //F //PID $(netstat -ano | grep ':8012 .*LISTEN' | awk '{print $5}' | head -1) >/dev/null 2>&1; sleep 2
done
