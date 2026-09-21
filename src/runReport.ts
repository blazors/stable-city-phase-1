export const RUN_REPORT_VERSION = 'local-run-report.v1'

export type RunReportValidation = { valid: boolean; issues: string[] }

export function validateRunReport(value: unknown): RunReportValidation {
  const issues: string[] = []
  if (!value || typeof value !== 'object') return { valid: false, issues: ['root'] }
  const report = value as Record<string, unknown>
  if (report.reportVersion !== RUN_REPORT_VERSION) issues.push('reportVersion')
  if (typeof report.exportedAt !== 'string' || Number.isNaN(Date.parse(report.exportedAt))) issues.push('exportedAt')
  const context = report.runContext
  if (!context || typeof context !== 'object' || typeof (context as Record<string, unknown>).citySeed !== 'number' || typeof (context as Record<string, unknown>).runId !== 'string' || typeof (context as Record<string, unknown>).stableCitySignature !== 'string') issues.push('runContext')
  const city = report.city
  if (!city || typeof city !== 'object' || typeof (city as Record<string, unknown>).blocks !== 'number' || typeof (city as Record<string, unknown>).buildings !== 'number') issues.push('city')
  const runtime = report.runtime
  if (!runtime || typeof runtime !== 'object' || !Array.isArray((runtime as Record<string, unknown>).samples)) issues.push('runtime')
  if (!Array.isArray(report.providers)) issues.push('providers')
  return { valid: issues.length === 0, issues }
}
