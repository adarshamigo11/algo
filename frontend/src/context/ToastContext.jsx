import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const value = {
    success: (msg) => show(msg, 'success'),
    error:   (msg) => show(msg, 'error'),
    info:    (msg) => show(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '12px 18px',
            borderRadius: 10,
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            border: '1px solid',
            minWidth: 260, maxWidth: 380,
            animation: 'slideIn 0.2s ease',
            background: t.type === 'success' ? 'rgba(29,158,117,0.2)'
                      : t.type === 'error'   ? 'rgba(226,75,74,0.2)'
                      : 'rgba(83,74,183,0.2)',
            borderColor: t.type === 'success' ? 'rgba(29,158,117,0.4)'
                       : t.type === 'error'   ? 'rgba(226,75,74,0.4)'
                       : 'rgba(83,74,183,0.4)',
            color: t.type === 'success' ? '#5DCAA5'
                 : t.type === 'error'   ? '#E24B4A'
                 : '#AFA9EC',
          }}>
            {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)