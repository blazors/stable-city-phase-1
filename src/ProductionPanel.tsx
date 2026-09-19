import { useState } from 'react'
import { interpretThemeBrief, themeSpecs, type ThemeName } from './theme'
import { routeCapability, type Capability, type RequestedStrategy } from './router'

type Task = {
  id: number
  name: string
  input: string
  themeVersion: string
  capability: Capability
  requestedStrategy: RequestedStrategy
  strategy: 'local-template'
  provider: 'none'
  fallbackReason: 'auto-local' | 'provider-unavailable'
  output: string
  status: 'queued' | 'review' | 'approved' | 'rejected'
}
const statusLabels = { queued: '待运行', review: '待审核', approved: '已批准', rejected: '已退回' }
type RunEvent = { id: number; label: string }

export function ProductionPanel({ seed, theme }: { seed: number; theme: string }) {
  const [brief, setBrief] = useState('完善立面节奏、交通尺度参照和环境色层次。')
  const [tasks, setTasks] = useState<Task[]>([])
  const [message, setMessage] = useState('')
  const [events, setEvents] = useState<RunEvent[]>([])
  const [requestedStrategy, setRequestedStrategy] = useState<RequestedStrategy>('auto')
  const [themeCandidate, setThemeCandidate] = useState<ThemeName | null>(null)
  const [themeCandidateStatus, setThemeCandidateStatus] = useState<'preview' | 'confirmed' | 'rejected' | null>(null)
  const interpretedTheme = interpretThemeBrief(brief)
  const interpretedSpec = themeSpecs[interpretedTheme]
  const statusCounts = tasks.reduce<Record<Task['status'], number>>((counts, task) => { counts[task.status] += 1; return counts }, { queued: 0, review: 0, approved: 0, rejected: 0 })

  function logEvent(label: string) {
    setEvents(prev => [...prev, { id: prev.length + 1, label }].slice(-8))
  }

  function splitBrief() {
    const input = brief.trim()
    if (!input) return
    setThemeCandidate(interpretedTheme)
    setThemeCandidateStatus('preview')
    setTasks(prev => [...prev, ...['立面设计说明', '交通尺度说明', '氛围设计说明'].map((name, index): Task => ({
      id: prev.length + index + 1,
      name,
      input: input + ' / Seed ' + seed + ' / ' + theme,
      themeVersion: `${interpretedTheme}-local-01`,
      ...routeCapability(name, requestedStrategy),
      output: '',
      status: 'queued',
    }))])
    setMessage(`已按固定模板加入 3 项任务；Theme Interpreter 识别为 ${interpretedSpec.label}。此拆分未调用 AI。`)
    logEvent(`split · 3 tasks · ${interpretedTheme}-local-01 · request:${requestedStrategy}`)
  }

  function confirmThemeCandidate() {
    if (!themeCandidate) return
    setThemeCandidateStatus('confirmed')
    setMessage(`ThemeVersion ${themeCandidate}-local-01 已确认并留档；尚未应用到场景。`)
    logEvent(`theme.confirm · ${themeCandidate}-local-01 · StableCity unchanged`)
  }

  function rejectThemeCandidate() {
    setThemeCandidateStatus('rejected')
    setMessage('ThemeSpec 候选已退回，可修改制作要求后重新拆分。')
    logEvent(`theme.reject · ${themeCandidate}-local-01`)
  }

  function runNext() {
    const next = tasks.find(task => task.status === 'queued')
    if (!next) return
    if (themeCandidateStatus !== 'confirmed') {
      setMessage('请先确认 ThemeVersion，再运行制作任务。')
      logEvent(`run.blocked · task:${next.id} · ThemeVersion unconfirmed`)
      return
    }
    const proposals = [
      '立面候选：保持建筑体量；以水平窗带区分楼层，暖色发光集中在入口和少量办公楼层。',
      '交通候选：保持道路与轨道；在巨构附近保留列车与小尺度车辆作为参照，避免遮挡洞口。',
      '氛围候选：保持时段主导光照；主题仅调整材质与环境偏色，远景逐步降低饱和度。',
    ]
    setTasks(prev => prev.map(task => task.id === next.id ? { ...task, status: 'review', output: proposals[(task.id - 1) % 3] } : task))
    setMessage(`已按 ${next.capability} 路由执行：请求 ${next.requestedStrategy}，实际 local-template（${next.fallbackReason}），等待人工审核。`)
    logEvent(`run · task:${next.id} · ${next.capability} · ${next.requestedStrategy}→local-template · ${next.fallbackReason}`)
  }

  function review(id: number, status: 'approved' | 'rejected') {
    setTasks(prev => prev.map(task => task.id === id && task.status === 'review' ? { ...task, status } : task))
    setMessage(status === 'approved' ? '候选已批准并留档于本次会话；尚未应用到场景。' : '候选已退回，可重新运行模板。')
    logEvent(`${status === 'approved' ? 'review.approve' : 'review.reject'} · task:${id}`)
  }

  function requeue(id: number) {
    setTasks(prev => prev.map(item => item.id === id ? { ...item, status: 'queued', output: '' } : item))
    setMessage('任务已重新入队。')
    logEvent(`requeue · task:${id}`)
  }

  function finalizeBatch() {
    if (!tasks.length || tasks.some(task => task.status !== 'approved')) return
    setMessage('本次制作批次已完成并留档；结果尚未应用到场景。')
    logEvent(`finalize · ${tasks.length} tasks approved · scene unchanged`)
  }

  return <>
    <h3>拆分制作任务</h3>
    <p className="help">本地模板演练：拆分 → 生成说明 → 人工审核。结果不会自动修改城市，刷新后清空。</p>
    <label className="brief-label" htmlFor="production-brief">制作要求</label>
    <textarea id="production-brief" value={brief} onChange={e => setBrief(e.target.value)} maxLength={1200} rows={3} />
    <div className="theme-interpreter"><span>Theme Interpreter · local</span><strong>{interpretedSpec.label}</strong><small>允许覆盖 {interpretedSpec.allowedSlots.length} 类；锁定 {interpretedSpec.blockedFields.length} 项城市结构。</small></div>
    {themeCandidate && <div className="theme-preview"><div><span>ThemeSpec Preview</span><strong>{themeSpecs[themeCandidate].label}</strong></div><small>Version {themeCandidate}-local-01 · 不修改 StableCity</small><div className="theme-preview-grid"><span>允许：{themeSpecs[themeCandidate].allowedSlots.join(' · ')}</span><span>锁定：{themeSpecs[themeCandidate].blockedFields.join(' · ')}</span></div>{themeCandidateStatus === 'preview' && <div className="task-actions"><button className="primary" onClick={confirmThemeCandidate}>确认 ThemeVersion</button><button onClick={rejectThemeCandidate}>退回</button></div>}{themeCandidateStatus === 'confirmed' && <p className="result" role="status">已确认候选，等待后续生成策略。</p>}{themeCandidateStatus === 'rejected' && <p className="result" role="status">候选已退回。</p>}</div>}
    <label className="strategy-select" htmlFor="requested-strategy"><span>Requested strategy</span><select id="requested-strategy" value={requestedStrategy} onChange={e => { const next = e.target.value as RequestedStrategy; setRequestedStrategy(next); logEvent(`strategy.select · ${next}`) }}><option value="auto">Auto · 自动路由</option><option value="direct-api">Direct API · 直连</option><option value="codex">Codex · 工程执行</option><option value="hybrid">Hybrid · 混合流程</option></select><small>当前 Provider 未连接，实际执行保持 local-template。</small></label>
    <div className="task-actions">
      <button className="primary" disabled={!brief.trim()} onClick={splitBrief}>拆分并加入队列</button>
      <button disabled={!tasks.some(task => task.status === 'queued') || themeCandidateStatus !== 'confirmed'} onClick={runNext}>运行下一项</button>
      <button disabled={!tasks.length || tasks.some(task => task.status !== 'approved')} onClick={finalizeBatch}>完成本次制作</button>
    </div>
    <p className="result" role="status">{message || '队列为空，输入制作要求开始。'}</p>
    <div className="task-summary"><span>queued <b>{statusCounts.queued}</b></span><span>review <b>{statusCounts.review}</b></span><span>approved <b>{statusCounts.approved}</b></span><span>rejected <b>{statusCounts.rejected}</b></span><span>cost <b>$0.00</b></span></div>
    <div className="task-list">{tasks.map(task => <article className="task-card" key={task.id}>
      <div className="task-heading"><h4>{String(task.id).padStart(2, '0')} · {task.name}</h4><span>{statusLabels[task.status]}</span></div>
      <div className="task-meta"><span>{task.themeVersion}</span><span>{task.capability}</span><span>request:{task.requestedStrategy}</span><span>exec:{task.strategy}</span><span>provider:{task.provider}</span><span>fallback:{task.fallbackReason}</span></div>
      <details><summary>输入快照</summary><p>{task.input}</p></details>
      {task.output && <p className="candidate">{task.output}</p>}
      {task.status === 'review' && <div className="task-actions"><button onClick={() => review(task.id, 'approved')}>批准候选</button><button onClick={() => review(task.id, 'rejected')}>退回</button></div>}
      {task.status === 'rejected' && <button onClick={() => requeue(task.id)}>重新入队</button>}
    </article>)}</div>
    <h3>Run Log</h3>
    <div className="run-log" role="log" aria-live="polite">{events.length ? events.map(event => <span key={event.id}>{String(event.id).padStart(2, '0')} · {event.label}</span>) : <span>尚无运行事件。</span>}</div>
  </>
}
