# Continuous Integration

## Was sind die Vor- und Nachteile von CI?

Themen

1. Was ist Continuous Integration (CI) und wie wird es umgesetzt?

- Welche Bedeutung hat Continuous Integration im Softwareentwicklungsprozess?

    Es bedeuted, dass Codeänderungen regelmässig in einem Zentralen Repository zusammengeführt werden statt. Diese Änderungen werden automatisiert vom System getestet.

    Quelle: <https://asana.com/de/resources/continuous-integration>

- Welche technischen Prozesse und Werkzeuge ermöglichen eine erfolgreiche Implementierung von CI?

    Git ist das am meist genutzten System, welches genutzt wird um Codeänderungen zu verfolgen. Tools wie GitHub, GitLab oder BitBucket nutzen Git und speicher den tatsächlichen Code.

    Die genannten Tools stellen meist auch Pipeline-tools zur verfügung. Zum Beispiel GitHub actions können mit yaml files beschrieben werden und werden automatisch ausgeführt.

    Quelle: <https://www.atlassian.com/de/continuous-delivery/continuous-integration/tools>

- Welche Rolle spielt CI in der Automatisierung und Zusammenarbeit in Teams?

    Es spielt eine grosse Rolle, es ist ein Kontinuierlicher Prozess und Praktik die imemr ausgeführt werden muss um es zu erhalten. Neue pipeline Tests müssen geschrieben werden, Änderungen müssen oft hochgeladen um komplikationen zu vermeiden.

    Quelle: <https://asana.com/de/resources/continuous-integration>

1. Was sind die Vor- und Nachteile von CI?

- Welche Vorteile bringt die Einführung von CI für die Softwareentwicklung?

    Durch das konstante Testen der Änderungen werden Fehler schnell erkannt und können früh behoben werden. Wenn Code regelmässig hochgeladen wird sind alle beteiligten immer relativ up to date und es vereinfacht die Kollaboration dadurch.

    Quelle: <https://www.redhat.com/de/topics/devops/what-is-ci-cd>

- Welche Herausforderungen können bei der Implementierung und im Betrieb von CI auftreten?

  - Effizienz
  - Testabdeckung
  - Einführung im Team(Änderung in der Arbeitsweise)
  - Skalierung bei Wachstum
  - Tests müssen immer Gründlich gehalten werden um keine Schulden einzutreiben

    Quelle: <https://aqua-cloud.io/de/ci-cd-challenges/>

- Wie beeinflusst CI langfristig die Produktqualität und den Workflow in einem Team?

    Wenn es richtig eingesetzt wird, ist CI ein mächtiges Tool um die Qualität eines Produktes zu steigern oder zu erhalten da es konstant getestet wird und ein Framework zur Qualitätskontrolle bietet. Der Workflow ist auch zentralisiert und hilft bei der Kollaboration.

    Quelle: <https://www.redhat.com/de/topics/devops/what-is-ci-cd>

1. Was ist Continuous Testing, und wie wird es umgesetzt?

- Wie unterscheidet sich Continuous Testing von traditionellen Testmethoden?

    Das Traditionelle Testen ist meist sehr genau dokumentiert und definiert. Es wird meist auch Phasenhaft ausgeführt und manuell. Diese tests sollten Mängel erkennen am Produkt.

    Das kontinuierliche Testen ist immer Automatisiert und passier viel öfters, es geht vor allem um eine Qualitätserhaltung und zum Beispiel, dass keine kaputten Builds an die Öfftentlichkeit gelangen, es gibt den Entwicklern ein direktes Feedback welches auch schnell addressiert werden kann.

    Quelle: <https://digital.ai/de/catalyst-blog/continuous-testing-vs-traditional-testing/>

- Welche Rolle spielt Continuous Testing im Entwicklungszyklus?

    Es soll schnelles Feedback an den Entwickler geben um die Softwareentwicklung zu beschleunigen.

    Quelle: <https://digital.ai/de/catalyst-blog/continuous-testing-vs-traditional-testing/>

- Welche Arten von Tests werden dabei typischerweise automatisiert, und wie wird ihre Effektivität sichergestellt?

  - Unit tests
  - Integrationstests
  - Systemtests(E2E)

    Mit Code coverage kann man fesstellen wie viel prozent von dem geschriebenen Code in den Tests ausgeführt wird.

    Wenn ein automatisierter test fehlschlägt sollte am besten die ganze Pipeline für diesen Commit unterbrochen werden.

    Quelle: <https://polygon-software.ch/blog/automatisierte-tests-in-der-softwareentwicklung-wie-man-anfaengt/>

1. Was ist eine Branching-Strategie, und welches sind die bekanntesten Ansätze?

