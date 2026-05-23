import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  opacityDir: number
  color: string
  pulse: number
  pulseSpeed: number
}

interface Arc {
  x: number
  y: number
  radius: number
  startAngle: number
  speed: number
  opacity: number
  width: number
  color: string
  gap: number
}

const GOLD = '#d4af37'
const EMERALD = '#00c85a'
const WHITE = '#ffffff'

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export default function WatchTickBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrameId: number
    let W = 0, H = 0

    // ── State ──────────────────────────────────────────────────
    const particles: Particle[] = []
    const arcs: Arc[] = []
    let time = 0

    function resize() {
      W = canvas!.width = window.innerWidth
      H = canvas!.height = window.innerHeight
    }

    function initParticles() {
      particles.length = 0
      const count = Math.min(Math.floor((W * H) / 14000), 80)
      const colors = [GOLD, EMERALD, WHITE, GOLD, GOLD]
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.4 + 0.1,
          opacityDir: Math.random() > 0.5 ? 1 : -1,
          color: colors[Math.floor(Math.random() * colors.length)],
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.02 + 0.005,
        })
      }
    }

    function initArcs() {
      arcs.length = 0
      // Chronograph-style sweeping arcs spread across the canvas
      const arcDefs = [
        // Large background arcs (very faint)
        { xFrac: 0.15, yFrac: 0.2,  r: 180, spd: 0.0003, op: 0.04, w: 1, color: GOLD,    gap: 0.4 },
        { xFrac: 0.85, yFrac: 0.75, r: 220, spd: -0.0002, op: 0.03, w: 1, color: EMERALD, gap: 0.5 },
        { xFrac: 0.5,  yFrac: 0.5,  r: 300, spd: 0.00015, op: 0.025, w: 1.5, color: GOLD, gap: 0.35 },
        // Medium arcs
        { xFrac: 0.8,  yFrac: 0.15, r: 100, spd: 0.0007,  op: 0.07, w: 0.8, color: GOLD,    gap: 0.3 },
        { xFrac: 0.2,  yFrac: 0.82, r: 120, spd: -0.0005, op: 0.06, w: 0.8, color: EMERALD, gap: 0.4 },
        { xFrac: 0.6,  yFrac: 0.25, r: 80,  spd: 0.001,   op: 0.08, w: 0.6, color: WHITE,   gap: 0.5 },
        // Small tight arcs
        { xFrac: 0.35, yFrac: 0.65, r: 50,  spd: 0.002,   op: 0.1,  w: 0.5, color: GOLD,    gap: 0.3 },
        { xFrac: 0.72, yFrac: 0.5,  r: 65,  spd: -0.0015, op: 0.09, w: 0.5, color: EMERALD, gap: 0.4 },
      ]
      for (const d of arcDefs) {
        arcs.push({
          x: d.xFrac * W,
          y: d.yFrac * H,
          radius: d.r,
          startAngle: Math.random() * Math.PI * 2,
          speed: d.spd,
          opacity: d.op,
          width: d.w,
          color: d.color,
          gap: d.gap,
        })
      }
    }

    function drawParticles() {
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.pulse += p.pulseSpeed
        p.opacity += p.opacityDir * 0.003
        if (p.opacity > 0.5 || p.opacity < 0.05) p.opacityDir *= -1

        if (p.x < 0) p.x = W
        if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H
        if (p.y > H) p.y = 0

        const r = p.radius + Math.sin(p.pulse) * 0.5
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx!.fillStyle = p.color + Math.round(p.opacity * 255).toString(16).padStart(2, '0')
        ctx!.fill()
      }
    }

    function drawConnections() {
      const maxDist = 130
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.12
            ctx!.beginPath()
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(particles[j].x, particles[j].y)
            ctx!.strokeStyle = `rgba(212,175,55,${alpha})`
            ctx!.lineWidth = 0.5
            ctx!.stroke()
          }
        }
      }
    }

    function drawArcs() {
      for (const arc of arcs) {
        arc.startAngle += arc.speed
        const sweep = Math.PI * 2 * (1 - arc.gap)

        ctx!.beginPath()
        ctx!.arc(arc.x, arc.y, arc.radius, arc.startAngle, arc.startAngle + sweep)
        ctx!.strokeStyle = arc.color + Math.round(arc.opacity * 255).toString(16).padStart(2, '0')
        ctx!.lineWidth = arc.width
        ctx!.stroke()

        // Glowing tip dot
        const tipX = arc.x + arc.radius * Math.cos(arc.startAngle + sweep)
        const tipY = arc.y + arc.radius * Math.sin(arc.startAngle + sweep)
        const grd = ctx!.createRadialGradient(tipX, tipY, 0, tipX, tipY, 4)
        grd.addColorStop(0, arc.color + '80')
        grd.addColorStop(1, arc.color + '00')
        ctx!.beginPath()
        ctx!.arc(tipX, tipY, 4, 0, Math.PI * 2)
        ctx!.fillStyle = grd
        ctx!.fill()
      }
    }

    function drawGlobalPulse() {
      // Slow breathing radial glow from center
      const pulse = (Math.sin(time * 0.4) + 1) / 2
      const grd = ctx!.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * 0.6)
      grd.addColorStop(0, `rgba(0,200,90,${lerp(0.015, 0.04, pulse)})`)
      grd.addColorStop(0.5, `rgba(212,175,55,${lerp(0.005, 0.015, pulse)})`)
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx!.fillStyle = grd
      ctx!.fillRect(0, 0, W, H)
    }

    function tick() {
      time += 0.016
      ctx!.clearRect(0, 0, W, H)

      drawGlobalPulse()
      drawArcs()
      drawConnections()
      drawParticles()

      animFrameId = requestAnimationFrame(tick)
    }

    resize()
    initParticles()
    initArcs()
    tick()

    const onResize = () => {
      resize()
      initParticles()
      initArcs()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animFrameId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.55, mixBlendMode: 'screen' }}
      aria-hidden
    />
  )
}
