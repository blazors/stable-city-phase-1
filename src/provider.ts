export type ProviderId = 'none' | 'luna' | 'terra' | 'codex' | 'astra' | 'image-api' | '3d-api'
export type ProviderStatus = 'local' | 'reserved' | 'unconfigured' | 'connected'
export type ProviderCapability = 'theme' | 'routing' | 'engineering' | 'visual-review' | 'image-generation' | '3d-generation'

export type ProviderDescriptor = {
  id: ProviderId
  label: string
  status: ProviderStatus
  capabilities: ProviderCapability[]
  note: string
}

export const providerRegistry: ProviderDescriptor[] = [
  { id: 'none', label: 'local-template · 本地模板', status: 'local', capabilities: ['theme', 'routing', 'engineering'], note: '当前唯一实际执行源' },
  { id: 'luna', label: 'Luna', status: 'reserved', capabilities: ['theme'], note: '预留；尚未连接' },
  { id: 'terra', label: 'Terra', status: 'reserved', capabilities: ['routing', 'engineering'], note: '预留；尚未连接' },
  { id: 'codex', label: 'Codex', status: 'reserved', capabilities: ['engineering'], note: '预留；尚未连接' },
  { id: 'astra', label: 'GPT-6 Astra', status: 'reserved', capabilities: ['visual-review'], note: '预留；高级视觉复核前不启用' },
  { id: 'image-api', label: 'Image API', status: 'unconfigured', capabilities: ['image-generation'], note: '未配置 API' },
  { id: '3d-api', label: '3D API', status: 'unconfigured', capabilities: ['3d-generation'], note: '未配置 API' },
]

export function getProvider(id: ProviderId): ProviderDescriptor {
  return providerRegistry.find(provider => provider.id === id) ?? providerRegistry[0]
}

export function getProviderSnapshot() {
  return providerRegistry.map(provider => ({ ...provider, capabilities: [...provider.capabilities] }))
}
