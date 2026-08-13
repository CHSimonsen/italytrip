# Amalfi–Bologna

Rejseplan for turen 14.–20. august 2026. Almindelig statisk hjemmeside (HTML/CSS/JS), ingen build-proces, ingen server.

**Live side:** slås til under repoets *Settings → Pages → Deploy from a branch → `main` / `/ (root)`*.

## Sådan tilføjer eller fjerner du et punkt på en dag

Der er to måder — brug den, der passer bedst i situationen.

### A) Direkte på siden (hurtigst, kræver adgangskode)

Siden har en **"🔒 Rediger planen"**-knap under "Dag for dag". Første gang du trykker på den beder den om en adgangskode — se *"Sådan slår du redigering til"* nedenfor for hvordan I får fat i den. Når den er låst op:

- Hver dag får en **"+ Tilføj punkt"**-knap nederst, hvor du sætter starttid (og evt. sluttid) med en rigtig tidsvælger, plus en beskrivelse.
- Hvert punkt får en lille ✏️-knap til at rette det (samme felter, forudfyldt) og en 🗑-knap til at slette det.
- Punkter sorteres automatisk efter starttid, hver gang du gemmer — så du kan tilføje eller rette et punkt i vilkårlig rækkefølge, og det lander det rigtige sted i dagens tidslinje af sig selv.
- Dagens titel (fx "Amalfi → Rom") har sin egen lille ✏️-knap i dagens hoved — tryk for at ændre den.

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

Kun starttidspunkt (uden sluttid) er også gyldigt:

```json
{ "time": "12:00", "text": "Check-in på hotellet." }
```

**Felter:**

| Felt | Påkrævet | Beskrivelse |
|---|---|---|
| `time` | Ja | `"TT:MM"` eller `"TT:MM–TT:MM"` (24-timers, altid to cifre). Bruges også til automatisk sortering — punkter vises altid i starttids-rækkefølge, uanset rækkefølgen i filen. **Ikke** frit tekstfelt længere (fx `"Hele dagen"` virker ikke) — redigér via "Rediger planen" på siden for at få en rigtig tidsvælger, eller skriv tiden præcist i dette format. |
| `text` | Ja | Beskrivelsen der vises |
| `icon`, `tone`, `highlight` | Nej (ikke i brug) | Ældre punkter kan have disse felter fra før ikoner/farvetone/highlight-badges blev fjernet fra siden — de bliver simpelthen ignoreret nu. Kan udelades i nye punkter. |

### "Forslag fra Claude"

Hver dag kan have et `"suggestion"`-felt, som vises nederst i dagens kort:

```json
"suggestion": { "text": "...", "url": "https://...", "label": "Læs mere om X" }
```

`text` er påkrævet, `url`/`label` er valgfrie (viser et link hvis sat). Dette redigeres kun i `data.json` — der er ingen knap på siden til at tilføje/rette forslag. Spørg Claude om at researche og opdatere et forslag for en given dag, hvis I vil ændre det.

**Standard for et forslag** (gælder når Claude skriver eller opdaterer et): det skal ikke bare være "en sej ting man kan se i byen" — det skal give mening i forhold til den konkrete dag. Før Claude foreslår noget, tjekker den:

- **Dagens plan**: hvor er der faktisk luft til noget (mellem to punkter, før/efter et fast tidspunkt), og hvad er allerede dækket, så forslaget ikke overlapper eller kolliderer med tidsplanen.
- **Dagens noter** (`"notes"`-feltet, se nedenfor): hvis I har skrevet noget for den dag, skal det som minimum tages med i overvejelsen, ikke ignoreres til fordel for et generisk forslag.

Et forslag der ikke passer ind nogen steder i dagens plan, er ikke et godt forslag, uanset hvor interessant stedet er.

### "Jeres noter" — fritekst pr. dag, som Claude kan handle på

Hver dag har et **"📝 Jeres noter"**-felt (eller en **"+ Tilføj noter"**-knap, hvis det er tomt), nederst i dagens kort, lige over "Forslag fra Claude". I skriver hvad som helst dertil — løse idéer, "vi vil gerne se X", ting I har hørt om, tvivl om planen — ingen struktur krævet. Redigeres på samme måde som et punkt (kræver adgangskoden), og gemmes direkte i `data.json`'s `"notes"`-felt for den dag.

Det er ikke en AI-funktion i sig selv — siden er stadig helt statisk. Sådan bruger I det:

1. Skriv jeres noter for en given dag på siden.
2. Bed Claude (i en chat, fx her) om at læse noterne for den dag og opdatere planen ud fra dem — Claude kan researche, tilføje/rette/slette punkter, og opdatere "Forslag fra Claude", og gemmer/pusher det hele til repoet, ligesom med alt andet på siden.

Claude rydder ikke noterne automatisk bagefter — sig til, hvis I vil have dem slettet igen når de er brugt.

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
