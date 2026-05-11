# AAS Workbench

Ein kleines MVP für Asset Administration Shell Workflows.

## Funktionen

- Hauptseite mit Unterseiten fuer Import, Generator, Gateway, Repository, Dashboard und Explorer
- AASX und AAS-JSON per Dateiauswahl oder Drag-and-Drop laden und prüfen
- AAS manuell ueber einen Multi-Submodel-/Multi-Property-Generator mit Submodel-Templates und Vorschau erzeugen
- CSV- und Excel-Dateien (`.xlsx`) mit Mapping-Dialog und Batch-Optionen in eine einfache AAS-Struktur umwandeln
- OPC-UA- und MQTT-Quellen als Gateway-Mapping-Submodel dokumentieren
- AAS versioniert in einem lokalen Repository speichern, laden, vergleichen, nach Asset/Manufacturer/Semantic ID/Submodel durchsuchen und Traceability Events anzeigen
- AAS-Strukturen gegen zentrale AAS-3.x-Metamodellregeln validieren
- AAS, Submodels und Submodel Elements per Tree navigieren und durchsuchen
- Dashboard-Karten und Numeric-Charts aus geladenen Submodel Elements erstellen, speichern und live aktualisieren
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

Die Validierung prueft zentrale AAS-3.x-Regeln: Pflichtfelder, `modelType`, `idShort`, Reference-/Key-Struktur, lokale ModelReference-Ziele, Submodel-Referenzen, `semanticId`-Ziele, lokale ConceptDescriptions, globale Semantic-ID-Kennungen, `DataTypeDefXsd`-Werte inklusive Wertebereich und Lexik, Unit-Qualifier sowie verschachtelte Submodel Elements wie Collections, Lists, Entities, Operations, Events und Relationships. Issues werden nach Severity und Kategorien wie Struktur, Referenzen, Datentypen, Semantik, Units und Interoperabilitaet ausgewiesen.

## Generator und Gateway

Der manuelle Generator erstellt aus Asset-Daten, mehreren Submodels und mehreren Properties pro Submodel direkt eine AAS-Umgebung. Wiederverwendbare Submodel-Templates fuer Technical Data, Nameplate, Operational Data und Maintenance koennen eingefuegt und vorab geprueft werden. Eine Live-Vorschau zeigt vor der Erzeugung, welche AAS, Submodels und Properties entstehen.

Das Gateway-Formular ergänzt die aktuell geladene AAS um ein `GatewayMapping`-Submodel. Darin werden Protokoll, Endpoint/Broker, OPC-UA-Node-ID oder MQTT-Topic, Ziel-Property und Sampling-Intervall abgelegt. Es ist aktuell eine exportierbare Konfiguration, noch keine Live-Verbindung zu OPC UA oder MQTT.

## Dashboard Builder

Der Dashboard Builder erstellt Widgets aus den Submodel Elements der aktuell geladenen AAS. `Card`-Widgets zeigen den letzten Wert mit Einheit, Value Type, Pfad und Semantic ID. `Chart`-Widgets sind fuer numerische Werte verfuegbar und halten eine kleine Wertehistorie aus manueller oder automatischer Aktualisierung. Layouts werden lokal im Browser gespeichert und koennen spaeter auf dieselbe AAS-Struktur angewendet werden.

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
http://localhost:8081/#dashboard
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
Die Repository-Liste kann nach Asset-ID/AAS-ID/Name, Manufacturer-Werten, Semantic IDs und Submodel-ID oder `idShort` gefiltert werden. Dafuer wird die jeweils letzte gespeicherte Version des AAS ausgewertet.
Die Repository-Rolle steuert den Zugriff: `Viewer` darf laden, vergleichen und Traceability Events ansehen; `Editor` und `Admin` duerfen zusaetzlich neue AAS-Versionen speichern. Die Rolle wird als `X-Workbench-Role` an die API gesendet, und der Server blockiert Schreibzugriffe fuer read-only Rollen.
Der Event-View zeigt gespeicherte Traceability Events mit Version, Zeitpunkt, Bearbeiter, Rolle, Asset-ID und Shell-ID.

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

Der Mapping-Dialog unterstuetzt Batch-Optionen fuer Gruppierung nach Asset ID oder eine einzelne AAS, Umgang mit doppelten Properties und das Ueberspringen leerer Value-Zeilen.

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
- Submodel-Template-Katalog und semantische Mapping-Hilfen
- Backend-API mit Repository und Versionierung