- Nehmen Sie spziell den trunk based Ansatz in den Vergleich auf.

    In der Stamm basierten Entwicklung gehen alle commits direkt auf den Main Ast und somit sind alle involvierten Personen immer auf dem neusten stand. Arbeit wird meist hinter Flaggen gehalten um nicht in Konflikte zu geraten, so können auch unfertige Arbeiten auf dem Stamm sein.

    Mit Ästen ist alles separat und wird sehr langsam in den Hauptstamm verschmolzen. Arbeiten sind nicht im Direkten Konflikt und können auf dem jeweiligen Ast fertig gestellt werden.

    Das stammbasierte Entwickeln ist um einiges direkter und wenn eine Änderung ein Problem einführt ist das ganze Produkt beinträchtigt.

    Quelle: <https://www.atlassian.com/de/continuous-delivery/continuous-integration/trunk-based-development>

- Warum sind Branching-Strategien für die Versionskontrolle wichtig?

    Mit Ästen ist der Hauptstamm fast immer geschützt ausser ein Ast wird in ihn verschmolzen. Es bietet den Entwicklern eine klare Struktur und Unterteilung der Arbeitsbereiche die auch völlig unabhängig von einander sind.

    Quelle: <https://www.atlassian.com/de/agile/software-development/branching>

- Wie beeinflussen unterschiedliche Strategien die Code-Organisation und den Arbeitsfluss in Teams?

    Es geht vor allem um die Zusammenarbeit, mit Branches ist alles sehr stark isoliert und ein Hauptstamm fördert die zusammenarbeit auf einem grösseren Niveau.

    Quelle: <https://www.atlassian.com/microservices/microservices-architecture/microservices-vs-monolith>

- Welche Branching-Strategien werden häufig verwendet, und worin unterscheiden sie sich?

  - Git-Flow:

        Hier werden Äste für langlebende Releases verwendet. Es git den Hauptast welcher die stabile Version darstell und für die Entwicklung gibt es einen eigenen Ast. Arbeit wir zuerst in den Entwicklungsast und danach in den Hauptast verschmolzen.
  - GitHub Flow

        Für jedes Feature gibt es einen Branch welche nur relativ kurz leben und bald in den main Branch verschmolzen werden.

    Quelle: <https://www.hsbi.de/elearning/data/FH-Bielefeld/lm_data/lm_1359639/git/branching-strategies.html>

1. Wie kann man Commits und Branches mit User Stories verknüpfen?

- Warum ist es sinnvoll, Codeänderungen mit User Stories zu verknüpfen?

    Wenn diese Verknüpfung stattfinded ist es direkt klarer wieso Änderungen gemacht werden.

    Quelle: <https://www.atlassian.com/de/agile/project-management/user-stories>

- Welche Praktiken und Namenskonventionen können helfen, diese Verknüpfung effektiv umzusetzen?

    Wenn man mit Branches arbeitet kann man diese entsprechen benennen.

  - `chore/Aufgabe`
  - `bugfix/Fix`
  - `feature/Funktionsname`

  Quelle: <https://dev.to/faidterence/best-practices-for-branch-naming-conventions-and-effective-commit-messages-ma8>

- Wie unterstützen Tools die Verbindung zwischen Aufgabenmanagement und Code-Repositories?

    Tools die direkt mit dem versionierungssystem verbunden sind können dabei helfen zu erklären wozu diese Änderung gehört. Wenn bugs oder feature requests direk an eine Änderung gehängt werden, ist es einfach diese zu lesen und verstehen.

    Quelle: <https://docs.github.com/de/issues/tracking-your-work-with-issues/learning-about-issues/planning-and-tracking-work-for-your-team-or-project>

1. Welche Merge-Strategien gibt es, und wann werden sie verwendet?

- Welche Ansätze gibt es, um Änderungen aus einem Branch in einen anderen zu integrieren?

    Git-Merge:

        Hier gibt es einen sogenannten merge commit, wo der Main branch und der andere Branch verschmolzen wird und die Konflikte regelt.

    Git-Rebase

        Mit dieser Strategie werden die commits direkt aneinandergereit, kein merge commit, sondern der neue Kopf wird einfach auf den kopf des anderen Branches gesetzt.

    Quelle: <https://www.atlassian.com/de/git/tutorials/merging-vs-rebasing>

- Wie beeinflussen unterschiedliche Merge-Strategien die Historie und die Nachvollziehbarkeit von Änderungen?

    Bei Merge bleiben die Änderungen im Ast jeweils einsehbar und abgetrennt.

    Bei Rebasing wird alles in eine Linie arrangiert und somit wird ein bisschen vermischt welcher commit für was gemacht wurde, man kann einfach einsehen wer wann welche Änderung gemacht hat.

    Quelle: <https://www.atlassian.com/de/git/tutorials/merging-vs-rebasing>

