# Amalfi–Bologna

Rejseplan for turen 14.–20. august 2026. Almindelig statisk hjemmeside (HTML/CSS/JS), ingen build-proces, ingen server.

**Live side:** slås til under repoets *Settings → Pages → Deploy from a branch → `main` / `/ (root)`*.

## Sådan tilføjer eller fjerner du et punkt på en dag

Der er to måder — brug den, der passer bedst i situationen.

### A) Direkte på siden (hurtigst, kræver adgangskode)

Siden har en **"🔒 Rediger planen"**-knap under "Dag for dag". Første gang du trykker på den beder den om en adgangskode — se *"Sådan slår du redigering til"* nedenfor for hvordan I får fat i den. Når den er låst op:

- Hver dag får en **"+ Tilføj punkt"**-knap nederst, hvor du udfylder tidspunkt og beskrivelse.
- Hvert punkt får en lille ✏️-knap til at rette det (samme felter, forudfyldt) og en 🗑-knap til at slette det.

Ændringer gemmes med det samme direkte til `data.json` i repoet — ingen commit-skærm, ingen GitHub-app nødvendig. Adgangskoden huskes i browseren på den enhed, så du kun skal indtaste den én gang pr. telefon/browser.

**Vigtigt at vide:** adgangskoden *er* reelt en GitHub-adgangstoken med skriveadgang til dette ene repo — bekvemt nok til en rejseplan, men del den ikke som en "rigtig" hemmelighed. Se *"Sådan slår du redigering til"* nedenfor.

### B) Direkte i `data.json` på GitHub.com (ingen adgangskode nødvendig)

Alt indhold i planen ligger i **[`data.json`](./data.json)** — ikke i selve HTML-koden. Det betyder at I kan redigere planen direkte på GitHub.com (fra telefonen, uden nogen apps), uden at bruge adgangskoden overhovedet:

1. Åbn `data.json` i repoet.
2. Tryk på blyant-ikonet ("Edit this file") øverst til højre.
3. Find den dag (`"days"` → det rigtige `"id"`, fx `"day-3"`) du vil ændre.
4. Under `"activities"` for den dag:
   - **Tilføj et punkt**: kopiér et eksisterende `{ ... }`-punkt, indsæt det som et nyt element i listen, og ret felterne.
   - **Fjern et punkt**: slet hele `{ ... }`-blokken for det punkt (og komma'et der hører til).
5. Scroll ned og tryk **"Commit changes"**. Siden opdaterer sig selv automatisk efter ca. et minut.

### Et punkt (aktivitet) ser sådan ud

```json
{ "time": "12:00–13:00", "text": "Frokost nær Pantheon." }
```

**Felter:**

| Felt | Påkrævet | Beskrivelse |
|---|---|---|
| `time` | Ja | Klokkeslæt-tekst, fx `"09:00–12:00"` eller `"Hele dagen"` |
| `text` | Ja | Beskrivelsen der vises |
| `icon`, `tone`, `highlight` | Nej (ikke i brug) | Ældre punkter kan have disse felter fra før ikoner/farvetone/highlight-badges blev fjernet fra siden — de bliver simpelthen ignoreret nu. Kan udelades i nye punkter. |

### Tilføj en helt ny dag

Kopiér et helt dag-objekt (fra `{ "id": "day-x", ...` til den matchende `}`) og indsæt det i `"days"`-listen. Husk unikt `id` og korrekt `date` (format `ÅÅÅÅ-MM-DD`) — datoen bruges til automatisk at folde "i dag" ud, når man tjekker siden på selve rejsedagen.

### Ret rejsetider / afgang

Øverst i `data.json` under `"trip": { "departure": { ... } }` — her styres nedtællingen (`iso`), check-in-tid og afgangstid.

## Sådan slår du redigering til (opsætning, én gang)

For at "🔒 Rediger planen"-knappen skal virke, skal der findes en GitHub **fine-grained personal access token**, scoped til kun dette repo. Det er dette token, alle på turen bruger som "adgangskode".

1. Gå til [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new) (kræver at du er logget ind som repo-ejeren).
2. **Repository access** → *Only select repositories* → vælg `italytrip`.
3. **Permissions** → *Repository permissions* → sæt **Contents** til **Read and write**. Lad alt andet stå på "No access".
4. Sæt en udløbsdato, fx et par dage efter turen slutter (20. august 2026).
5. Tryk **Generate token**, og kopiér strengen (starter med `github_pat_...`) — den vises kun én gang.
6. Åbn siden, tryk **"🔒 Rediger planen"**, indsæt strengen som adgangskode.
7. Del den samme streng med de andre på turen (fx i en besked) — de gør det samme på deres telefon, én gang.

Alle med koden kan tilføje/slette punkter direkte fra siden. Skulle koden på et tidspunkt ikke virke længere (fx efter udløbsdatoen), generér blot et nyt token og gentag trin 6–7.

## Filer

- `index.html` — siden selv (struktur + design)
- `app.js` — læser `data.json` og bygger siden
- `data.json` — **al planlægningsdata, redigér her**
