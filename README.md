# AAS Workbench

Ein kleines MVP für Asset Administration Shell Workflows.

## Funktionen

- Hauptseite mit Unterseiten fuer Import, Generator, Gateway und Explorer
- AASX und AAS-JSON laden und prüfen
- AAS manuell über ein Generator-Formular erzeugen
- CSV- und Excel-Dateien (`.xlsx`) mit Mapping-Dialog in eine einfache AAS-Struktur umwandeln
- OPC-UA- und MQTT-Quellen als Gateway-Mapping-Submodel dokumentieren
- Pflichtfelder, `idShort`-Format und Submodel-Referenzen validieren
- AAS, Submodels und Properties durchsuchen
- Ergebnis als JSON oder `.aasx` exportieren

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

## Generator und Gateway

Der manuelle Generator erstellt aus Asset-, Submodel- und Property-Feldern direkt eine AAS-Umgebung.

Das Gateway-Formular ergänzt die aktuell geladene AAS um ein `GatewayMapping`-Submodel. Darin werden Protokoll, Endpoint/Broker, OPC-UA-Node-ID oder MQTT-Topic, Ziel-Property und Sampling-Intervall abgelegt. Es ist aktuell eine exportierbare Konfiguration, noch keine Live-Verbindung zu OPC UA oder MQTT.

## Start

```bash
python3 -m http.server 8081
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
http://localhost:8081/#explorer
```

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

## Nächste sinnvolle Ausbaustufen

- Live-Gateway-Backend fuer OPC UA und MQTT
- Validierung gegen AAS-Metamodell 3.x
- Submodel-Template-Katalog
- Backend-API mit Repository und Versionierung
