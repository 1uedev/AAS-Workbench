# DONE

## Implemented

- Created static AAS Workbench MVP.
- Added main page with function cards.
- Added hash-based subpages:
  - `#home`
  - `#import`
  - `#generator`
  - `#gateway`
  - `#explorer`
- Added AAS JSON import.
- Added CSV import with mapping dialog.
- Added Excel `.xlsx` import with mapping dialog.
- Added manual AAS generator form.
- Added basic AAS validation:
  - Package arrays
  - Required IDs
  - `idShort` format
  - Missing `globalAssetId`
  - Missing `semanticId`
  - Submodel reference checks
  - Duplicate element `idShort` warnings
- Added explorer view for AAS, Submodels and Properties.
- Added search over loaded AAS structure.
- Added JSON export.
- Added real `.aasx` export as OPC/ZIP package with:
  - `[Content_Types].xml`
  - `_rels/.rels`
  - `aasx/aasx-origin`
  - `aasx/_rels/aasx-origin.rels`
  - `aasx/data.json`
- Added OPC UA / MQTT gateway mapping form.
- Added `GatewayMapping` Submodel generation.
- Added sample CSV data.
- Added README with setup and route documentation.
- Pushed initial code to GitHub:
  - Repository: `https://github.com/1uedev/AAS-Workbench.git`
  - Branch: `main`
  - Initial commit: `4c33bd4 Initial AAS Workbench MVP`

## Verified

- `node --check app.js`
- `node --check aasx-export.js`
- Browser smoke tests for:
  - Home route
  - Subpage navigation
  - Sample loading
  - Manual generator
  - Gateway mapping
  - JSON/AASX export button states
  - AASX export click without console errors
- Local `.aasx` package generated and inspected with `unzip -l`.
