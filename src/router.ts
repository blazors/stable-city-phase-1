export type Capability = 'facade' | 'transport' | 'atmosphere'
export type RequestedStrategy = 'auto' | 'direct-api' | 'codex' | 'hybrid'
export type Route = { capability: Capability; strategy: 'local-template'; provider: 'none'; requestedStrategy: RequestedStrategy; fallbackReason: 'auto-local' | 'provider-unavailable' }

export function routeCapability(taskName: string, requestedStrategy: RequestedStrategy): Route {
  const fallbackReason = requestedStrategy === 'auto' ? 'auto-local' : 'provider-unavailable'
  if (taskName.includes('交通')) return { capability: 'transport', strategy: 'local-template', provider: 'none', requestedStrategy, fallbackReason }
  if (taskName.includes('氛围')) return { capability: 'atmosphere', strategy: 'local-template', provider: 'none', requestedStrategy, fallbackReason }
  return { capability: 'facade', strategy: 'local-template', provider: 'none', requestedStrategy, fallbackReason }
}
