import { BrainCircuit, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../shared/api/httpClient'

type Message = { role: 'user' | 'ai'; text: string }

const SUGGESTIONS = [
  '¿Cuántos coders hay activos?',
  '¿Qué sprints están en curso?',
  '¿Cómo van los proyectos?',
  '¿Qué es La Rosa en B612?',
]

export function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: '¡Hola! Soy B612 AI, tu asistente inteligente. Puedo ayudarte con datos del sistema, aclarar conceptos de la plataforma o darte un resumen del estado actual. ¿Qué necesitas?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    setMessages(prev => [...prev, { role: 'user', text: text.trim() }])
    setInput('')
    setLoading(true)
    try {
      const data = await apiRequest<{ response: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text.trim() }),
      })
      setMessages(prev => [...prev, { role: 'ai', text: data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'No pude conectar con el asistente en este momento. Intenta de nuevo.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div><BrainCircuit size={20} /><strong>B612 AI</strong><span>Asistente inteligente</span></div>
            <button type="button" onClick={() => setOpen(false)}><X size={18} /></button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-bubble chatbot-bubble--${msg.role}`}>
                {msg.role === 'ai' && <Sparkles size={13} />}
                <span>{msg.text}</span>
              </div>
            ))}
            {loading && (
              <div className="chatbot-bubble chatbot-bubble--ai chatbot-bubble--loading">
                <span /><span /><span />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="chatbot-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} type="button" onClick={() => void send(s)}>{s}</button>
              ))}
            </div>
          )}

          <div className="chatbot-input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input) }
              }}
              placeholder="Pregunta algo sobre B612..."
              disabled={loading}
            />
            <button type="button" onClick={() => void send(input)} disabled={loading || !input.trim()}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button className={`chatbot-toggle${open ? ' chatbot-toggle--active' : ''}`} type="button" onClick={() => setOpen(o => !o)}>
        <BrainCircuit size={20} />
        <span>B612 AI</span>
      </button>
    </>
  )
}
