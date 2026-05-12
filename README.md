# AAS Workbench

Ein kleines MVP für Asset Administration Shell Workflows.

## Funktionen

- Hauptseite mit Unterseiten fuer Import, Generator, Gateway, Repository, Dashboard und Explorer
- AASX und AAS-JSON per Dateiauswahl oder Drag-and-Drop laden und prüfen
- AAS manuell ueber einen Multi-Submodel-/Multi-Property-Generator mit Submodel-Templates und Vorschau erzeugen
- Generator und Repository unterscheiden Type-AAS und Instanz-AAS inklusive `derivedFrom`-Referenz und Type-Abgleich
- Generator und Repository unterscheiden passive, reaktive und proaktive AAS-Betriebsarten
- CSV- und Excel-Dateien (`.xlsx`) mit Mapping-Dialog und Batch-Optionen in eine einfache AAS-Struktur umwandeln
- OPC-UA-, MQTT- und REST-API-Quellen als Gateway-Mapping-Submodel dokumentieren, im Backend speichern und per Service verbinden, lesen oder abonnieren
- AAS versioniert in einem lokalen Repository speichern, laden, vergleichen, nach Asset/Manufacturer/Semantic ID/Submodel durchsuchen und Traceability Events anzeigen
- AAS-Strukturen gegen zentrale AAS-3.x-Metamodellregeln validieren
- AAS, Submodels und Submodel Elements per Tree navigieren und durchsuchen
- Explorer-Knoten im JSON-Edit-Modus bearbeiten und typische Validierungswarnungen per Korrekturvorschlag beheben
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

Die Validierung prueft zentrale AAS-3.x-Regeln: Pflichtfelder, `modelType`, `idShort`, Reference-/Key-Struktur, lokale ModelReference-Ziele, Submodel-Referenzen, `semanticId`-Ziele, lokale ConceptDescriptions, globale Semantic-ID-Kennungen, `DataTypeDefXsd`-Werte inklusive Wertebereich und Lexik, Unit-Qualifier sowie verschachtelte Submodel Elements wie Collections, Lists, Entities, Operations, Events und Relationships. Fuer reaktive und proaktive AAS werden zusaetzlich Laufzeitfaehigkeiten geprueft: Typ 2 braucht dokumentierte Endpunkte/Dienste und dynamische Datenzugriffe, Typ 3 zusaetzlich autonome Interaktionsbausteine wie Operationen, Events oder Capabilities. Issues werden nach Severity und Kategorien wie Struktur, Referenzen, Datentypen, Semantik, Units und Interoperabilitaet ausgewiesen.

Der Explorer bietet fuer geladene AAS einen JSON-Edit-Modus pro auswählbarem Objekt. Änderungen werden direkt auf die aktuell geladene AAS angewendet und anschließend neu validiert. Fuer typische Issues wie falsche Submodel-Referenztypen, fehlende `semanticId`, Leerzeichen in Werten oder inkonsistente Unit-Qualifier werden Korrekturvorschlaege als Buttons angeboten.

## Generator und Gateway

Der manuelle Generator erstellt aus Asset-Daten, mehreren Submodels und mehreren Properties pro Submodel direkt eine AAS-Umgebung. Dabei kann zwischen Type-AAS und Instanz-AAS unterschieden werden. Instanz-AAS koennen eine Type-AAS ueber `derivedFrom` referenzieren und speichern die Type-ID zusätzlich als `specificAssetId`. Zusaetzlich wird die technische Betriebsart als `AasRuntimeType`-Extension erfasst: Typ 1 passiv/dateibasiert, Typ 2 reaktiv/serverbasiert oder Typ 3 proaktiv/autonom. Fuer reaktive und proaktive AAS blendet der Generator Laufzeit-Descriptor-Felder fuer Service Endpoint, Service Name, Source Address und Sampling ein und schreibt ausgefuellte Angaben als `RuntimeServices`-Submodel in die AAS. Wiederverwendbare Submodel-Templates fuer Technical Data, Nameplate, Operational Data und Maintenance koennen eingefuegt und vorab geprueft werden. Eine Live-Vorschau zeigt vor der Erzeugung, welche AAS, Submodels und Properties entstehen.

