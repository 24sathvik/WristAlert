import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'

// Animated gear that scales + rotates in
function SplashGear({
  position,
  radius,
  teeth,
  speed,
  delay,
  emissive = '#00ff44',
}: {
  position: [number, number, number]
  radius: number
  teeth: number
  speed: number
  delay: number
  emissive?: string
}) {
  const groupRef = useRef<THREE.Group>(null)
  const startTime = useRef<number | null>(null)

  const gearShape = useMemo(() => {
    const shape = new THREE.Shape()
    const innerR = radius * 0.65
    const outerR = radius
    const toothH = radius * 0.25
    const toothW = (Math.PI * 2) / teeth

    for (let i = 0; i < teeth; i++) {
      const a0 = i * toothW - toothW * 0.5
      const a1 = i * toothW - toothW * 0.18
      const a2 = i * toothW + toothW * 0.18
      const a3 = i * toothW + toothW * 0.5
      if (i === 0) shape.moveTo(innerR * Math.cos(a0), innerR * Math.sin(a0))
      else shape.lineTo(innerR * Math.cos(a0), innerR * Math.sin(a0))
      shape.lineTo((outerR + toothH) * Math.cos(a1), (outerR + toothH) * Math.sin(a1))
      shape.lineTo((outerR + toothH) * Math.cos(a2), (outerR + toothH) * Math.sin(a2))
      shape.lineTo(innerR * Math.cos(a3), innerR * Math.sin(a3))
    }
    shape.closePath()
    const hole = new THREE.Path()
    hole.absarc(0, 0, innerR * 0.4, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    return shape
  }, [radius, teeth])

  const extrudeSettings = useMemo(() => ({
    depth: radius * 0.3,
    bevelEnabled: true,
    bevelThickness: radius * 0.04,
    bevelSize: radius * 0.03,
    bevelSegments: 4,
  }), [radius])

  useFrame((state) => {
    if (!groupRef.current) return
    if (startTime.current === null) startTime.current = state.clock.elapsedTime

    const elapsed = state.clock.elapsedTime - startTime.current
    const progress = Math.min(1, Math.max(0, (elapsed - delay) / 0.8))
    const eased = 1 - Math.pow(1 - progress, 3)

    groupRef.current.scale.setScalar(eased)
    groupRef.current.rotation.z += speed * 0.016
    groupRef.current.rotation.x = (1 - eased) * Math.PI * 0.5
  })

  return (
    <group ref={groupRef} position={position} scale={0}>
      <mesh>
        <extrudeGeometry args={[gearShape, extrudeSettings]} />
        <meshStandardMaterial
          color="#0d1f0d"
          emissive={emissive}
          emissiveIntensity={0.8}
          metalness={0.95}
          roughness={0.15}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[radius * 0.1, radius * 0.1, radius * 0.6, 16]} />
        <meshStandardMaterial color="#061006" metalness={1} roughness={0.05} />
      </mesh>
    </group>
  )
}

// Glowing ring that pulses outward
function PulseRing() {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime
    const scale = 1 + Math.sin(t * 2) * 0.08
    meshRef.current.scale.setScalar(scale)
    ;(meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.5 + Math.sin(t * 3) * 0.3
  })
  return (
    <mesh ref={meshRef} position={[0, 0, -0.2]}>
      <torusGeometry args={[1.2, 0.05, 8, 60]} />
      <meshStandardMaterial
        color="#001a00"
        emissive="#00ff44"
        emissiveIntensity={0.8}
        metalness={0.9}
        roughness={0.1}
        transparent
        opacity={0.8}
      />
    </mesh>
  )
}

function SplashScene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 4]} intensity={3} color="#00ff88" />
      <pointLight position={[-4, 3, 2]} intensity={1.5} color="#00aaff" />
      <pointLight position={[4, -3, 2]} intensity={1.2} color="#00ff44" />

      {/* Central large gear */}
      <SplashGear position={[0, 0, 0]} radius={1.2} teeth={16} speed={0.6} delay={0.1} emissive="#00ff66" />
      <PulseRing />

      {/* Surrounding gears fly in with stagger */}
      <SplashGear position={[2.6, 0.8, -0.5]} radius={0.7} teeth={10} speed={-0.95} delay={0.4} emissive="#00ee55" />
      <SplashGear position={[-2.6, -0.8, -0.5]} radius={0.8} teeth={11} speed={-0.85} delay={0.5} emissive="#00dd44" />
      <SplashGear position={[0.8, 2.4, -0.5]} radius={0.6} teeth={8} speed={1.1} delay={0.6} emissive="#00ff77" />
      <SplashGear position={[-0.8, -2.4, -0.5]} radius={0.65} teeth={9} speed={1.0} delay={0.7} emissive="#00ff55" />
      <SplashGear position={[2.2, -2.2, -1]} radius={0.45} teeth={7} speed={-1.4} delay={0.8} emissive="#00cc44" />
      <SplashGear position={[-2.2, 2.2, -1]} radius={0.5} teeth={6} speed={-1.2} delay={0.9} emissive="#00ff44" />
    </>
  )
}

interface SplashAnimationProps {
  onComplete: () => void
}

export default function SplashAnimation({ onComplete }: SplashAnimationProps) {
  const [phase, setPhase] = useState<'intro' | 'text' | 'exit'>('intro')

  useEffect(() => {
    // Show gears for 1.5s, then text for 1.5s, then exit
    const t1 = setTimeout(() => setPhase('text'), 1500)
    const t2 = setTimeout(() => setPhase('exit'), 3000)
    const t3 = setTimeout(() => onComplete(), 3800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        >
          {/* 3D Canvas */}
          <div className="w-full h-full absolute inset-0">
            <Canvas camera={{ position: [0, 0, 6], fov: 55 }} gl={{ antialias: true, alpha: true }}>
              <SplashScene />
            </Canvas>
          </div>

          {/* Overlay text */}
          <AnimatePresence>
            {phase === 'text' && (
              <motion.div
                key="text"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative z-10 text-center pointer-events-none"
              >
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xs font-mono tracking-[0.4em] text-primary/70 mb-3"
                >
                  PRECISION · TRACKING
                </motion.div>
                <h1
                  className="text-5xl font-display font-bold text-white"
                  style={{ textShadow: '0 0 40px rgba(0,255,68,0.5)' }}
                >
                  WristAlert
                </h1>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="h-px w-48 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-4"
                />
                <p className="text-text-muted text-sm mt-3 font-mono tracking-widest">
                  Never miss a watch deal
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Corner scan lines for techy feel */}
          <div className="absolute inset-0 pointer-events-none z-20">
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary/30" />
            <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-primary/30" />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-primary/30" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary/30" />
          </div>

          {/* Horizontal scan line */}
          <motion.div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none z-20"
            animate={{ top: ['0%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
