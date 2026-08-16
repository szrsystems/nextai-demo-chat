# nextai-demo-chat

A nextai.hu weboldalon futó bemutató asszisztens háttérszolgáltatása.
Egyetlen dolgot csinál: a chatablakból érkező kérdésre választ ad a Gemini modellel,
a weboldal saját tudásbázisából származó tényekkel.

**Az élő orenda-clinic-chatbot szolgáltatáshoz ennek semmi köze, azt nem érinti.**

## Fájlok

| fájl | mire való |
|---|---|
| `server.js` | a teljes szolgáltatás, külső csomag nélkül |
| `tudas.js` | a weboldal tudásbázisából generált ténylista (ne szerkeszd kézzel) |
| `package.json` | indítás |
| `render.yaml` | Render Blueprint, ha egy kattintással akarod telepíteni |
| `teszt.js` | helyi teszt hamis modellel, kulcs nélkül fut |

## Környezeti változók

| név | kötelező | alapérték | mit csinál |
|---|---|---|---|
| `GEMINI_API_KEY` | igen | nincs | a Google AI Studio kulcs. Csak a Render felületén add meg. |
| `GEMINI_MODEL` | nem | `gemini-2.5-flash-lite` | erre válts, ha a magyar szöveg minősége nem elég: `gemini-3.1-flash-lite` |
| `ALLOWED_ORIGINS` | nem | nextai.hu és a Render cím | csak ezekről a domainekről fogad kérést |
| `DAILY_MAX` | nem | `800` | napi kérésplafon, felette a weboldal a saját motorjára vált |
| `IP_HOURLY_MAX` | nem | `25` | egy IP-cím óránként ennyit kérdezhet |

## Végpontok

`GET /health` állapot, a weboldal ezzel ébreszti fel a szolgáltatást oldalbetöltéskor.

`POST /chat`

```json
{ "message": "Mennyibe kerül egy implantátum?",
  "vertical": "fogaszat",
  "history": [{"r":"u","t":"..."},{"r":"a","t":"..."}] }
```

Válasz: `{ "ok": true, "valasz": "...", "kontakt": false }`

Hiba esetén nem ad álválaszt, hanem 4xx vagy 5xx kódot ad vissza, és a weboldal
a beépített kulcsszavas motorjára vált. Néma bukás nincs.

## Beépített korlátok

* csak az engedélyezett domainekről fogad kérést
* egy üzenet legfeljebb 300 karakter, az előzményből legfeljebb 8 forduló megy vissza
* a válasz legfeljebb 400 token, a kimenetből a markdown, a gondolatjel és a HTML ki van szűrve
* telefonszám és e-mail cím a szerveren is ki van maszkolva, mielőtt a modellhez kerülne
* vészhelyzet, lelki válság és megadott elérhetőség **el sem jut a szerverig**, azt a weboldal helyben kezeli

## Helyi teszt

```bash
node teszt.js
```

Kulcs nélkül fut, hamis modellvégpontot indít, és 15 ellenőrzést futtat le.
