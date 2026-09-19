export type Capability = 'facade' | 'transport' | 'atmosphere'
export type RequestedStrategy = 'auto' | 'direct-api' | 'codex' | 'hybrid'
export type Route = { capability: Capability; strategy: 'local-template'; provider: 'none'; requestedStrategy: RequestedStrategy }

export function routeCapability(taskName: string, requestedStrategy: RequestedStrategy): Route {
  if (taskName.includes('交通')) return { capability: 'transport', strategy: 'local-template', provider: 'none', requestedStrategy }
  if (taskName.includes('氛围')) return { capability: 'atmosphere', strategy: 'local-template', provider: 'none', requestedStrategy }
  return { capability: 'facade', strategy: 'local-template', provider: 'none', requestedStrategy }
}
