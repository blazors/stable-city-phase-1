export type Capability = 'facade' | 'transport' | 'atmosphere'
export type Route = { capability: Capability; strategy: 'local-template'; provider: 'none' }

export function routeCapability(taskName: string): Route {
  if (taskName.includes('交通')) return { capability: 'transport', strategy: 'local-template', provider: 'none' }
  if (taskName.includes('氛围')) return { capability: 'atmosphere', strategy: 'local-template', provider: 'none' }
  return { capability: 'facade', strategy: 'local-template', provider: 'none' }
}
