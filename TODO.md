# TODO

This file only tracks open work. Completed work belongs in `DONE.md`.

## Next

- [ ] Add severity levels and validation categories.

## Validator Enhancements

- [ ] Check semantic IDs more deeply.
- [ ] Check data types more deeply.
- [ ] Check references more deeply.
- [ ] Check units more deeply.
- [ ] Add machine-readable validation report export.

## Generator Enhancements

- [ ] Add reusable Submodel templates.
- [ ] Add richer batch generation controls for mapped tables.
- [ ] Add template preview before generation.

## Repository Enhancements

- [ ] Add search by asset.
- [ ] Add search by manufacturer.
- [ ] Add search by semantic ID.
- [ ] Add search by submodel.
- [ ] Add roles and access control.
- [ ] Add explicit traceability event view in the UI.

## AAS Dashboard Builder

- [ ] Create dashboard cards from selected Submodel Elements.
- [ ] Add chart widgets for numeric values.
- [ ] Add saved dashboard layouts.
- [ ] Add live value display once gateway backend exists.

## Live OPC UA / MQTT Gateway Backend

- [ ] Build backend service for OPC UA connections.
- [ ] Build backend service for MQTT subscriptions.
- [ ] Stream live values into the UI.
- [ ] Persist gateway mappings and status.
- [ ] Support write-back where safe.

## AAS Semantic Mapper

- [ ] Add semantic ID suggestions.
- [ ] Add mapping dictionary for common field names.
- [ ] Add IDTA template references.
- [ ] Add conflict detection for duplicate mappings.
- [ ] Add conflict detection for incompatible mappings.

## AAS Document Intelligence

- [ ] Extract technical data from PDFs.
- [ ] Extract certificates from documents.
- [ ] Extract documentation metadata.
- [ ] Convert extracted facts into Submodel Elements.
- [ ] Add review workflow before writing extracted data to AAS.

## AAS Marketplace / Catalog

- [ ] Add catalog view for published AAS packages.
- [ ] Add download and import flow.
- [ ] Add certification/status metadata.
- [ ] Add compatibility checks.

## AAS Lifecycle Tracker

- [ ] Add lifecycle state model.
- [ ] Track engineering events.
- [ ] Track production events.
- [ ] Track operation events.
- [ ] Track maintenance events.
- [ ] Track recycling events.
- [ ] Add event history Submodel.
- [ ] Add Digital Product Passport alignment.

## Technical Debt / Quality

- [ ] Add automated browser tests for routes and core workflows.
- [ ] Add unit tests for CSV parsing.
- [ ] Add unit tests for XLSX parsing.
- [ ] Add unit tests for AASX export.
- [ ] Split large `app.js` into focused modules.
- [ ] Add linting setup.
- [ ] Add formatting setup.
- [ ] Consider a lightweight build step once dependencies become useful.
- [ ] Add GitHub Pages deployment.
