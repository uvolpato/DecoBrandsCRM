# uso: prepara.sh <database> — rifà il database delle prove nel browser (solo decobrands_test*), build del backend
# e copia del frontend nella cartella servita da `next dev` sulla 8071 (FE). Poi: giro.sh <database> <prove...>
FE="${FE:-C:/Users/uvolp/AppData/Local/Temp/claude/1e3dfabdb7c29fc1/daab228c-3296-4b19-9172-a5dffbe21d27/scratchpad/fe}"
case "$1" in decobrands_test*) ;; *) echo "solo database decobrands_test*"; exit 1;; esac
cd /c/Progetti/Decobrands_CRM/app/backend
B=$(grep ^DATABASE_URL= .env | cut -d= -f2-); E=$(echo $B | sed "s#/decobrands_db#/$1#")
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.argv[1].replace(/\/decobrands_db.*/,'/postgres')});(async()=>{await c.connect();await c.query('DROP DATABASE IF EXISTS $1 WITH (FORCE)');await c.query('CREATE DATABASE $1');await c.end()})()" "$B" || exit 1
DATABASE_URL="$E" npx prisma migrate deploy > /dev/null 2>&1 && DATABASE_URL="$E" npx prisma db seed > /dev/null 2>&1 && echo "database $1 pronto" || exit 1
npx nest build > /dev/null 2>&1 && echo "build ok" || exit 1
powershell -NoProfile -Command "robocopy C:\Progetti\Decobrands_CRM\app\frontend '$FE' /MIR /XD node_modules .next /NFL /NDL /NJH /NJS | Out-Null; if (\$LASTEXITCODE -lt 8) { 'frontend copiato' } else { exit 1 }"
