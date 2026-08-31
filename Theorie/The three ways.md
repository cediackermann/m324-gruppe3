# The Three Ways – Die drei Wege

**M324 – T1: Theorie DevOps-Kultur** · Die drei Wege in eigenen Worten, angewendet auf die Fallstudie **TechNova Solutions**.

Bei den drei Wegen geht es darum, den **Flow vom Dev-Team zum Ops-Team** zu verbessern, wobei die **Feedback-Schleife** eine wichtige Rolle spielt. Die Wege stammen von Gene Kim (*The Phoenix Project*, *The DevOps Handbook*) und sind drei Blickrichtungen auf denselben Wertstrom:

| Weg | Prinzip | Richtung | Leitfrage |
|---|---|---|---|
| 1 | Flow / Systems Thinking | Dev → Ops → Kunde | Wie fliesst Arbeit ohne Stau durch das System? |
| 2 | Amplify Feedback Loops | Kunde → Ops → Dev | Wie kommen Erkenntnisse schnell und laut zurück? |
| 3 | Continual Learning | fortlaufend | Wie wird aus Erkenntnissen dauerhaftes Wissen? |

CALMS beschreibt, *woran* man DevOps erkennt; die drei Wege beschreiben, *wie* man dorthin kommt → [CALMS.md](./CALMS.md)

## Fallstudie in Kürze

TechNova Solutions, ca. 250 Mitarbeitende, CRM-Software: vorher Releases alle 6 Monate, isolierte Silos aus Dev/Test/Ops, manuelle und fehleranfällige Tests und Deployments, Schuldkultur, keine Kennzahlen. Massnahmen: Workshops und Teambuilding, CI/CD-Pipeline, Kanban-Boards, Kennzahlen (Deployment-Frequenz, Lead Time, MTTR), Wissensaustausch (Wiki, Lernformate, Erfahrungsberichte). Nach 18 Monaten: wöchentliche Releases, stabilisierte Zusammenarbeit, höhere Kundenzufriedenheit.

---

## 1. Weg: Systems Thinking / Flow

**In eigenen Worten:** Änderungen am System müssen reibungslos kommuniziert und von allen involvierten Teams verstanden werden. Um Arbeit und Fortschritt zwischen Teams übersichtlich zu halten, hilft ein **Planungsboard**, auf dem der Status der Arbeiten festgehalten ist.

Der Kern ist eine Perspektivänderung: Optimiert wird nicht das einzelne Team, sondern der **gesamte Wertstrom** von der Idee bis zum Nutzen. Ein lokal effizientes Team kann den Gesamtfluss sogar verschlechtern – etwa wenn Dev viele Features produziert, die dann vor einem manuellen Deployment-Engpass liegen bleiben. Daraus folgt: Arbeit sichtbar machen, Batchgrössen verkleinern, Übergaben reduzieren, nie bekannte Fehler nach rechts weitergeben, Engpässe entlasten.

**In der Fallstudie:** Der Fluss war doppelt blockiert – **organisatorisch** durch die Silos (jede Grenze bedeutet Wartezeit und Wissensverlust) und **technisch** durch manuelle Tests und Deployments, die den Halbjahrestakt erzwangen. Die **Kanban-Boards** machen den Fluss über Teamgrenzen sichtbar, die **CI/CD-Pipeline** entlastet den technischen Engpass. Ergebnis: der Sprung von halbjährlich auf **wöchentlich** – also eine massive Verkleinerung der Batchgrösse.

**Einschätzung:** Am deutlichsten belegt, weil das Ergebnis direkt messbar ist. Er ist zugleich Voraussetzung für die anderen beiden: Solange ein Release ein halbes Jahr braucht, kann kein Feedback rechtzeitig zurückkommen.

## 2. Weg: Amplify Feedback Loops

**In eigenen Worten:** Es geht um Feedback Loops – das geht Hand in Hand mit **Sharing** und **Measurement** aus CALMS.

Information fliesst hier **von rechts nach links**, aus Produktion und Betrieb zurück zur Entwicklung. Zwei Eigenschaften zählen: **kürzer** (ein Fehler, den ein Unit Test in Sekunden meldet, kostet fast nichts; derselbe Fehler in Produktion kostet Incident, Support und Vertrauen) und **lauter** (ein Signal, das niemanden erreicht oder ignoriert wird, ist kein Feedback – rote Builds blockieren, Alerts erreichen das verantwortliche Team).

| Ebene | Beispiel | Geschwindigkeit |
|---|---|---|
| Code | Linter/Unit Test schlägt fehl | Sekunden–Minuten |
| Lieferung | Build oder Smoke Test scheitert | Minuten |
| Betrieb | Fehlerrate/Antwortzeit steigt | Minuten–Stunden |
| Produkt | Funktion wird kaum genutzt | Tage–Wochen |

