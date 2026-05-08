import { useState } from 'react'
import { useAppState } from '../../context/AppContext'
import { useI18n } from '../../i18n'
import type { Translations } from '../../i18n/locales/en'

interface StepData {
  title: string
  description: string
  icon: string
  color: string
  details: string[]
}

function getSteps(t: Translations): StepData[] {
  return [
    {
      title: t.onboarding.welcome,
      description: t.onboarding.welcomeDesc,
      icon: 'DBHT',
      color: '#4f46e5',
      details: t.onboarding.welcomeDetails,
    },
    {
      title: t.onboarding.createManage,
      description: t.onboarding.createManageDesc,
      icon: '📂',
      color: '#2563eb',
      details: t.onboarding.createManageDetails,
    },
    {
      title: t.onboarding.projectOverview,
      description: t.onboarding.projectOverviewDesc,
      icon: '📊',
      color: '#16a34a',
      details: t.onboarding.projectOverviewDetails,
    },
    {
      title: t.onboarding.versionHistory,
      description: t.onboarding.versionHistoryDesc,
      icon: '🕐',
      color: '#d97706',
      details: t.onboarding.versionHistoryDetails,
    },
    {
      title: t.onboarding.autoGit,
      description: t.onboarding.autoGitDesc,
      icon: '⚙',
      color: '#7c3aed',
      details: t.onboarding.autoGitDetails,
    },
    {
      title: t.onboarding.cliTool,
      description: t.onboarding.cliToolDesc,
      icon: '>_',
      color: '#374151',
      details: t.onboarding.cliToolDetails,
    },
    {
      title: t.onboarding.aboutAuthor,
      description: t.onboarding.aboutAuthorDesc,
      icon: '❤',
      color: '#e11d48',
      details: [],
    },
  ]
}

export default function OnboardingGuide() {
  const [state, dispatch] = useAppState()
  const { t } = useI18n()
  const STEPS = getSteps(t)
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
          /* About author page */
          <div className={`onboarding-content ${isAnimating ? `anim-${animDirection}` : ''}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: '28px' }}>
            {/* Left: text info */}
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: '#e11d48', color: '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                }}>❤</div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#1f2937' }}>{t.onboarding.aboutAuthor}</h2>
              </div>
              <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#6b7280', lineHeight: 1.7 }}>
                {t.onboarding.authorName}
              </p>
              <div style={{ fontSize: '13px', color: '#374151', lineHeight: 2.2 }}>
                <div>{t.about.wechat}：1084703441</div>
                <div>{t.about.email}：18351267631@163.com</div>
                <div>{t.about.website}：<a href="https://www.shenlanai.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', textDecoration: 'none' }}>www.shenlanai.com</a></div>
              </div>
              <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '14px', paddingTop: '14px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                  {t.onboarding.donate}
                </p>
              </div>
            </div>
            {/* Right: QR codes */}
            <div style={{ display: 'flex', gap: '12px', flexShrink: 0, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'center' }}>
                <img src="/wechat-pay.jpg" alt={t.about.wechatPay} style={{ height: '280px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{t.about.wechatPay}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <img src="/alipay.jpg" alt={t.about.alipay} style={{ height: '220px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{t.about.alipay}</div>
              </div>
            </div>
          </div>
        ) : (
          /* Normal step page */
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
            {t.onboarding.skip}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isFirst && (
              <button className="onboarding-prev" onClick={() => goTo(currentStep - 1, 'prev')}>
                {t.onboarding.prev}
              </button>
            )}
            {isLast ? (
              <button
                className="onboarding-finish"
                style={{ background: step.color }}
                onClick={() => close(true)}
              >
                {t.onboarding.start}
              </button>
            ) : (
              <button
                className="onboarding-next"
                style={{ background: step.color }}
                onClick={() => goTo(currentStep + 1, 'next')}
              >
                {t.onboarding.next}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
