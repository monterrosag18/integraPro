import { ArrowUpRight, Volume2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const stars = [
  ['12%','18%','1.2s'],['21%','67%','2.7s'],['39%','26%','.3s'],['48%','73%','1.8s'],
  ['57%','15%','3.1s'],['64%','34%','.8s'],['73%','12%','2.2s'],['83%','21%','1.5s'],
  ['91%','44%','2.9s'],['76%','57%','.5s'],['55%','54%','2.4s'],['88%','72%','1.1s'],
]

export function LandingPage() {
  const navigate = useNavigate()
  const scene = useRef<HTMLElement>(null)
  const audio = useRef<AudioContext | null>(null)
  const [soundOn, setSoundOn] = useState(false)
  const [entering, setEntering] = useState(false)
  const move = (event: React.MouseEvent<HTMLElement>) => {
    const x = (event.clientX / window.innerWidth - .5) * 2
    const y = (event.clientY / window.innerHeight - .5) * 2
    scene.current?.style.setProperty('--mx', `${x}`)
    scene.current?.style.setProperty('--my', `${y}`)
  }
  const toggleSound = () => {
    if (audio.current) { void audio.current.close(); audio.current = null; setSoundOn(false); return }
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'; oscillator.frequency.value = 92; gain.gain.value = .018
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start()
    audio.current = context; setSoundOn(true)
  }
  const enterUniverse = () => {
    if (entering) return
    setEntering(true)
    window.setTimeout(() => navigate('/login'), 760)
  }

  return (
    <main className={`landing-minimal ${entering ? 'landing-minimal--entering' : ''}`} ref={scene} onMouseMove={move}>
      <div className="landing-minimal__image" />
      <div className="landing-minimal__vignette" />
      <div className="landing-nebula" />
      <div className="cosmos-drift" aria-hidden="true" />
      <div className="planet-orbit" aria-hidden="true"><i/><i/><i/></div>
      <i className="shooting-star shooting-star--one" aria-hidden="true" />
      <i className="shooting-star shooting-star--two" aria-hidden="true" />
      {stars.map(([left,top,delay],index)=><i className={`twinkle twinkle--${index%3}`} key={`${left}-${top}`} style={{left,top,animationDelay:delay}} />)}
      <div className="rose-aura"><span/><i/><b/></div>
      <div className="scarf-motion scarf-motion--one"/><div className="scarf-motion scarf-motion--two"/>
      <header className="minimal-brand"><span>B</span><div><strong>B612</strong><small>SCRUM UNIVERSE</small></div></header>
      <nav className="minimal-nav"><button onClick={enterUniverse}>Entrar al universo <ArrowUpRight size={15}/></button></nav>
      <section className="minimal-copy"><p>UNA EXPERIENCIA PARA CÉLULAS QUE CRECEN</p><h1>Viaja.<br/><span>Construye.</span><br/>Florece.</h1><button onClick={enterUniverse}>Comenzar viaje <ArrowUpRight size={18}/></button></section>
      <div className="universe-warp" aria-hidden="true"><span /><i /><b /></div>
      <div className="minimal-caption"><span>01</span><p>B612 convierte cada sprint en una historia que vale la pena recordar.</p></div>
      <button className={`sound-control ${soundOn?'sound-control--active':''}`} aria-label={soundOn?'Desactivar ambiente':'Activar ambiente'} onClick={toggleSound}><Volume2 size={16}/></button>
      <div className="scroll-mark"><span/> Mueve el cursor para explorar</div>
    </main>
  )
}
