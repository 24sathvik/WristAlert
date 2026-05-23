import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'

interface SplashAnimationProps {
  onComplete: () => void
}

// Elegant watch face SVG — live clock ticking
function WatchFace({ visible }: { visible: boolean }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 50)
    return () => clearInterval(t)
  }, [])

  const seconds = time.getSeconds() + time.getMilliseconds() / 1000
  const minutes = time.getMinutes() + seconds / 60
  const hours = (time.getHours() % 12) + minutes / 60

  const secAngle = seconds * 6
  const minAngle = minutes * 6
  const hourAngle = hours * 30

  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180)
  const cx = 100
  const cy = 100

  return (
    <motion.svg
      viewBox="0 0 200 200"
      className="w-64 h-64"
      initial={{ opacity: 0, scale: 0.6, rotateY: 90 }}
      animate={visible ? { opacity: 1, scale: 1, rotateY: 0 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Outer bezel */}
      <circle cx={cx} cy={cy} r="96" fill="none" stroke="url(#bezGrad)" strokeWidth="3" />
      <circle cx={cx} cy={cy} r="90" fill="url(#faceGrad)" />

      {/* Subtle grid texture */}
      <circle cx={cx} cy={cy} r="88" fill="none" stroke="#ffffff04" strokeWidth="1" />

      {/* Hour markers */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = toRad(i * 30)
        const isMain = i % 3 === 0
        const r1 = isMain ? 72 : 78
        const r2 = 86
        return (
          <line
            key={i}
            x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)}
            x2={cx + r2 * Math.cos(a)} y2={cy + r2 * Math.sin(a)}
            stroke={isMain ? 'url(#goldGrad)' : '#ffffff30'}
            strokeWidth={isMain ? 2.5 : 1}
            strokeLinecap="round"
          />
        )
      })}

      {/* Minute markers */}
      {Array.from({ length: 60 }).map((_, i) => {
        if (i % 5 === 0) return null
        const a = toRad(i * 6)
        return (
          <line
            key={i}
            x1={cx + 82 * Math.cos(a)} y1={cy + 82 * Math.sin(a)}
            x2={cx + 86 * Math.cos(a)} y2={cy + 86 * Math.sin(a)}
            stroke="#ffffff18" strokeWidth="0.8"
          />
        )
      })}

      {/* Brand text */}
      <text x={cx} y={cy - 22} textAnchor="middle" fill="#ffffff60" fontSize="6" fontFamily="serif" letterSpacing="3">
        WRISTALERT
      </text>
      <text x={cx} y={cy - 14} textAnchor="middle" fill="#00ff6640" fontSize="4" fontFamily="monospace" letterSpacing="2">
        SWISS PRECISION
      </text>

      {/* Hour hand */}
      <line
        x1={cx} y1={cy}
        x2={cx + 42 * Math.cos(toRad(hourAngle))}
        y2={cy + 42 * Math.sin(toRad(hourAngle))}
        stroke="url(#goldGrad)" strokeWidth="4" strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1={cx} y1={cy}
        x2={cx + 60 * Math.cos(toRad(minAngle))}
        y2={cy + 60 * Math.sin(toRad(minAngle))}
        stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round"
      />
      {/* Second hand */}
      <line
        x1={cx - 15 * Math.cos(toRad(secAngle))}
        y1={cy - 15 * Math.sin(toRad(secAngle))}
        x2={cx + 72 * Math.cos(toRad(secAngle))}
        y2={cy + 72 * Math.sin(toRad(secAngle))}
        stroke="#00ff66" strokeWidth="1.2" strokeLinecap="round"
      />

      {/* Center cap */}
      <circle cx={cx} cy={cy} r="4" fill="url(#goldGrad)" />
      <circle cx={cx} cy={cy} r="2" fill="#0a0a0a" />

      <defs>
        <radialGradient id="faceGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#080808" />
        </radialGradient>
        <linearGradient id="bezGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff30" />
          <stop offset="40%" stopColor="#ffffff08" />
          <stop offset="100%" stopColor="#ffffff20" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#f0c93a" />
        </linearGradient>
      </defs>
    </motion.svg>
  )
}

// Animated number counter for the brand reveal
function CountUp({ target, duration }: { target: number, duration: number }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, v => Math.round(v))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const c = animate(mv, target, { duration, ease: 'easeOut' })
    const unsub = rounded.on('change', v => setDisplay(v))
    return () => { c.stop(); unsub() }
  }, [target, duration, mv, rounded])

  return <span>{display}</span>
}

export default function SplashAnimation({ onComplete }: SplashAnimationProps) {
  const [phase, setPhase] = useState<'watch' | 'brand' | 'exit'>('watch')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('brand'), 2000)
    const t2 = setTimeout(() => setPhase('exit'), 4200)
    const t3 = setTimeout(() => onComplete(), 5000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  return (
    <AnimatePresence>
      {phase !== 'exit' && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at center, #0d1a0d 0%, #050805 50%, #000000 100%)' }}
        >
          {/* Subtle particle dots */}
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 2 + 1,
                height: Math.random() * 2 + 1,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: i % 3 === 0 ? '#d4af37' : '#00ff66',
              }}
              animate={{
                opacity: [0, 0.6, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}

          {/* Outer glowing ring */}
          <motion.div
            className="absolute rounded-full border border-primary/20"
            initial={{ width: 280, height: 280, opacity: 0 }}
            animate={{ width: 400, height: 400, opacity: [0, 0.4, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute rounded-full border border-[#d4af37]/10"
            initial={{ width: 220, height: 220, opacity: 0 }}
            animate={{ width: 360, height: 360, opacity: [0, 0.3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />

          {/* Watch face */}
          <div className="relative z-10 flex flex-col items-center gap-10">
            <WatchFace visible={phase === 'watch' || phase === 'brand'} />

            {/* Brand text reveal */}
            <AnimatePresence>
              {phase === 'brand' && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="text-center flex flex-col items-center gap-3"
                >
                  {/* Thin gold divider */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="w-40 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }}
                  />

                  <motion.h1
                    className="text-4xl font-display font-bold tracking-wide"
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 30%, #d4af37 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: 'none',
                    }}
                    initial={{ letterSpacing: '0.2em', opacity: 0 }}
                    animate={{ letterSpacing: '0.05em', opacity: 1 }}
                    transition={{ duration: 0.9 }}
                  >
                    WristAlert
                  </motion.h1>

                  <motion.p
                    className="text-xs tracking-[0.35em] font-mono"
                    style={{ color: '#d4af37aa' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    TRACK · ALERT · NEVER MISS A DEAL
                  </motion.p>

                  {/* Thin gold divider */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="w-24 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, #d4af3750, transparent)' }}
                  />

                  {/* Stats tease */}
                  <motion.div
                    className="flex gap-8 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className="text-center">
                      <div className="text-lg font-mono font-bold text-primary">
                        <CountUp target={5} duration={1.2} />m
                      </div>
                      <div className="text-[10px] tracking-wider text-text-muted">TRACKING INTERVAL</div>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="text-center">
                      <div className="text-lg font-mono font-bold text-primary">
                        <CountUp target={24} duration={1.5} />h
                      </div>
                      <div className="text-[10px] tracking-wider text-text-muted">LIVE MONITORING</div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Corner accents */}
          {[
            'top-6 left-6 border-t border-l',
            'top-6 right-6 border-t border-r',
            'bottom-6 left-6 border-b border-l',
            'bottom-6 right-6 border-b border-r',
          ].map((cls, i) => (
            <motion.div
              key={i}
              className={`absolute w-8 h-8 ${cls}`}
              style={{ borderColor: '#d4af3740' }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
