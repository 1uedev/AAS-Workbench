# AAS Workbench

Ein kleines MVP für Asset Administration Shell Workflows.

## Funktionen

- Hauptseite mit Unterseiten fuer Import, Generator, Gateway und Explorer
- AASX und AAS-JSON per Dateiauswahl oder Drag-and-Drop laden und prüfen
- AAS manuell über einen Multi-Submodel-/Multi-Property-Generator erzeugen
- CSV- und Excel-Dateien (`.xlsx`) mit Mapping-Dialog in eine einfache AAS-Struktur umwandeln
- OPC-UA- und MQTT-Quellen als Gateway-Mapping-Submodel dokumentieren
- AAS versioniert in einem lokalen Repository speichern und laden
- AAS-Strukturen gegen zentrale AAS-3.x-Metamodellregeln validieren
- AAS, Submodels und Submodel Elements per Tree navigieren und durchsuchen
- Ausgewaehlte Explorer-Knoten im Side-by-side JSON Inspector pruefen
- Zwei Repository-Versionen eines AAS vergleichen und Aenderungen nach hinzugefuegt, entfernt und geaendert sehen
- Ergebnis als JSON, `.aasx`, PDF-Report, Excel-Arbeitsmappe oder Validierungsreport exportieren

## AASX-Export

Der `.aasx`-Import liest einen OPC/ZIP-Container, folgt der `aasx-origin` Relationship und lädt die per `aas-spec` referenzierte JSON-Datei.

Der `.aasx`-Export erzeugt einen echten OPC/ZIP-Container mit dieser Struktur:

```text
[Content_Types].xml
_rels/.rels
aasx/aasx-origin
aasx/_rels/aasx-origin.rels
aasx/data.json
```

`aasx/data.json` enthält die aktuell geladene AAS-Umgebung.

## PDF-Export

Der PDF-Export erzeugt einen kompakten Report zur aktuell geladenen AAS-Umgebung mit Dateiinfo, Validierungsstatus, Severity-/Kategorieangaben, Kennzahlen, AAS-IDs, referenzierten Submodels und Submodel Elements.

## Excel-Export

Der Excel-Export erzeugt eine `.xlsx`-Arbeitsmappe mit getrennten Sheets fuer Summary, AAS, Submodels, Elements und Issues inklusive Severity und Kategorie. Damit lassen sich AAS-Daten direkt filtern, auswerten und in andere Werkzeuge uebernehmen.

## Validierungsreport-Export

Der Validierungsreport-Export erzeugt eine maschinenlesbare JSON-Datei mit Schema-Kennung, Erstellzeitpunkt, Status, Kennzahlen, Issue-Counts, Kategorie-Counts, AAS-/Submodel-Zusammenfassung und vollstaendiger Issue-Liste.

## Validierung

Die Validierung prueft zentrale AAS-3.x-Regeln: Pflichtfelder, `modelType`, `idShort`, Reference-/Key-Struktur, Submodel-Referenzen, `DataTypeDefXsd`-Werte sowie verschachtelte Submodel Elements wie Collections, Lists, Entities, Operations, Events und Relationships. Issues werden nach Severity und Kategorien wie Struktur, Referenzen, Datentypen, Semantik und Interoperabilitaet ausgewiesen.

## Generator und Gateway

Der manuelle Generator erstellt aus Asset-Daten, mehreren Submodels und mehreren Properties pro Submodel direkt eine AAS-Umgebung.

Das Gateway-Formular ergänzt die aktuell geladene AAS um ein `GatewayMapping`-Submodel. Darin werden Protokoll, Endpoint/Broker, OPC-UA-Node-ID oder MQTT-Topic, Ziel-Property und Sampling-Intervall abgelegt. Es ist aktuell eine exportierbare Konfiguration, noch keine Live-Verbindung zu OPC UA oder MQTT.

## Start

```bash
node server.js
```

Danach im Browser öffnen:

```text
http://localhost:8081
```

Unterseiten:

```text
http://localhost:8081/#import
http://localhost:8081/#generator
http://localhost:8081/#gateway
http://localhost:8081/#repository
http://localhost:8081/#explorer
```

## Backend und Versionierung

`server.js` liefert die statische App aus und stellt ein kleines API bereit:

```text
GET  /api/aas
POST /api/aas
GET  /api/aas/:id
GET  /api/aas/:id/versions
GET  /api/aas/:id/versions/:version
GET  /api/aas/:id/events
```

Die Repository-Daten werden lokal in `data/repository.json` gespeichert. Diese Datei ist absichtlich nicht versioniert.
Im Repository kann ein gespeichertes AAS ueber zwei Versionsauswahlen verglichen werden. Der Compare View zeigt Kennzahlen, Version-Metadaten und strukturelle Unterschiede fuer AAS, Submodels und Submodel Elements.

## Tabellenimport

CSV- und Excel-Dateien brauchen eine Kopfzeile. Die Spaltennamen können frei sein, weil die App beim Import einen Mapping-Dialog öffnet.

Diese Zielfelder werden unterstützt:

```text
assetId,assetName,submodelId,submodelName,idShort,valueType,value,semanticId,unit
```

Pflichtfelder:

```text
assetId, assetName, submodelId, submodelName, idShort, valueType, value
```

Siehe [samples/sample-assets.csv](samples/sample-assets.csv).

Weitere realistische Beispieldaten liegen unter [samples/realistic](samples/realistic):

- CNC milling machine
- Robot loading cell
- Conveyor transfer system
- Vision inspection station
- Line energy meter

Jedes Beispiel ist als `.json` und als importierbares `.aasx` vorhanden.

## Nächste sinnvolle Ausbaustufen

- Live-Gateway-Backend fuer OPC UA und MQTT
- Tiefere `semanticId`- und Referenzpruefungen
- Submodel-Template-Katalog
- Backend-API mit Repository und Versionierung
