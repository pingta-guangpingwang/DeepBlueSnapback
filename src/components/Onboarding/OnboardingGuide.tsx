import { useState } from 'react'
import { useAppState } from '../../context/AppContext'

interface StepData {
  title: string
  description: string
  icon: string
  color: string
  details: string[]
}

const STEPS: StepData[] = [
  {
    title: '欢迎使用 DBGODVS',
    description: '深蓝主神版本管理系统 — 本地版本管理工具',
    icon: 'DBGODVS',
    color: '#4f46e5',
    details: [
      'SVN 风格的集中仓库 + 工作副本架构',
      '所有版本数据安全存储在本地',
      '支持可视化界面和命令行双重操作',
      'AI 智能体友好的提交和回滚机制',
    ],
  },
  {
    title: '创建和管理项目',
    description: '三种方式开始你的版本管理',
    icon: '📂',
    color: '#2563eb',
    details: [
      '创建新项目 — 从零开始初始化版本仓库',
      '导入已有项目 — 将现有代码纳入版本管理',
      '从 Git 克隆 — 连接远程 Git 仓库自动导入',
      '所有项目统一在仓库管理页面查看',
    ],
  },
  {
    title: '项目概览',
    description: '进入项目后的操作中心',
    icon: '📊',
    color: '#16a34a',
    details: [
      '获取状态 — 查看工作区变更文件列表',
      '提交变更 — 可视化勾选文件，查看 diff 对比',
      '全局统计 — 查看新增/修改/删除行数',
      '一键更新 — 恢复到最新版本',
    ],
  },
  {
    title: '版本历史',
    description: '完整的版本记录和恢复能力',
    icon: '🕐',
    color: '#d97706',
    details: [
      '浏览所有版本的提交历史和时间线',
      'SourceTree 风格的文件 diff 对比',
      '整体回滚 — 自动创建快照，可撤销',
      '文件级恢复 — 只恢复指定文件，不影响其他',
    ],
  },
  {
    title: '自动快照 & Git 同步',
    description: '让版本管理更省心',
    icon: '⚙',
    color: '#7c3aed',
    details: [
      '自动快照 — 定时自动提交，防止遗忘',
      'Git 远程同步 — Push/Pull 到 GitHub 等',
      '自定义忽略 — .dbvsignore 文件过滤',
      '数据验证 — 检查仓库完整性',
    ],
  },
  {
    title: '命令行工具',
    description: '无需打开应用，直接在项目内操作',
    icon: '>_',
    color: '#374151',
    details: [
      'dbvs status — 查看变更',
      'dbvs commit -m "说明" --ai claude-code',
      'dbvs rollback --version <ID>',
      'dbvs diff / dbgvs history / dbgvs info',
      'AI 智能体可直接在项目内调用 dbgvs 命令',
    ],
  },
  {
    title: '关于作者',
    description: '感谢你使用 DBGODVS，期待你的反馈与支持',
    icon: '❤',
    color: '#e11d48',
    details: [],
  },
]

export default function OnboardingGuide() {
  const [state, dispatch] = useAppState()
  const [currentStep, setCurrentStep] = useState(0)
  const [animDirection, setAnimDirection] = useState<'next' | 'prev'>('next')
  const [isAnimating, setIsAnimating] = useState(false)

  const step = STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === STEPS.length - 1

  const goTo = (index: number, direction: 'next' | 'prev') => {
    if (isAnimating) return
    setIsAnimating(true)
    setAnimDirection(direction)
    setTimeout(() => {
      setCurrentStep(index)
      setTimeout(() => setIsAnimating(false), 50)
    }, 150)
  }

  const close = async (completed: boolean) => {
    if (completed) {
      await window.electronAPI.setOnboardingCompleted(true)
    }
    dispatch({ type: 'SET_SHOW_ONBOARDING', payload: false })
  }

  const isAboutStep = currentStep === STEPS.length - 1

  return (
    <div className="onboarding-overlay" onClick={() => close(false)}>
      <div className="onboarding-card" style={isAboutStep ? { maxWidth: '780px', width: '780px' } : {}} onClick={e => e.stopPropagation()}>
        {/* Progress bar */}
        <div className="onboarding-progress">
          <div
            className="onboarding-progress-fill"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        {isAboutStep ? (
          /* 关于作者页面 — 宽屏横向布局 */
          <div className={`onboarding-content ${isAnimating ? `anim-${animDirection}` : ''}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: '28px' }}>
            {/* 左侧：文字信息 */}
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: '#e11d48', color: '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                }}>❤</div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#1f2937' }}>关于作者</h2>
              </div>
              <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#6b7280', lineHeight: 1.7 }}>
                我叫王广平，我将努力开发与世界连接，这是我发向全世界发送的一根信息触手，欢迎交流。
              </p>
              <div style={{ fontSize: '13px', color: '#374151', lineHeight: 2.2 }}>
                <div>微信：1084703441</div>
                <div>邮箱：18351267631@163.com</div>
                <div>网站：<a href="https://www.ssrgpt.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', textDecoration: 'none' }}>www.ssrgpt.com</a></div>
              </div>
              <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '14px', paddingTop: '14px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                  DBGODVS 是一款完全免费的开源软件。如果你觉得它对你有帮助，欢迎打赏支持，你的鼓励是我持续更新的动力。
                </p>
              </div>
            </div>
            {/* 右侧：二维码 */}
            <div style={{ display: 'flex', gap: '12px', flexShrink: 0, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'center' }}>
                <img src="/wechat-pay.jpg" alt="微信支付" style={{ height: '280px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>微信支付</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <img src="/alipay.jpg" alt="支付宝" style={{ height: '220px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>支付宝</div>
              </div>
            </div>
          </div>
        ) : (
          /* 普通步骤页面 */
          <div className={`onboarding-content ${isAnimating ? `anim-${animDirection}` : ''}`}>
            <div className="onboarding-illustration" style={{ background: `linear-gradient(135deg, ${step.color}15, ${step.color}08)` }}>
              <div className="onboarding-icon" style={{ background: step.color, color: '#fff' }}>
                {step.icon}
              </div>
            </div>
            <div className="onboarding-text">
              <h2 style={{ margin: '0 0 8px', fontSize: '22px', color: '#1f2937' }}>{step.title}</h2>
              <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#6b7280' }}>{step.description}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {step.details.map((detail, i) => (
                  <li key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '8px 0', fontSize: '13px', color: '#374151',
                  }}>
                    <span style={{
                      flexShrink: 0, width: '20px', height: '20px',
                      borderRadius: '50%', background: `${step.color}15`,
                      color: step.color, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '11px', fontWeight: 700,
                      marginTop: '1px',
                    }}>{i + 1}</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Step dots */}
        <div className="onboarding-step-dots">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`onboarding-dot ${i === currentStep ? 'active' : ''}`}
              onClick={() => goTo(i, i > currentStep ? 'next' : 'prev')}
              style={i === currentStep ? { background: step.color } : {}}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="onboarding-actions">
          <button className="onboarding-skip" onClick={() => close(false)}>
            跳过引导
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isFirst && (
              <button className="onboarding-prev" onClick={() => goTo(currentStep - 1, 'prev')}>
                上一步
              </button>
            )}
            {isLast ? (
              <button
                className="onboarding-finish"
                style={{ background: step.color }}
                onClick={() => close(true)}
              >
                开始使用
              </button>
            ) : (
              <button
                className="onboarding-next"
                style={{ background: step.color }}
                onClick={() => goTo(currentStep + 1, 'next')}
              >
                下一步
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
