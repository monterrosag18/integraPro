import { Float, OrbitControls, Sparkles, Stars } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useRef } from 'react'
import type { Group } from 'three'

function Asteroid() {
  const ref = useRef<Group>(null)
  useFrame((state, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * 0.08
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.12 - 1.1
  })

  return (
    <group ref={ref} rotation={[-0.18, 0.15, -0.08]}>
      <mesh receiveShadow castShadow scale={[3.35, 1.35, 3.05]}>
        <icosahedronGeometry args={[1, 4]} />
        <meshStandardMaterial color="#9b6658" roughness={0.9} metalness={0.02} />
      </mesh>
      <mesh position={[-1.4, 0.86, 0.25]} rotation={[0.2, 0, -0.15]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 1.25, 10]} />
        <meshStandardMaterial color="#5f8a4e" />
      </mesh>
      <mesh position={[-1.4, 1.58, 0.25]} castShadow>
        <sphereGeometry args={[0.33, 18, 18]} />
        <meshStandardMaterial color="#e84a67" roughness={0.6} />
      </mesh>
      {[-1.55, -1.27].map((x, i) => (
        <mesh key={x} position={[x, 1.25 - i * .05, .25]} rotation={[0, 0, i ? -.8 : .8]}>
          <sphereGeometry args={[.18, 12, 8]} />
          <meshStandardMaterial color="#d43e5d" />
        </mesh>
      ))}
      <LittleExplorer />
      <mesh position={[1.8, .85, -.5]} rotation={[0, 0, .08]}>
        <coneGeometry args={[.42, .8, 8]} />
        <meshStandardMaterial color="#6b477b" roughness={.9} />
      </mesh>
    </group>
  )
}

function LittleExplorer() {
  return (
    <group position={[.55, 1.0, .25]} rotation={[0, -.35, -.04]}>
      <mesh position={[0, 1.28, 0]} castShadow>
        <sphereGeometry args={[.42, 24, 24]} />
        <meshStandardMaterial color="#ffd5a0" roughness={.72} />
      </mesh>
      {[[-.3, 1.56, -.08],[-.12,1.7,0],[.08,1.68,0],[.28,1.53,-.05]].map((p, i) => (
        <mesh key={i} position={p as [number,number,number]} rotation={[0,0,(i-1.5)*.22]}>
          <coneGeometry args={[.13,.48,7]} />
          <meshStandardMaterial color="#e7bc52" />
        </mesh>
      ))}
      <mesh position={[0, .58, 0]} castShadow>
        <capsuleGeometry args={[.38, .86, 8, 16]} />
        <meshStandardMaterial color="#e9bf4f" roughness={.62} />
      </mesh>
      <mesh position={[-.26, .82, .02]} rotation={[0,0,1.45]}>
        <boxGeometry args={[1.25,.13,.12]} />
        <meshStandardMaterial color="#eb5c5c" />
      </mesh>
      <mesh position={[-.86, .72, .02]} rotation={[0,0,-.18]}>
        <boxGeometry args={[.75,.12,.12]} />
        <meshStandardMaterial color="#eb5c5c" />
      </mesh>
      <mesh position={[-.18, -.1, 0]} rotation={[0,0,.08]}><capsuleGeometry args={[.11,.72,6,10]} /><meshStandardMaterial color="#d7aa42" /></mesh>
      <mesh position={[.2, -.1, 0]} rotation={[0,0,-.08]}><capsuleGeometry args={[.11,.72,6,10]} /><meshStandardMaterial color="#d7aa42" /></mesh>
    </group>
  )
}

function SceneContent() {
  return (
    <>
      <color attach="background" args={["#070517"]} />
      <fog attach="fog" args={["#070517", 10, 24]} />
      <ambientLight intensity={1.15} />
      <directionalLight castShadow position={[-5, 8, 6]} intensity={3.8} color="#ffe0a4" />
      <pointLight position={[5, 2, 4]} intensity={18} color="#a855f7" distance={12} />
      <pointLight position={[-5, -2, 2]} intensity={10} color="#ff526c" distance={10} />
      <Float speed={1.1} rotationIntensity={.12} floatIntensity={.3}><Asteroid /></Float>
      <Stars radius={45} depth={22} count={1700} factor={3.5} saturation={.35} fade speed={.45} />
      <Sparkles count={45} scale={[12,8,8]} size={2.2} speed={.35} color="#ffd580" />
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 2.35} maxPolarAngle={Math.PI / 1.75} autoRotate autoRotateSpeed={.28} />
    </>
  )
}

export function B612Scene() {
  return <Canvas shadows dpr={[1, 1.7]} camera={{ position: [0, 2.4, 10], fov: 42 }}><Suspense fallback={null}><SceneContent /></Suspense></Canvas>
}