- Unter welchen Umständen wird welche Strategie bevorzugt?

    Bei Merge bevorzugt man Nachvollziehbarkeit und Kollaboration.

    Ein Rebase funktioniert am besten wenn man alleine arbeitet und eine saubere Änderungslinie will.

    Quelle: <https://www.atlassian.com/de/git/tutorials/merging-vs-rebasing>

1. Was ist Semantic Versioning, und wie wird es eingesetzt?

- Wie hilft Semantic Versioning bei der Verwaltung von Software-Versionen?

    Semantic Versioning zeigt immer den Grad der Veränderung an. Es ist unterteilt in die folgenden Bereiche.

    Quelle: <https://semver.org/lang/de/>
- Welche Konventionen werden bei Semantic Versioning angewendet?

    ```
                   Minor change
                   |
                v2.9.31
                |     |
     Major change     Patch
    ```

    Quelle: <https://semver.org/lang/de/>

- Warum ist Semantic Versioning wichtig für die Kompatibilität und Kommunikation von Änderungen?

    Major change können grosse Änderungen z B neue APIs und dementsprechend Rückwärtskompatibilität beinträchtigen.

1. Welchen Unterschied haben Mono- und Multirepo-Ansätze im Kontext von Microservices?

- Wie unterscheiden sich Mono- und Multirepo-Ansätze in der Organisation von Code?

    Bei einem Monorepo liegt der Code von allen Projekten oder Services in einem einzigen Repository. Beim Multirepo hat jeder Service sein eigenes Repository mit eigener Historie und eigener Pipeline.

    Quelle: <https://www.atlassian.com/git/tutorials/monorepos>

- Welche Vor- und Nachteile haben beide Ansätze speziell für die Entwicklung und Wartung von Microservices?

  - Monorepo:

        Änderungen die mehrere Services betreffen können in einem Commit gemacht werden und man sieht sofort ob etwas kaputt geht. Gemeinsame Bibliotheken müssen nicht versioniert und publiziert werden. Dafür wird das Repository mit der Zeit sehr gross und die Pipeline muss wissen welche Teile sie überhaupt bauen muss.
  - Multirepo:

        Jeder Service ist klar abgegrenzt, hat einen eigenen Release-Zyklus und eine schlanke Pipeline. Dafür sind Änderungen über mehrere Services hinweg mühsam, da sie auf mehrere Repositories und Pull Requests aufgeteilt werden müssen.

    Quelle: <https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/monorepo-vs-multirepo>

- Wie beeinflussen die Ansätze die Skalierbarkeit, Zusammenarbeit und Abhängigkeiten zwischen Teams?

    Ein Monorepo fördert die Zusammenarbeit, weil alle den gleichen Code sehen und Abhängigkeiten immer auf dem gleichen Stand sind. Dafür braucht es bei Wachstum zusätzliche Werkzeuge, damit nicht bei jeder Änderung alles gebaut wird.

    Ein Multirepo skaliert bei vielen Teams besser, weil jedes Team unabhängig arbeiten und deployen kann. Die Abhängigkeiten müssen dann aber über versionierte Pakete geregelt werden, was schnell zu unterschiedlichen Versionsständen führen kann.

    Quelle: <https://www.atlassian.com/git/tutorials/monorepos>

1. Was ist ein Artifact-Repository, und welche Aufgaben erfüllt es?

- Welche Rolle spielt ein Artifact-Repository in der Softwareentwicklung und im Bereitstellungsprozess?

    Ein Artifact-Repository ist der zentrale Speicherort für alles was in der Pipeline gebaut wird. Der Build wird also nur einmal ausgeführt, das Resultat wird abgelegt und danach in jeder Umgebung genau das gleiche Artefakt verwendet.

    Quelle: <https://jfrog.com/de/knowledge-base/what-is-an-artifact-repository/>

- Welche Arten von Artefakten werden typischerweise in einem Repository verwaltet?

  - Build-Resultate wie `.jar`, `.dll` oder `.zip`
  - Pakete aus Paketmanagern wie npm, NuGet oder Maven
  - Container-Images
  - Abhängigkeiten von Drittanbietern die gespiegelt werden

    Quelle: <https://www.jfrog.com/confluence/display/JFROG/Package+Management>

- Warum ist ein Artifact-Repository wichtig für CI/CD-Pipelines?

    Es sorgt dafür, dass die Artefakte versioniert und nachvollziehbar sind. Man weiss dadurch genau welche Version auf welcher Umgebung läuft und kann bei einem Fehler auf eine ältere Version zurück. Ausserdem müssen Abhängigkeiten nicht bei jedem Build neu aus dem Internet geladen werden, was die Pipeline schneller und stabiler macht.

    Quelle: <https://www.redhat.com/de/topics/devops/what-is-ci-cd>
