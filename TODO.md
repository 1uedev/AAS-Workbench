# TODO

## Next Recommended Work

- Implement `.aasx` import:
  - Read OPC/ZIP package
  - Resolve `/_rels/.rels`
  - Follow `aasx-origin`
  - Resolve `aasx/_rels/aasx-origin.rels`
  - Load `aasx/data.json`
  - Run the existing validator and explorer on the imported package

## Original Product Topics

1. AAS Explorer / Viewer
   - Improve tree navigation for AAS, Submodels and Submodel Elements
   - Add side-by-side JSON inspector
   - Add compare view for two AAS versions
   - Add export to PDF or Excel

2. AAS Validator
   - Add validation against AAS Metamodel 3.x
   - Add severity levels and categories
   - Check semantic IDs, data types, references and units more deeply
   - Add machine-readable validation report export

3. AAS Generator
   - Add reusable Submodel templates
   - Add multi-property manual entry
   - Add batch generation from mapped tables
   - Add template preview before generation

4. AAS Registry / Repository
   - Add persistent storage
   - Add version history
   - Add search by asset, manufacturer, semantic ID and submodel
   - Add roles and access control

5. AAS Dashboard Builder
   - Create dashboard cards from selected Submodel Elements
   - Add chart widgets for numeric values
   - Add saved dashboard layouts
   - Add live value display once gateway backend exists

6. AAS-to-OPC-UA / MQTT Gateway
   - Build backend service for OPC UA connections
   - Build backend service for MQTT subscriptions
   - Stream live values into the UI
   - Persist gateway mappings and status
   - Support write-back where safe

7. AAS Semantic Mapper
   - Add semantic ID suggestions
   - Add mapping dictionary for common field names
   - Add IDTA template references
   - Add conflict detection for duplicate or incompatible mappings

8. AAS Document Intelligence
   - Extract technical data from PDFs
   - Extract certificates and documentation metadata
   - Convert extracted facts into Submodel Elements
   - Add review workflow before writing to AAS

9. AAS Marketplace / Catalog
   - Add catalog view for published AAS packages
   - Add download and import flow
   - Add certification/status metadata
   - Add compatibility checks

10. AAS Lifecycle Tracker
    - Add lifecycle state model
    - Track engineering, production, operation, maintenance and recycling events
    - Add event history Submodel
    - Add Digital Product Passport alignment

## Technical Debt / Quality

- Add automated browser tests for routes and core workflows
- Add unit tests for CSV parsing, XLSX parsing and AASX export
- Split large `app.js` into focused modules
- Add linting and formatting setup
- Consider a lightweight build step once dependencies become useful
- Add GitHub Pages deployment
