# Mackapärverkstan

En uppgift, några fasta saker och en låda full av prylar. Barnet placerar saker på
planen, trycker **Spela** och ser om kedjan löser uppdraget – och ändrar tills den gör det.

Fysikpussel i The Incredible Machine-anda för barn 7–12 år. Ren HTML/CSS/JS,
ingen inloggning, inga cookies, inga tredjepartsanrop i drift.

## Så funkar det

- Varje bana har ett **uppdrag** (t.ex. "Få bollen i korgen"), några **fasta saker**
  (hyllor, boll, korg, kanon) och en **låda med prylar** som barnet får använda.
- Prylarna är statiska eller dynamiska: plankor, studsmattor, vippor, kanoner,
  fläktar, ljus, magneter, ballonger, dominobrickor, hinkar.
- Tryck **Spela** – fysiken körs, och antingen löser kedjan uppdraget eller inte.
  **Igen** rensar bara det barnet lagt ut, de fasta sakerna står kvar.
- Banvalet i rubriken hoppar mellan banorna, och **Fria verkstan** är en sandlåda
  med alla prylar och inget mål.

Banor: 1) Bollen i korgen (planka) 2) Studsa i korgen (studsmatta) 3) Upp med
ballongen (nål) 4) Skjut iväg den (ljus + kanon) 5) Kanon och matta (två system i
kedja: ljus → kanon → studsmatta → korg) 6) Fria verkstan (sandlåda).

## Fysik

Matter.js 0.20.0 ligger lokalt i `public/vendor/` (MIT, licensen bredvid).
Gravitation `1.45`, friktion `0` på ytor, luftmotstånd `0.0002` på bollar, och
studsmattan ger en deterministisk studs (`x: 3.2·cos(angle)`, `y: -9.5`) så att
barnet kan förutsäga resultatet i stället för att gissa.

## Testa banorna utan att spela

`window.__mk` innehåller test-API:t:

```js
__mk.prova(0, [{ typ: "planka", x: 330, y: 400, v: 0.65 }])  // → { klar: true }
__mk.sök(0, [], "planka", [280, 300, 320], [380, 400], [0.55, 0.65])
```

Alla fem målbanorna är verifierade lösbara med `prova()`.

## Bygg och publicera

```bash
docker build -t mackaparverkstan .
docker run -p 8080:8080 mackaparverkstan
```

Drift: nginx:1.27-alpine, port 8080, healthcheck mot `/`.
Bilder och og: `python3 make_assets.py` (PIL, Fredoka lokalt).