Das Gateway-Formular ergänzt die aktuell geladene AAS um ein `GatewayMapping`-Submodel. Darin werden Protokoll, Endpoint/Broker/URL, OPC-UA-Node-ID, MQTT-Topic oder REST-JSON-Pfad, Ziel-Property und Sampling-Intervall abgelegt. OPC-UA-, MQTT- und REST-Mappings werden zusätzlich im lokalen Backend gespeichert. Der Gateway-Status fasst alle drei Protokolle zusammen und zeigt konfigurierte, aktive, getrennte und prüfbedürftige Mappings. Die Gateway-UI abonniert einen Live-Stream und zeigt zuletzt gelesene OPC-UA-Werte, empfangene MQTT-Nachrichten oder REST-API-Werte ohne manuelles Aktualisieren. Write-back ist standardmäßig gesperrt und nur fuer explizit aktivierte Mappings mit bestaetigter Write-/Publish-Aktion erlaubt. Wenn `node-opcua` installiert ist, kann der Backend-Service OPC-UA-Verbindungen öffnen, Werte lesen und sichere Werte schreiben. Wenn `mqtt` installiert ist, kann der Backend-Service MQTT-Broker verbinden, Topics abonnieren und Nachrichten auf exakte, wildcard-freie Topics publishen. REST-API-Mappings nutzen die Node-Laufzeit, lesen JSON-Werte per Pfad und senden Write-back als JSON per POST, PUT oder PATCH.

## Dashboard Builder

Der Dashboard Builder erstellt Widgets aus den Submodel Elements der aktuell geladenen AAS. `Card`-Widgets zeigen den letzten Wert mit Einheit, Value Type, Pfad und Semantic ID. `Chart`-Widgets sind fuer numerische Werte verfuegbar und halten eine kleine Wertehistorie aus manueller oder automatischer Aktualisierung. Layouts werden lokal im Browser gespeichert und koennen spaeter auf dieselbe AAS-Struktur angewendet werden.

## Start

```bash
npm install
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
GET  /api/gateway
GET  /api/gateway/stream
GET  /api/opcua
GET  /api/opcua/connections
POST /api/opcua/connections
POST /api/opcua/connections/:id/connect
POST /api/opcua/connections/:id/read
POST /api/opcua/connections/:id/write
POST /api/opcua/connections/:id/disconnect
GET  /api/mqtt
GET  /api/mqtt/subscriptions
POST /api/mqtt/subscriptions
POST /api/mqtt/subscriptions/:id/connect
POST /api/mqtt/subscriptions/:id/publish
POST /api/mqtt/subscriptions/:id/disconnect
GET  /api/rest
GET  /api/rest/endpoints
POST /api/rest/endpoints
POST /api/rest/endpoints/:id/read
POST /api/rest/endpoints/:id/write
```

Die Repository-Daten werden lokal in `data/repository.json` gespeichert. Diese Datei ist absichtlich nicht versioniert.
Die Gateway-Konfiguration fuer OPC UA, MQTT und REST API wird lokal in `data/gateway.json` gespeichert. Diese Datei ist absichtlich nicht versioniert.
Im Repository kann ein gespeichertes AAS ueber zwei Versionsauswahlen verglichen werden. Der Compare View zeigt Kennzahlen, Version-Metadaten und strukturelle Unterschiede fuer AAS, Submodels und Submodel Elements.
Die Repository-Liste kann nach Asset-ID/AAS-ID/Name, AAS-Art, AAS-Betriebsart, Manufacturer-Werten, Semantic IDs und Submodel-ID oder `idShort` gefiltert werden. Dafuer wird die jeweils letzte gespeicherte Version des AAS ausgewertet. Instanz-AAS mit Type-AAS-Referenz zeigen einen kontrollierten Type-Abgleich: fehlende Submodels und Properties aus der Type-Struktur werden sichtbar gemacht, ohne Instanzdaten automatisch zu ueberschreiben.
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

- Submodel-Template-Katalog und semantische Mapping-Hilfen
- Laufzeitfaehigkeits-Checks fuer reaktive und proaktive AAS
- Gefuehrte Type-to-Instance-Sync-Vorschlaege fuer fehlende Submodels/Properties
- Document-Intelligence-Import fuer technische Daten und Zertifikate
- Automatisierte Browser- und Import-/Export-Tests
