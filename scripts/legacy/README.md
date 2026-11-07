# Oude foodtracker importeren

Dit zet een phpMyAdmin-dump van de Laravel-database om naar producten, dagboekregels en voedingslimieten in Convex.

De dump bevat persoonsgegevens. Commit hem niet. `*.sql` en `scripts/legacy/out/` staan in `.gitignore`. `scripts/legacy/fixture.sql` is verzonnen testdata en is de enige SQL die in git mag.

Het script leest alleen `products`, `diary_entries` en `nutritional_limits`. De tabel `users` (met wachtwoordhashes) wordt overgeslagen. Welk oud `user_id` bij welk account hoort, geef je zelf mee.

## Voor je begint

1. Log in de nieuwe app in met elk account dat je importeert, op de deployment waar je naartoe schrijft. Het script maakt geen gebruikers aan. Het zoekt het e-mailadres op via de bestaande index `email` op `users`.
2. Zet de dump buiten de repo, bijvoorbeeld `~/food-dump.sql`.
3. Noteer de mapping. Gebruik het e-mailadres waarmee je net hebt ingelogd.

Alle gebruikers gaan mee, ook testgebruiker 1. Alle producten gaan mee, ook `Test1` en de drie producten die per portie zijn ingevoerd. Die waarden blijven zoals ze in de dump staan. Totalen van dagboekregels worden niet herberekend: het zijn historische snapshots.

Dubbele producten (zelfde gebruiker, zelfde naam na witruimte, zelfde waarden) worden één product. Het laagste `id` blijft. Een regel koppelt aan een product op gebruiker plus naam, hoofdletters negeren. Zonder match blijft `productId` leeg en blijven naam en totalen staan.

Bij categorie `vocht` wordt `gram` opgeslagen als `ml`. Bij categorie `vlees` zet een trefwoord `isRedMeat` op true, ook als het oude vlaggetje 0 was. De lijst staat in `RED_MEAT_KEYWORDS` in `scripts/legacy/transform.ts`. Een vlag die al 1 was op vlees blijft 1, ook zonder trefwoord. Andere categorieën worden geen rood vlees.

Tijden in de dump zijn UTC.

## Dry-run

Vanuit de root van de repo:

```bash
node scripts/legacy/parse-dump.ts \
  --dump ~/food-dump.sql \
  --user 1=jij@example.com \
  --user 2=ander@example.com \
  --dry-run
```

Werkt dat commando niet op jouw Node, gebruik dan `node --experimental-strip-types scripts/legacy/parse-dump.ts`.

Controleer in de uitvoer:

- de aantallen
- de namen zonder product
- de lijst rood vlees, regel voor regel

Er wordt nog niets naar Convex geschreven en er komt nog geen map `scripts/legacy/out/`.

## Bestanden maken

Hetzelfde commando zonder `--dry-run`. Dat schrijft:

- `scripts/legacy/out/products.jsonl`
- `scripts/legacy/out/entries.jsonl`
- `scripts/legacy/out/limits.jsonl`
- `scripts/legacy/out/summary.json`

Die map blijft lokaal.

## Importeren op dev

Laat in één terminal `npx convex dev` lopen, of draai een keer `npx convex push`, zodat `convex/legacy.ts` op de dev-deployment staat.

```bash
node scripts/legacy/import.ts
```

Het script roept `npx convex run legacy:importLegacy` aan in batches van 200. Eerst producten, dan dagboekregels, dan limieten. Opnieuw draaien is veilig: een rij met een bekend `legacyId` wordt overgeslagen. Limieten worden bijgewerkt.

## Controleren

- Vergelijk het aantal producten en dagboekregels in de app met de dry-run.
- Pak in `summary.json` een datum onder `dayKcal`. Open die dag in het dagboek en vergelijk de kcal. Dat getal is de som van de opgeslagen totalen, niet een nieuwe berekening uit de producten.

## Productie

Als dev klopt:

```bash
npx convex deploy
node scripts/legacy/import.ts --prod
```

`--prod` stuurt dezelfde batches naar de productie-deployment. Log daar eerst in met dezelfde accounts, anders stopt de import op een ontbrekend e-mailadres.
