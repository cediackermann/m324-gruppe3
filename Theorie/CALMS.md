# CALMS

**M324 – T1: Theorie DevOps-Kultur** · Die fünf CALMS-Bereiche in eigenen Worten, angewendet auf die Fallstudie **TechNova Solutions**.

CALMS steht für **Culture, Automation, Lean, Measurement, Sharing** (Damon Edwards / John Willis, das *L* ergänzt von Jez Humble). Es ist kein Prozess, sondern ein **Diagnoseraster**: Woran erkennen wir, ob wir DevOps wirklich leben? Die drei Wege beantworten dagegen die Frage, *wie* man dorthin kommt → [The three ways.md](./The%20three%20ways.md)

## Fallstudie in Kürze

TechNova Solutions, ca. 250 Mitarbeitende, CRM-Software:

| | Vorher | Nachher (ca. 18 Monate) |
| --- | --- | --- |
| Releasetakt | alle 6 Monate | wöchentlich |
| Organisation | Dev, Test, Ops isoliert | stabilisierte Zusammenarbeit |
| Test/Deployment | manuell, fehleranfällig | CI/CD-Pipeline |
| Fehlerkultur | Schuldzuweisungen | Erfahrungsberichte, Lernformate |
| Steuerung | keine Kennzahlen | Deployment-Frequenz, Lead Time, MTTR |
| Kundenfeedback | zu langsam umgesetzt | schneller, höhere Zufriedenheit |

---

## Culture

**In eigenen Worten:** Dev und Ops arbeiten symbiotisch zusammen, weil sie auf dasselbe Ziel verpflichtet sind.

Der entscheidende Wechsel ist der von „mein Teil ist fertig“ zu „unser Ergebnis ist erst in Produktion fertig“. Solange Dev an gelieferten Features und Ops an Stabilität gemessen wird, haben beide gegensätzliche Anreize: Jedes Deployment ist für Ops ein Risiko, jede Betriebsbremse für Dev ein Hindernis. Dazu gehören **blameless Postmortems** (Frage: welche Bedingungen machten den Fehler möglich? – nicht: wer war schuld?) und psychologische Sicherheit. Wer Bestrafung erwartet, meldet Probleme später oder gar nicht.

**In der Fallstudie:** TechNova ist das Lehrbuchbeispiel für das Gegenteil – isolierte Silos und eine Schuldkultur bei Fehlern. Gegenmassnahme waren **Workshops und Teambuilding**. Diese allein hätten aber wenig gebracht: Erst weil parallel Pipeline und Kennzahlen entstanden, hatten Dev und Ops einen gemeinsamen Arbeitsgegenstand.

**Einschätzung:** Der schwierigste Bereich, weil er sich nicht kaufen lässt. Eine Pipeline steht in zwei Wochen; eine Schuldkultur abzubauen dauert Monate und scheitert, sobald die Führung beim nächsten Ausfall wieder einen Schuldigen sucht.

## Automation

**In eigenen Worten:** Was automatisiert werden kann, wird automatisiert, um die Geschwindigkeit zu erhöhen. Die Automatisierungen sollen tatsächlich genutzt werden und nicht nur existieren. **Eine Pipeline ist nicht gleich DevOps, sondern nur ein Teil davon.**

Automatisierung dient zwei Zwecken: **Geschwindigkeit** (manuelle Schritte entfallen) und – wichtiger – **Wiederholbarkeit**, denn ein automatisierter Ablauf ist überprüfbar und reproduzierbar, ein manueller nie vollständig. Felder: Build, Test, Security-Scans (DevSecOps), Deployment inkl. Rollback, Infrastructure as Code, Monitoring/Alerting.

**In der Fallstudie:** Manuelle Tests und Deployments erzwangen den halbjährlichen Takt – ist jedes Release ein Kraftakt, macht man es selten, und weil man es selten macht, wird es noch riskanter. Die **CI/CD-Pipeline** durchbricht diesen Kreislauf; der Sprung auf wöchentliche Releases ist die direkte Folge.

**Einschätzung:** Der sichtbarste Bereich und deshalb oft mit DevOps gleichgesetzt. Über eine Mauer hinweg hätte die Pipeline nur die Übergabe automatisiert, nicht die Zusammenarbeit.

## Lean

**In eigenen Worten:** Verschwendung vermeiden und kontinuierlich verbessern.

Die häufigste Verschwendung in der Softwareentwicklung ist nicht die Arbeit, sondern die **Wartezeit dazwischen**: Code, der auf ein Review wartet; ein fertiges Feature, das auf das nächste Release wartet; ein Ticket zwischen zwei Teams. Dazu kommen Nacharbeit durch spät gefundene Fehler, unnötige Übergaben und nie genutzte Funktionen. Gegenmittel sind **kleine Batches** sowie Kanban-Boards, WIP-Limits und Wertstromanalyse.

**In der Fallstudie:** Die **Kanban-Boards** machen sichtbar, wo Arbeit liegen bleibt – bei getrennten Silos sah das vorher niemand. Der halbjährliche Zyklus war die grösste Verschwendung: Ein fertiges Feature wartete Monate, bevor es Nutzen stiftete. Auch „Kundenfeedback konnte nicht schnell genug umgesetzt werden“ ist ein Lean-Problem – die Durchlaufzeit war zu lang, um noch relevant zu sein.

