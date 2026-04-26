import { useAppState } from '../../context/AppContext'
import { useI18n } from '../../i18n'

export default function About() {
  const [state, dispatch] = useAppState()
  const { t } = useI18n()

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
              }}>{t.brand.name}</span>
              <span style={{
                fontSize: '12px', fontWeight: 600, color: '#fff',
                background: '#4f46e5', padding: '2px 8px', borderRadius: '10px',
              }}>v1.0.0</span>
            </div>
            <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '13px' }}>
              {t.about.description}
            </p>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '12px' }}>
              {t.about.tagline}
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
            { label: t.about.architecture, value: t.about.architectureValue },
            { label: t.about.storage, value: t.about.storageValue },
            { label: t.about.interface, value: t.about.interfaceValue },
            { label: t.about.sync, value: t.about.syncValue },
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
        <h3>{t.about.guide}</h3>
        <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '13px' }}>
          {t.about.guideDesc}
        </p>
        <button onClick={reopenGuide}>{t.about.viewGuide}</button>
      </div>

      {/* 关于作者 + 打赏 横向布局 */}
      <div className="settings-section">
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          {/* 左侧：作者信息 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ marginTop: 0 }}>{t.about.aboutTitle}</h3>
            <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: '13px' }}>
              {t.about.description}
            </p>
            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937', marginBottom: '8px' }}>{t.about.author}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '4px 10px', fontSize: '13px', color: '#374151' }}>
                <span style={{ color: '#6b7280' }}>{t.about.wechat}</span>
                <span>1084703441</span>
                <span style={{ color: '#6b7280' }}>{t.about.email}</span>
                <span>18351267631@163.com</span>
                <span style={{ color: '#6b7280' }}>{t.about.website}</span>
                <a href="https://www.shenlanai.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', textDecoration: 'none' }}>www.shenlanai.com</a>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#6b7280', lineHeight: 1.6, fontStyle: 'italic' }}>
                {t.about.authorQuote}
              </p>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '14px', paddingTop: '14px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                {t.about.donateDesc}
              </p>
            </div>
          </div>
          {/* 右侧：二维码 */}
          <div style={{ display: 'flex', gap: '12px', flexShrink: 0, paddingTop: '36px', alignItems: 'flex-end' }}>
            <div style={{ textAlign: 'center' }}>
              <img src="/wechat-pay.jpg" alt={t.about.wechatPay} style={{ height: '260px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{t.about.wechatPay}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <img src="/alipay.jpg" alt={t.about.alipay} style={{ height: '200px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{t.about.alipay}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
