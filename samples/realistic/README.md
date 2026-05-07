# Realistic Manufacturing AAS Samples

These sample files describe a coherent manufacturing environment for housing production in `LINE_A_HOUSING`.

## Assets

- `01-cnc-milling-machine`
  - CNC milling machine for housing machining.
  - Includes technical data, operational data, maintenance data and line assignment.
- `02-robot-loading-cell`
  - Robot cell loading and unloading the CNC machine.
  - Includes an OPC UA gateway mapping example.
- `03-conveyor-transfer-system`
  - Conveyor segment between machining and inspection.
  - References the CNC machine as upstream asset and vision station as downstream asset.
- `04-vision-inspection-station`
  - Vision inspection station for final housing quality checks.
  - Includes quality KPIs such as pass rate and reject count.
- `05-line-energy-meter`
  - Energy meter for the production line main feeder.
  - Includes current power, energy today and energy per part.

Each asset is available as:

- `.json`: readable AAS environment payload
- `.aasx`: OPC/ZIP AASX package importable by the Workbench