**Einschätzung:** Der am meisten unterschätzte Bereich. Kanban wird in der Fallstudie fast nebenbei erwähnt, ist aber Voraussetzung dafür, die Kennzahlen zu interpretieren: Ohne sichtbaren Fluss weiss man nicht, *wo* die Lead Time verloren geht.

## Measurement

**In eigenen Worten:** Messbare Metriken sollen genutzt werden, um Prozesse zu optimieren.

Entscheidend ist das Wort **genutzt** – Kennzahlen, die erhoben, aber nie ausgewertet werden, sind selbst Verschwendung. Die vier DORA-Kennzahlen:

| Kennzahl | Aussage |
| --- | --- |
| Deployment Frequency | Durchsatz und Batchgrösse |
| Lead Time for Changes | Länge und Reibung des Wertstroms |
| Change Fail Rate | Stabilität der Änderungen |
| MTTR / Recovery Time | Widerstandsfähigkeit des Systems |

Wichtigster Befund von DORA: **Durchsatz und Stabilität sind kein Gegensatz.** Wer häufiger deployt, hat meist weniger Ausfälle, weil kleine Änderungen leichter zu prüfen und zurückzunehmen sind – genau die Annahme, die TechNovas Halbjahreszyklus begründete, ist damit widerlegt. Fallstricke: Vanity Metrics und Kennzahlen als Leistungsvergleich zwischen Teams (dann werden sie optimiert statt genutzt).

**In der Fallstudie:** Erhoben werden **Deployment-Frequenz, Lead Time und MTTR**. Damit gibt es erstmals eine gemeinsame, objektive Sprache – vorher stand Aussage gegen Aussage („Dev liefert schlechte Qualität“ vs. „Ops blockiert“). Die **Change Fail Rate** fehlt; ohne sie besteht das Risiko, nur Geschwindigkeit zu optimieren.

**Einschätzung:** Bestes Verhältnis von Aufwand zu Wirkung – die Kennzahlen fallen weitgehend automatisch aus Pipeline und Ticketsystem an und machen jede Diskussion sachlicher.

## Sharing

**In eigenen Worten:** Fehler müssen geteilt werden, um Prozesse indirekt zu optimieren, indem Fehler nicht wiederholt auftreten.

Sharing hat zwei Richtungen: **Fehler teilen** (ein Vorfall, aus dem nur ein Team lernt, tritt woanders erneut auf) und **Wissen teilen** (Runbooks, Architekturentscheidungen, Betriebswissen – Wissen in einzelnen Köpfen blockiert den Fluss, sobald diese Person fehlt). Über Fehler hinaus gehören auch Erfolge und Experimente dazu. Sharing **verstärkt** die anderen vier Bereiche.

**In der Fallstudie:** TechNova setzt hier am breitesten an – **internes Wiki**, **Lernformate**, **Erfahrungsberichte**. Letztere sind die direkte Antwort auf die Schuldkultur: Ein Fehler wird nicht mehr zugeordnet, sondern erzählt und ausgewertet. Das Wiki löst das Silo-Problem auf der Wissensebene: Solange Betriebswissen nur bei Ops liegt, kann Dev gar keine betreibbare Software bauen.

**Einschätzung:** Verfällt am schnellsten. Ein Wiki ist nach drei Monaten angelegt und nach zwölf veraltet, wenn Pflege nicht Teil der Definition of Done ist; Erfahrungsberichte brauchen einen festen Termin, sonst fallen sie beim ersten Zeitdruck aus.

---

## Zusammenspiel

Die fünf Bereiche bedingen einander – das erklärt, warum TechNova alle Massnahmen parallel eingeführt hat:

| Ohne … | … passiert Folgendes |
| --- | --- |
| Culture | Die Pipeline automatisiert die Übergabe über die Mauer, die Silos bleiben. |
| Automation | Gute Absichten scheitern an manueller Arbeit; Releases bleiben selten. |
| Lean | Es wird schnell geliefert, aber weiter in grossen Paketen mit langen Wartezeiten. |
| Measurement | Verbesserung beruht auf Meinung; niemand weiss, ob etwas gewirkt hat. |
| Sharing | Jedes Team macht dieselben Fehler erneut; Wissen bleibt personengebunden. |

## Quellen

- Atlassian, *What is the CALMS framework?* – <https://www.atlassian.com/devops/frameworks/calms-framework>
- Damon Edwards & John Willis, *DevOps Culture (CAMS)* – <https://itrevolution.com/articles/devops-culture-part-1/>
- DORA, *Software delivery performance metrics* – <https://dora.dev/guides/dora-metrics/>
- Gene Kim et al., *The DevOps Handbook*
- TBZ M324, *T1_Theorie_DevOps_Kultur.md* (Fallstudie TechNova) – <https://gitlab.com/ch-tbz-it/Stud/m324/-/blob/main/Projekt/T1_Theorie_DevOps_Kultur.md>