**In der Fallstudie:** Vorher praktisch nicht vorhanden – „Kundenfeedback konnte nicht schnell genug umgesetzt werden“ beschreibt genau eine zu lange Schleife: Zwischen Rückmeldung und Wirkung lag bis zu ein halbes Jahr, damit war sie beim Eintreffen oft überholt. Danach existieren mehrere Schleifen: die **Pipeline** (technisches Feedback in Minuten), die **Kennzahlen** (Feedback über den Prozess selbst, MTTR ist ein reiner Wiederherstellungswert), die **wöchentlichen Releases** (Kundenfeedback trifft ein, solange es relevant ist) und die **Erfahrungsberichte**. Wichtig: In der früheren Schuldkultur wurde Feedback **gedämpft** statt verstärkt – wer Konsequenzen fürchtet, meldet Probleme später.

**Einschätzung:** Der Hebel mit der grössten indirekten Wirkung. Erst die Kennzahlen geben TechNova eine Rückmeldung über den eigenen Prozess und erlauben zu prüfen, ob Verbesserungen wirken.

## 3. Weg: Continual Learning and Experimentation

**In eigenen Worten:** Auch dieser Weg fokussiert stark auf das **S von CALMS**: Fehler werden offen zwischen den Parteien ausgetauscht und dadurch nicht wiederholt. Das soll sich aber nicht auf Fehler beschränken, sondern allgemein auf neue Erkenntnisse und Learnings erweitern.

Der dritte Weg sorgt dafür, dass Verbesserung nicht vom Zufall abhängt. Er umfasst: eine Kultur, die Lernen ermöglicht (**blameless Postmortems**, psychologische Sicherheit); **lokales Lernen global machen** (sonst wiederholt ein anderes Team denselben Fehler); die **Verbesserung der täglichen Arbeit** – technische Schulden und manuelle Restschritte brauchen bewusst Kapazität, sonst gewinnt immer das dringende Tagesgeschäft; und **Experimente** mit Hypothese, begrenztem Rahmen und vorher definierten Erfolgskriterien.

**In der Fallstudie:** Hier am breitesten umgesetzt. Das **Wiki** macht lokales Wissen global verfügbar, die **Lernformate** geben dem Lernen einen festen Platz, die **Erfahrungsberichte** lösen die Schuldkultur ab, und **Workshops/Teambuilding** schaffen die Vertrauensbasis, ohne die niemand offen über eigene Fehler spricht. Das Ergebnis „stabilisierte Zusammenarbeit“ ist genau diese Wirkung – kein einzelnes Werkzeug, sondern ein veränderter Umgang mit Fehlern und Wissen.

**Einschätzung:** Am schwersten messbar und deshalb am gefährdetsten – zugleich der einzige Weg, der die Verbesserungen der ersten beiden dauerhaft absichert.

---

## Reihenfolge und Zusammenspiel

Ohne Fluss (1) gibt es nichts, worüber Feedback entstehen könnte. Ein schneller Fluss ohne Feedback (2) liefert nur schneller Fehler aus. Und beides verfällt wieder, wenn Lernen nicht institutionalisiert ist (3). Die Wege sind aber **keine Projektphasen**: Bei TechNova liefen alle Massnahmen parallel – Boards und Pipeline (1), Kennzahlen (2), Wiki und Erfahrungsberichte (3). Genau das erklärt die Wirkung, denn ein Weg allein hätte den jeweils anderen Engpass nicht beseitigt.

| Weg | stärkster CALMS-Bezug | gemeinsame Grundidee |
|---|---|---|
| 1 – Flow | Lean, Automation | Wartezeit im Wertstrom entfernen, kleine Batches |
| 2 – Feedback | Measurement, Sharing | Wirkung sichtbar machen statt auf Meinung vertrauen |
| 3 – Lernen | Culture, Sharing | Fehler offen behandeln, Wissen organisational machen |

## Quellen

- Gene Kim, *The Three Ways: The Principles Underpinning DevOps* – https://itrevolution.com/articles/the-three-ways-principles-underpinning-devops/
- Gene Kim, Jez Humble, Patrick Debois, John Willis, *The DevOps Handbook*
- DORA, *Software delivery performance metrics* – https://dora.dev/guides/dora-metrics/
- Microsoft Learn, *What is DevOps?* – https://learn.microsoft.com/en-us/devops/what-is-devops
- TBZ M324, *T1_Theorie_DevOps_Kultur.md* (Fallstudie TechNova) – https://gitlab.com/ch-tbz-it/Stud/m324/-/blob/main/Projekt/T1_Theorie_DevOps_Kultur.md
