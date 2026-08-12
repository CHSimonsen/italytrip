# Amalfi–Bologna

Rejseplan for turen 14.–20. august 2026. Almindelig statisk hjemmeside (HTML/CSS/JS), ingen build-proces, ingen server.

**Live side:** slås til under repoets *Settings → Pages → Deploy from a branch → `main` / `/ (root)`*.

## Sådan tilføjer eller fjerner du et punkt på en dag

Alt indhold i planen ligger i **[`data.json`](./data.json)** — ikke i selve HTML-koden. Det betyder at I kan redigere planen direkte på GitHub.com (fra telefonen, uden nogen apps):

1. Åbn `data.json` i repoet.
2. Tryk på blyant-ikonet ("Edit this file") øverst til højre.
3. Find den dag (`"days"` → det rigtige `"id"`, fx `"day-3"`) du vil ændre.
4. Under `"activities"` for den dag:
   - **Tilføj et punkt**: kopiér et eksisterende `{ ... }`-punkt, indsæt det som et nyt element i listen, og ret felterne.
   - **Fjern et punkt**: slet hele `{ ... }`-blokken for det punkt (og komma'et der hører til).
5. Scroll ned og tryk **"Commit changes"**. Siden opdaterer sig selv automatisk efter ca. et minut.

### Et punkt (aktivitet) ser sådan ud

```json
{ "time": "12:00–13:00", "icon": "food", "text": "Frokost nær Pantheon." }
```

Med highlight-badge og farvetone (begge valgfrie):

```json
{ "time": "13:00–16:00", "icon": "wine", "tone": "olive", "text": "Besøg på en vingård.", "highlight": "Vingårdsbesøg" }
```

**Felter:**

| Felt | Påkrævet | Beskrivelse |
|---|---|---|
| `time` | Ja | Klokkeslæt-tekst, fx `"09:00–12:00"` eller `"Hele dagen"` |
| `icon` | Ja | Et af: `ferry`, `transit`, `landmark`, `pool`, `wine`, `bag`, `bed`, `food`, `plane`, `sun` |
| `text` | Ja | Beskrivelsen der vises |
| `tone` | Nej | `sea` (blå) eller `olive` (grøn) — udelad for standard terracotta |
| `highlight` | Nej | Tekst til et gyldent highlight-badge, fx `"Pool-dag"` |

### Tilføj en helt ny dag

Kopiér et helt dag-objekt (fra `{ "id": "day-x", ...` til den matchende `}`) og indsæt det i `"days"`-listen. Husk unikt `id` og korrekt `date` (format `ÅÅÅÅ-MM-DD`) — datoen bruges til automatisk at folde "i dag" ud, når man tjekker siden på selve rejsedagen.

### Ret rejsetider / afgang

Øverst i `data.json` under `"trip": { "departure": { ... } }` — her styres nedtællingen (`iso`), check-in-tid og afgangstid.

## Filer

- `index.html` — siden selv (struktur + design)
- `app.js` — læser `data.json` og bygger siden
- `data.json` — **al planlægningsdata, redigér her**
