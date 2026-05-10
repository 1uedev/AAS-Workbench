export function createValidationReportBlob(aasPackage, validationReport, options = {}) {
  return new Blob([JSON.stringify(createValidationReport(aasPackage, validationReport, options), null, 2)], {
    type: "application/json",
  });
}

export function createValidationReport(aasPackage, validationReport = {}, options = {}) {
  const issues = validationReport.issues ?? [];
  const stats = validationReport.stats ?? packageStats(aasPackage);
  const issueCounts = countIssues(issues);
  const categoryCounts = countIssuesByCategory(issues);
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();

  return {
    schema: "aas-workbench.validation-report.v1",
    generatedAt: generatedAt.toISOString(),
    sourceFile: options.fileName ?? "aas-export",
    validator: {
      name: "AAS Workbench",
      aasVersion: "3.x",
    },
    status: issueCounts.errors > 0 ? "invalid" : issueCounts.warnings > 0 ? "warnings" : "valid",
    summary: {
      stats,
      issueCounts,
      categoryCounts,
    },
    package: extractPackageSummary(aasPackage),
    issues: issues.map((issue, index) => ({
      index: index + 1,
      severity: issue.severity ?? issue.level ?? "warning",
      level: issue.level ?? issue.severity ?? "warning",
      category: issue.category ?? "structure",
      path: issue.title ?? "",
      message: issue.message ?? "",
    })),
  };
}

function extractPackageSummary(aasPackage) {
  const shells = aasPackage?.assetAdministrationShells ?? [];
  const submodels = aasPackage?.submodels ?? [];

  return {
    assetAdministrationShells: shells.map((shell) => ({
      idShort: shell.idShort ?? "",
      id: shell.id ?? "",
      assetKind: shell.assetInformation?.assetKind ?? "",
      globalAssetId: shell.assetInformation?.globalAssetId ?? "",
      submodelReferences: (shell.submodels ?? []).map((reference) => reference.keys?.at(-1)?.value ?? ""),
    })),
    submodels: submodels.map((submodel) => ({
      idShort: submodel.idShort ?? "",
      id: submodel.id ?? "",
      elementCount: countElements(submodel.submodelElements ?? []),
    })),
  };
}

function packageStats(aasPackage) {
  const submodels = aasPackage?.submodels ?? [];
  return {
    shells: aasPackage?.assetAdministrationShells?.length ?? 0,
    submodels: submodels.length,
    elements: countElements(submodels.flatMap((submodel) => submodel.submodelElements ?? [])),
  };
}

function countElements(elements) {
  return elements.reduce((total, element) => total + 1 + countElements(getElementChildren(element)), 0);
}

function getElementChildren(element) {
  switch (element?.modelType) {
    case "SubmodelElementCollection":
    case "SubmodelElementList":
      return Array.isArray(element.value) ? element.value.filter(isPlainObject) : [];
    case "Entity":
      return Array.isArray(element.statements) ? element.statements.filter(isPlainObject) : [];
    case "AnnotatedRelationshipElement":
      return Array.isArray(element.annotations) ? element.annotations.filter(isPlainObject) : [];
    case "Operation":
      return [
        ...(element.inputVariables ?? []),
        ...(element.outputVariables ?? []),
        ...(element.inoutputVariables ?? []),
      ]
        .map((variable) => variable?.value)
        .filter(isPlainObject);
    default:
      return [];
  }
}

function countIssues(issues) {
  return {
    total: issues.length,
    errors: issues.filter((issue) => issue.level === "error").length,
    warnings: issues.filter((issue) => issue.level === "warning").length,
    infos: issues.filter((issue) => issue.level === "info").length,
  };
}

function countIssuesByCategory(issues) {
  return issues.reduce(
    (counts, issue) => {
      const category = issue.category ?? "structure";
      counts[category] = (counts[category] ?? 0) + 1;
      return counts;
    },
    {
      structure: 0,
      references: 0,
      datatypes: 0,
      semantics: 0,
      units: 0,
      interoperability: 0,
    },
  );
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
