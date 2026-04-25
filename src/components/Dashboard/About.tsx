import { useAppState } from '../../context/AppContext'

export default function About() {
  const [state, dispatch] = useAppState()

  const reopenGuide = async () => {
    await window.electronAPI.setOnboardingCompleted(false)
    dispatch({ type: 'SET_SHOW_ONBOARDING', payload: true })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}>
      {/* 应用信息 */}
      <div className="settings-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                fontSize: '18px', fontWeight: 700, color: '#1f2937',
              }}>DBVS</span>
              <span style={{
                fontSize: '12px', fontWeight: 600, color: '#fff',
                background: '#4f46e5', padding: '2px 8px', borderRadius: '10px',
              }}>v1.0.0</span>
            </div>
            <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '13px' }}>
              DeepBlue Version System — 面向开发者的本地版本管理工具
            </p>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '12px' }}>
              给 AI 套上缰绳，让每一次代码生成都有迹可循
            </p>
          </div>
          <div style={{
            textAlign: 'right', fontSize: '12px', color: '#9ca3af', lineHeight: 1.8,
          }}>
            <div>Electron 28 + React 19 + TypeScript</div>
            <div>Vite 8 + Node.js</div>
            <div>Licensed under MIT</div>
          </div>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px',
          marginTop: '16px',
        }}>
          {[
            { label: '架构', value: 'SVN 集中式' },
            { label: '存储', value: '本地 content-addressed' },
            { label: '界面', value: 'GUI + CLI 双模式' },
            { label: '同步', value: 'Git Remote 可选' },
          ].map(item => (
            <div key={item.label} style={{
              padding: '10px 12px', background: '#f8fafc', borderRadius: '6px',
              border: '1px solid #e5e7eb',
            }}>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>{item.label}</div>
              <div style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 功能引导 */}
      <div className="settings-section">
        <h3>功能引导</h3>
        <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '13px' }}>
          重新查看 DBVS 的功能介绍和使用指南。
        </p>
        <button onClick={reopenGuide}>查看新手引导</button>
      </div>

      {/* 关于作者 + 打赏 横向布局 */}
      <div className="settings-section">
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          {/* 左侧：作者信息 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ marginTop: 0 }}>关于 DBVS</h3>
            <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: '13px' }}>
              DeepBlue Version System — 面向开发者的本地版本管理工具
            </p>
            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937', marginBottom: '8px' }}>作者：王广平</div>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '4px 10px', fontSize: '13px', color: '#374151' }}>
                <span style={{ color: '#6b7280' }}>微信</span>
                <span>1084703441</span>
                <span style={{ color: '#6b7280' }}>邮箱</span>
                <span>18351267631@163.com</span>
                <span style={{ color: '#6b7280' }}>网站</span>
                <a href="https://www.ssrgpt.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', textDecoration: 'none' }}>www.ssrgpt.com</a>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#6b7280', lineHeight: 1.6, fontStyle: 'italic' }}>
                我将努力开发与世界连接，这是我发向全世界发送的一根信息触手，欢迎交流。
              </p>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '14px', paddingTop: '14px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                DBVS 是一款完全免费的开源软件。如果你觉得它对你有帮助，欢迎打赏支持，你的鼓励是我持续更新的动力。 →
              </p>
            </div>
          </div>
          {/* 右侧：二维码 */}
          <div style={{ display: 'flex', gap: '12px', flexShrink: 0, paddingTop: '36px', alignItems: 'flex-end' }}>
            <div style={{ textAlign: 'center' }}>
              <img src="/wechat-pay.jpg" alt="微信支付" style={{ height: '260px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>微信支付</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <img src="/alipay.jpg" alt="支付宝" style={{ height: '200px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>支付宝</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
