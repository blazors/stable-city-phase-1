import { useState } from 'react'
import { interpretThemeBrief, themeSpecs, type ThemeName } from './theme'

type Task = {
  id: number
  name: string
  input: string
  output: string
  status: 'queued' | 'review' | 'approved' | 'rejected'
}
const statusLabels = { queued: '待运行', review: '待审核', approved: '已批准', rejected: '已退回' }

export function ProductionPanel({ seed, theme }: { seed: number; theme: string }) {
  const [brief, setBrief] = useState('完善立面节奏、交通尺度参照和环境色层次。')
  const [tasks, setTasks] = useState<Task[]>([])
  const [message, setMessage] = useState('')
  const [themeCandidate, setThemeCandidate] = useState<ThemeName | null>(null)
  const [themeCandidateStatus, setThemeCandidateStatus] = useState<'preview' | 'confirmed' | 'rejected' | null>(null)
  const interpretedTheme = interpretThemeBrief(brief)
  const interpretedSpec = themeSpecs[interpretedTheme]

  function splitBrief() {
    const input = brief.trim()
    if (!input) return
    setThemeCandidate(interpretedTheme)
    setThemeCandidateStatus('preview')
    setTasks(prev => [...prev, ...['立面设计说明', '交通尺度说明', '氛围设计说明'].map((name, index): Task => ({
      id: prev.length + index + 1,
      name,
      input: input + ' / Seed ' + seed + ' / ' + theme,
      output: '',
      status: 'queued',
    }))])
    setMessage(`已按固定模板加入 3 项任务；Theme Interpreter 识别为 ${interpretedSpec.label}。此拆分未调用 AI。`)
  }

  function confirmThemeCandidate() {
    if (!themeCandidate) return
    setThemeCandidateStatus('confirmed')
    setMessage(`ThemeVersion ${themeCandidate}-local-01 已确认并留档；尚未应用到场景。`)
  }

  function rejectThemeCandidate() {
    setThemeCandidateStatus('rejected')
    setMessage('ThemeSpec 候选已退回，可修改制作要求后重新拆分。')
  }

  function runNext() {
    const next = tasks.find(task => task.status === 'queued')
    if (!next) return
    const proposals = [
      '立面候选：保持建筑体量；以水平窗带区分楼层，暖色发光集中在入口和少量办公楼层。',
      '交通候选：保持道路与轨道；在巨构附近保留列车与小尺度车辆作为参照，避免遮挡洞口。',
      '氛围候选：保持时段主导光照；主题仅调整材质与环境偏色，远景逐步降低饱和度。',
    ]
    setTasks(prev => prev.map(task => task.id === next.id ? { ...task, status: 'review', output: proposals[(task.id - 1) % 3] } : task))
    setMessage('已生成本地模板候选，等待人工审核。')
  }

  function review(id: number, status: 'approved' | 'rejected') {
    setTasks(prev => prev.map(task => task.id === id && task.status === 'review' ? { ...task, status } : task))
    setMessage(status === 'approved' ? '候选已批准并留档于本次会话；尚未应用到场景。' : '候选已退回，可重新运行模板。')
  }

  return <>
    <h3>拆分制作任务</h3>
    <p className="help">本地模板演练：拆分 → 生成说明 → 人工审核。结果不会自动修改城市，刷新后清空。</p>
    <label className="brief-label" htmlFor="production-brief">制作要求</label>
    <textarea id="production-brief" value={brief} onChange={e => setBrief(e.target.value)} maxLength={1200} rows={3} />
    <div className="theme-interpreter"><span>Theme Interpreter · local</span><strong>{interpretedSpec.label}</strong><small>允许覆盖 {interpretedSpec.allowedSlots.length} 类；锁定 {interpretedSpec.blockedFields.length} 项城市结构。</small></div>
    {themeCandidate && <div className="theme-preview"><div><span>ThemeSpec Preview</span><strong>{themeSpecs[themeCandidate].label}</strong></div><small>Version {themeCandidate}-local-01 · 不修改 StableCity</small><div className="theme-preview-grid"><span>允许：{themeSpecs[themeCandidate].allowedSlots.join(' · ')}</span><span>锁定：{themeSpecs[themeCandidate].blockedFields.join(' · ')}</span></div>{themeCandidateStatus === 'preview' && <div className="task-actions"><button className="primary" onClick={confirmThemeCandidate}>确认 ThemeVersion</button><button onClick={rejectThemeCandidate}>退回</button></div>}{themeCandidateStatus === 'confirmed' && <p className="result" role="status">已确认候选，等待后续生成策略。</p>}{themeCandidateStatus === 'rejected' && <p className="result" role="status">候选已退回。</p>}</div>}
    <div className="task-actions">
      <button className="primary" disabled={!brief.trim()} onClick={splitBrief}>拆分并加入队列</button>
      <button disabled={!tasks.some(task => task.status === 'queued')} onClick={runNext}>运行下一项</button>
    </div>
    <p className="result" role="status">{message || '队列为空，输入制作要求开始。'}</p>
    <div className="task-list">{tasks.map(task => <article className="task-card" key={task.id}>
      <div className="task-heading"><h4>{String(task.id).padStart(2, '0')} · {task.name}</h4><span>{statusLabels[task.status]}</span></div>
      <details><summary>输入快照</summary><p>{task.input}</p></details>
      {task.output && <p className="candidate">{task.output}</p>}
      {task.status === 'review' && <div className="task-actions"><button onClick={() => review(task.id, 'approved')}>批准候选</button><button onClick={() => review(task.id, 'rejected')}>退回</button></div>}
      {task.status === 'rejected' && <button onClick={() => setTasks(prev => prev.map(item => item.id === task.id ? { ...item, status: 'queued', output: '' } : item))}>重新入队</button>}
    </article>)}</div>
  </>
}
