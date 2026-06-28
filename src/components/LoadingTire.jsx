// Loading Tire Component
export function LoadingTire({ size = 'md' }) {
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  }
  
  return (
    <div className={`relative ${sizes[size]}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full animate-spin" style={{ animationDuration: '1s' }}>
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-primary/30" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/50" />
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = i * 45
          const rad = (angle * Math.PI) / 180
          const x1 = 50 + 15 * Math.cos(rad)
          const y1 = 50 + 15 * Math.sin(rad)
          const x2 = 50 + 38 * Math.cos(rad)
          const y2 = 50 + 38 * Math.sin(rad)
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary" />
          )
        })}
        <circle cx="50" cy="50" r="12" fill="currentColor" className="text-surface-container-high" />
        <circle cx="50" cy="50" r="6" fill="currentColor" className="text-primary" />
      </svg>
    </div>
  )
}