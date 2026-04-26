import { useState, useEffect } from 'react'
import { useI18n } from '../../../i18n'
import type { HFApiKey, HFConfig } from '../../../types/horseFarm'
import { DEEPSEEK_MODELS, DEFAULT_API_CONFIG } from '../../../types/horseFarm'

interface HorseFarmSettingsProps {
  config: HFConfig
  onConfigChange: (config: HFConfig) => void
}

const BASE_URL = 'https://api.deepseek.com/anthropic'

function maskKey(key: string): string {
  if (key.length <= 8) return '****'
  return key.slice(0, 4) + '****' + key.slice(-4)
}

export default function HorseFarmSettings({ config, onConfigChange }: HorseFarmSettingsProps) {
  const { t } = useI18n()
  const [editingKey, setEditingKey] = useState<HFApiKey | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formKey, setFormKey] = useState('')
  const [formRole, setFormRole] = useState<'manager' | 'worker'>('worker')
  const [formModel, setFormModel] = useState(DEFAULT_API_CONFIG.defaultModel)
  const [formTemp, setFormTemp] = useState(DEFAULT_API_CONFIG.defaultTemperature)
  const [formMaxTokens, setFormMaxTokens] = useState(DEFAULT_API_CONFIG.defaultMaxTokens)
  const [formThinking, setFormThinking] = useState(false)

  useEffect(() => {
    window.electronAPI.saveHorseFarmConfig(config).catch(() => {})
  }, [config])

  const handleAdd = () => {
    if (!formName.trim() || !formKey.trim()) return
    const newKey: HFApiKey = {
      id: Date.now().toString(36),
      name: formName.trim(),
      key: formKey.trim(),
      provider: 'deepseek',
      role: formRole,
      model: formModel,
      enabled: true,
      status: 'active',
      config: {
        temperature: formTemp,
        maxTokens: formMaxTokens,
        thinkingEnabled: formThinking,
      },
    }
    onConfigChange({
      ...config,
      apiKeys: [...config.apiKeys, newKey],
    })
    resetForm()
  }

  const handleUpdate = () => {
    if (!editingKey) return
    onConfigChange({
      ...config,
      apiKeys: config.apiKeys.map(k =>
        k.id === editingKey.id
          ? { ...k, name: formName, key: formKey || k.key, role: formRole, model: formModel,
              config: { temperature: formTemp, maxTokens: formMaxTokens, thinkingEnabled: formThinking } }
          : k
      ),
    })
    resetForm()
  }

  const handleDelete = (id: string) => {
    onConfigChange({
      ...config,
      apiKeys: config.apiKeys.filter(k => k.id !== id),
    })
  }

  const handleToggle = (id: string) => {
    onConfigChange({
      ...config,
      apiKeys: config.apiKeys.map(k =>
        k.id === id ? { ...k, enabled: !k.enabled } : k
      ),
    })
  }

  const resetForm = () => {
    setShowAddForm(false)
    setEditingKey(null)
    setFormName('')
    setFormKey('')
    setFormRole('worker')
    setFormModel(DEFAULT_API_CONFIG.defaultModel)
    setFormTemp(DEFAULT_API_CONFIG.defaultTemperature)
    setFormMaxTokens(DEFAULT_API_CONFIG.defaultMaxTokens)
    setFormThinking(false)
  }

  const startEdit = (k: HFApiKey) => {
    setEditingKey(k)
    setShowAddForm(false)
    setFormName(k.name)
    setFormKey('')
    setFormRole(k.role)
    setFormModel(k.model)
    setFormTemp(k.config.temperature)
    setFormMaxTokens(k.config.maxTokens)
    setFormThinking(k.config.thinkingEnabled)
  }

  const statusBadge = (k: HFApiKey) => {
    if (!k.enabled) return { label: 'Disabled', color: '#9ca3af', bg: '#f3f4f6' }
    switch (k.status) {
      case 'rate_limited': return { label: 'Rate Limited', color: '#d97706', bg: '#fef3c7' }
      case 'exhausted': return { label: 'Quota Exhausted', color: '#dc2626', bg: '#fee2e2' }
      case 'error': return { label: 'Error', color: '#dc2626', bg: '#fee2e2' }
      default: return { label: 'Active', color: '#059669', bg: '#d1fae5' }
    }
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      {/* API Base URL 信息 */}
      <div style={{
        background: '#1e293b', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px',
        color: '#e2e8f0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', color: '#f1f5f9' }}>DeepSeek Anthropic API</h4>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>DeepSeek</span>
        </div>
        <div style={{
          background: '#0f172a', borderRadius: '6px', padding: '10px 14px',
          fontFamily: 'Consolas, monospace', fontSize: '12px',
        }}>
          <div style={{ color: '#94a3b8' }}>Base URL:</div>
          <div style={{ color: '#67e8f9' }}>{BASE_URL}</div>
          <div style={{ color: '#94a3b8', marginTop: '6px' }}>Auth Header:</div>
          <div style={{ color: '#86efac' }}>x-api-key: {'<your-api-key>'}</div>
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
          Use Anthropic SDK with DeepSeek models. Set ANTHROPIC_BASE_URL to {BASE_URL}
        </div>
      </div>

      {/* API Keys List */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '15px' }}>API Keys ({config.apiKeys.length})</h4>
          {!showAddForm && !editingKey && (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none',
                background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '12px',
              }}
            >
              + Add Key
            </button>
          )}
        </div>

        {config.apiKeys.length === 0 && !showAddForm && (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '13px' }}>
            No API keys configured. Add one to enable AI-powered features.
          </div>
        )}

        {config.apiKeys.map(k => {
          const sb = statusBadge(k)
          return (
            <div
              key={k.id}
              style={{
                border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px',
                marginBottom: '8px', opacity: k.enabled ? 1 : 0.5,
                background: k.enabled ? '#fff' : '#f9fafb',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{k.name}</span>
                  <span style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
                    background: sb.bg, color: sb.color, fontWeight: 500,
                  }}>
                    {sb.label}
                  </span>
                  <span style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
                    background: k.role === 'manager' ? '#ede9fe' : '#f0fdf4',
                    color: k.role === 'manager' ? '#7c3aed' : '#059669',
                    fontWeight: 500,
                  }}>
                    {k.role === 'manager' ? 'Manager AI' : 'Worker'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleToggle(k.id)}
                    style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', color: '#374151', cursor: 'pointer' }}>
                    {k.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => startEdit(k)}
                    style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', color: '#374151', cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(k.id)}
                    style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid #fecaca', borderRadius: '4px', background: '#fff', color: '#dc2626', cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', fontFamily: 'monospace' }}>
                Key: {maskKey(k.key)} · Model: {k.model} · T: {k.config.temperature} · Max Tokens: {k.config.maxTokens} · Thinking: {k.config.thinkingEnabled ? 'On' : 'Off'}
              </div>
              {k.errorMessage && (
                <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>{k.errorMessage}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add / Edit Form */}
      {(showAddForm || editingKey) && (
        <div style={{
          border: '2px solid #4f46e5', borderRadius: '10px', padding: '16px',
          background: '#fafafe', marginBottom: '20px',
        }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>
            {editingKey ? 'Edit API Key' : 'Add API Key'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Key Name</label>
              <input
                type="text" value={formName} onChange={e => setFormName(e.target.value)}
                placeholder="e.g. My DeepSeek Key"
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>API Key</label>
              <input
                type="password" value={formKey} onChange={e => setFormKey(e.target.value)}
                placeholder={editingKey ? 'Leave empty to keep current' : 'sk-...'}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Role</label>
              <select value={formRole} onChange={e => setFormRole(e.target.value as 'manager' | 'worker')}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="manager">Manager AI — 项目交互驾驶</option>
                <option value="worker">Worker — 任务轮询执行</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Model</label>
              <select value={formModel} onChange={e => setFormModel(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#fff' }}
              >
                {DEEPSEEK_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Temperature ({formTemp})</label>
              <input
                type="range" min="0" max="2" step="0.1" value={formTemp}
                onChange={e => setFormTemp(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Max Tokens</label>
              <input
                type="number" min="256" max="8192" step="256" value={formMaxTokens}
                onChange={e => setFormMaxTokens(parseInt(e.target.value) || 4096)}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox" checked={formThinking} onChange={e => setFormThinking(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <label style={{ fontSize: '12px', fontWeight: 500 }}>Enable Thinking</label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', justifyContent: 'flex-end' }}>
            <button onClick={resetForm}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: '12px' }}>
              Cancel
            </button>
            <button onClick={editingKey ? handleUpdate : handleAdd}
              style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>
              {editingKey ? 'Update' : 'Add Key'}
            </button>
          </div>
        </div>
      )}

      {/* Global Settings */}
      <div>
        <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>Global Settings</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Default Model</label>
            <select
              value={config.settings.defaultModel}
              onChange={e => onConfigChange({ ...config, settings: { ...config.settings, defaultModel: e.target.value } })}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#fff' }}
            >
              {DEEPSEEK_MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Default Temperature</label>
            <input
              type="number" min="0" max="2" step="0.1" value={config.settings.defaultTemperature}
              onChange={e => onConfigChange({ ...config, settings: { ...config.settings, defaultTemperature: parseFloat(e.target.value) || 0.7 } })}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Default Max Tokens</label>
            <input
              type="number" min="256" max="8192" step="256" value={config.settings.defaultMaxTokens}
              onChange={e => onConfigChange({ ...config, settings: { ...config.settings, defaultMaxTokens: parseInt(e.target.value) || 4096 } })}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Polling Interval (ms)</label>
            <input
              type="number" min="1000" max="60000" step="1000" value={config.settings.pollingIntervalMs}
              onChange={e => onConfigChange({ ...config, settings: { ...config.settings, pollingIntervalMs: parseInt(e.target.value) || 5000 } })}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Max Concurrent Tasks</label>
            <input
              type="number" min="1" max="10" value={config.settings.maxConcurrentTasks}
              onChange={e => onConfigChange({ ...config, settings: { ...config.settings, maxConcurrentTasks: parseInt(e.target.value) || 3 } })}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
