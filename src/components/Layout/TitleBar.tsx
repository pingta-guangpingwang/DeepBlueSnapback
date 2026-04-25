import { useAppState } from '../../context/AppContext'

export default function TitleBar() {
  const [state, dispatch] = useAppState()

  const handleMinimize = () => {
    window.electronAPI.minimizeWindow()
  }

  const handleMaximize = async () => {
    await window.electronAPI.maximizeWindow()
    const maximized = await window.electronAPI.isMaximized()
    dispatch({ type: 'SET_IS_MAXIMIZED', payload: maximized })
  }

  const handleClose = () => {
    window.electronAPI.closeWindow()
  }

  const titleMap: Record<string, string> = {
    setup: 'DBGODVS - 设置',
    repositories: 'DBGODVS - 仓库管理',
    dashboard: `DBGODVS - ${state.currentProject ?? '仪表盘'}`,
  }

  return (
    <div className="draggable-header" style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 32, background: '#fff', borderBottom: '1px solid #e5e7eb', userSelect: 'none' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{titleMap[state.currentView] ?? 'DBGODVS'}</span>
      <div className="header-spacer" />
      <a
        href="https://www.ssrgpt.com"
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{
          fontSize: '11px', color: '#9ca3af', textDecoration: 'none',
          marginRight: '12px', flexShrink: 0,
          transition: 'color 0.2s', fontFamily: 'Consolas, monospace',
          padding: '2px 8px', borderRadius: '3px',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.background = '#f5f3ff' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'transparent' }}
      >
        ssrgpt.com
      </a>
      <div className="window-controls">
        <button className="window-btn minimize-btn" onClick={handleMinimize} title="最小化">─</button>
        <button className="window-btn maximize-btn" onClick={handleMaximize} title={state.isMaximized ? '还原' : '最大化'}>
          {state.isMaximized ? '❐' : '□'}
        </button>
        <button className="window-btn close-btn" onClick={handleClose} title="关闭">✕</button>
      </div>
    </div>
  )
}
