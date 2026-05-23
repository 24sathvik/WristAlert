import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// A single procedural gear made from cylinders
function Gear({
  position,
  radius,
  teeth,
  speed,
  color = '#1a2a1a',
  emissive = '#00ff4420',
}: {
  position: [number, number, number]
  radius: number
  teeth: number
  speed: number
  color?: string
  emissive?: string
}) {
  const groupRef = useRef<THREE.Group>(null)

  // Build gear geometry from tooth segments
  const gearShape = useMemo(() => {
    const shape = new THREE.Shape()
    const innerR = radius * 0.65
    const outerR = radius
    const toothH = radius * 0.22
    const toothW = (Math.PI * 2) / teeth

    for (let i = 0; i < teeth; i++) {
      const a0 = i * toothW - toothW * 0.5
      const a1 = i * toothW - toothW * 0.15
      const a2 = i * toothW + toothW * 0.15
      const a3 = i * toothW + toothW * 0.5

      if (i === 0) {
        shape.moveTo(innerR * Math.cos(a0), innerR * Math.sin(a0))
      } else {
        shape.lineTo(innerR * Math.cos(a0), innerR * Math.sin(a0))
      }
      shape.lineTo((outerR + toothH) * Math.cos(a1), (outerR + toothH) * Math.sin(a1))
      shape.lineTo((outerR + toothH) * Math.cos(a2), (outerR + toothH) * Math.sin(a2))
      shape.lineTo(innerR * Math.cos(a3), innerR * Math.sin(a3))
    }
    shape.closePath()

    // Hole in center
    const hole = new THREE.Path()
    hole.absarc(0, 0, innerR * 0.45, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    return shape
  }, [radius, teeth])

  const extrudeSettings = useMemo(() => ({
    depth: radius * 0.18,
    bevelEnabled: true,
    bevelThickness: radius * 0.03,
    bevelSize: radius * 0.02,
    bevelSegments: 3,
  }), [radius])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * speed
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow receiveShadow>
        <extrudeGeometry args={[gearShape, extrudeSettings]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.4}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      {/* Axle cylinder */}
      <mesh>
        <cylinderGeometry args={[radius * 0.12, radius * 0.12, radius * 0.5, 16]} />
        <meshStandardMaterial color="#0d1a0d" metalness={1} roughness={0.1} />
      </mesh>
    </group>
  )
}

function GearSystem() {
  return (
    <group>
      {/* Large central gear */}
      <Gear position={[0, 0, -3]} radius={2.4} teeth={18} speed={0.08} color="#0e1e0e" emissive="#00ff4430" />
      {/* Right gear */}
      <Gear position={[4.6, 0.6, -3.5]} radius={1.5} teeth={12} speed={-0.13} color="#0a180a" emissive="#00cc3320" />
      {/* Left gear */}
      <Gear position={[-4.5, -0.5, -3.5]} radius={1.8} teeth={14} speed={-0.1} color="#0c1c0c" emissive="#00ff4420" />
      {/* Small top-right */}
      <Gear position={[2.8, 3.6, -4]} radius={0.9} teeth={8} speed={0.22} color="#0a1a0a" emissive="#00ff6640" />
      {/* Small bottom-left */}
      <Gear position={[-2.5, -3.5, -4]} radius={1.1} teeth={9} speed={0.18} color="#0b1b0b" emissive="#00ee4430" />
      {/* Tiny accent gears */}
      <Gear position={[6.5, -2.5, -4.5]} radius={0.6} teeth={7} speed={-0.28} color="#091509" emissive="#00ff4415" />
      <Gear position={[-6, 2.2, -4.5]} radius={0.7} teeth={6} speed={0.3} color="#091509" emissive="#00ff4415" />
    </group>
  )
}

export default function WatchTickBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden
      style={{ opacity: 0.18 }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 65 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#00ff88" />
        <pointLight position={[-5, -5, 3]} intensity={0.8} color="#00aaff" />
        <GearSystem />
      </Canvas>
    </div>
  )
}
