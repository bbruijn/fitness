# Volt

Persoonlijke krachttraining-app: een rustige, duidelijke interface tijdens het sporten en statistieken
over je voortgang achteraf. Gebouwd als installeerbare web-app (PWA) voor de iPhone.

## Wat het doet

- **Vandaag** – de volgende trainingsdag, één grote Start-knop, je week in één oogopslag.
- **Training** – één oefening per scherm, gewicht en herhalingen vooraf ingevuld, één tik per set.
  Rusttimer loopt mee zonder iets te blokkeren. Geen meldingen midden op het scherm.
- **Samenvatting** – duur, getild volume, records en het advies voor de volgende keer.
- **Schema** – dagen en oefeningen aanpassen, slepen om te ordenen.
- **Voortgang** – trainingen en volume per week, progressie per oefening, records, consistentie.

Het advies per oefening beweegt mee: haal je alle herhalingen, dan gaat het gewicht de volgende keer
één stap omhoog; anders blijft het staan op wat je werkelijk gebruikte.

Alle gegevens staan lokaal op het toestel (geen account, geen server). Via *Instellingen → Back-up
bewaren* exporteer je alles als JSON.

## Ontwikkelen

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # rekenlogica: progressie, weken, records, back-up
npm run build    # productie-build in dist/
```

In de dev-console laadt `__volt.getState().loadDemo()` tien weken voorbeelddata.

## Op de iPhone zetten

1. Zet de inhoud van `dist/` op een https-adres (elke statische host werkt; de build gebruikt
   relatieve paden).
2. Open dat adres in Safari → Deel → **Zet op beginscherm**.
3. Start de app vanaf het beginscherm: schermvullend, werkt offline en het scherm blijft aan tijdens
   een training.

## Opbouw

| Pad | Inhoud |
| --- | --- |
| `src/lib` | Datamodel, opslag (zustand + localStorage), statistiek, progressie, voorbeelddata |
| `src/ui` | Bouwstenen: knoppen, stepper, sheet, ring, tikkende cijfers, confetti |
| `src/screens` | Vandaag, Training, Samenvatting, Schema, Voortgang, Instellingen |
| `src/charts` | Grafieken (SVG + motion) |
| `design/` | Ontwerpconcepten en het app-icoon (gegenereerd met ElevenLabs Image) |
| `public/` | Iconen, 3D-illustraties, manifest, service worker |

De eerste dag van het meegeleverde schema volgt het schema van de sportschool; de overige dagen zijn
een startpunt om zelf in te vullen.
