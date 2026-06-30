import { BookOpenText, ChevronDown, Edit3, Expand, FileText, Minimize2 } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

const markdown = `## Misión del sprint

Construir una experiencia donde cada coder pueda **ver su progreso**, colaborar con su célula y dejar evidencia real de lo aprendido.

### Acuerdos de la tripulación

- Los pull requests requieren una revisión antes de pasar a **Done**.
- Daily todos los días a las 8:15 a.m.
- La documentación se actualiza junto con cada historia.

> Lo esencial de un equipo también es invisible a los ojos.`

export function DocumentationPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(markdown)
  const [draft, setDraft] = useState(markdown)
  const save = () => { setContent(draft); setIsEditing(false) }
  return <section className={`documentation documentation--premium ${isExpanded ? 'documentation--expanded' : ''}`}><button className="documentation__toggle" type="button" aria-expanded={isOpen} onClick={()=>setIsOpen(!isOpen)}><div><span className="doc-icon"><BookOpenText /></span><span><strong>Documentación del clan</strong><small>README.md · Publicado para todas las células</small></span></div><ChevronDown className={isOpen?'rotate':''} /></button>{isOpen&&<div className="documentation__content"><div className="documentation__toolbar"><div><FileText size={16} /><span>README.md</span><i>{isEditing?'BORRADOR':'PUBLICADO'}</i></div><div>{isEditing&&<button onClick={()=>{setDraft(content);setIsEditing(false)}}>Cancelar</button>}<button onClick={()=>isEditing?save():setIsEditing(true)}><Edit3 size={15} /> {isEditing?'Guardar':'Editar'}</button><button onClick={()=>setIsExpanded(!isExpanded)}>{isExpanded?<Minimize2 size={15}/>:<Expand size={15}/>} {isExpanded?'Cerrar':'Expandir'}</button></div></div>{isEditing?<div className="markdown-editor"><textarea value={draft} onChange={(event)=>setDraft(event.target.value)} aria-label="Contenido Markdown"/><article className="markdown-preview"><ReactMarkdown>{draft}</ReactMarkdown></article></div>:<article className="markdown-preview"><ReactMarkdown>{content}</ReactMarkdown></article>}</div>}</section>
}
