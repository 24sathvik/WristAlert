// Subtle rotating watch hands in background — pure CSS, no library
export default function WatchTickBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {/* Large ghost watch face — top right corner */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] opacity-[0.025]">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Watch face circle */}
          <circle cx="100" cy="100" r="95" stroke="#00ff7f" strokeWidth="2" fill="none"/>
          {/* Hour markers */}
          {Array.from({length: 12}).map((_, i) => {
            const angle = (i * 30 - 90) * Math.PI / 180;
            const x1 = 100 + 80 * Math.cos(angle);
            const y1 = 100 + 80 * Math.sin(angle);
            const x2 = 100 + 90 * Math.cos(angle);
            const y2 = 100 + 90 * Math.sin(angle);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00ff7f" strokeWidth="3"/>;
          })}
          {/* Minute markers */}
          {Array.from({length: 60}).map((_, i) => {
            if (i % 5 === 0) return null;
            const angle = (i * 6 - 90) * Math.PI / 180;
            const x1 = 100 + 85 * Math.cos(angle);
            const y1 = 100 + 85 * Math.sin(angle);
            const x2 = 100 + 90 * Math.cos(angle);
            const y2 = 100 + 90 * Math.sin(angle);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00ff7f" strokeWidth="1"/>;
          })}
          {/* Animated hour hand */}
          <line x1="100" y1="100" x2="100" y2="55"
            stroke="#00ff7f" strokeWidth="3" strokeLinecap="round"
            style={{
              transformOrigin: '100px 100px',
              animation: 'hourHand 43200s linear infinite'
            }}
          />
          {/* Animated minute hand */}
          <line x1="100" y1="100" x2="100" y2="40"
            stroke="#00ff7f" strokeWidth="2" strokeLinecap="round"
            style={{
              transformOrigin: '100px 100px',
              animation: 'minuteHand 3600s linear infinite'
            }}
          />
          {/* Animated second hand */}
          <line x1="100" y1="100" x2="100" y2="35"
            stroke="#00ff7f" strokeWidth="1" strokeLinecap="round"
            style={{
              transformOrigin: '100px 100px',
              animation: 'secondHand 60s steps(60, end) infinite'
            }}
          />
          <circle cx="100" cy="100" r="3" fill="#00ff7f"/>
        </svg>
      </div>
      {/* Small ghost watch face — bottom left corner */}
      <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] opacity-[0.015]">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="95" stroke="#00ff7f" strokeWidth="2" fill="none"/>
          {Array.from({length: 12}).map((_, i) => {
            const angle = (i * 30 - 90) * Math.PI / 180;
            const x1 = 100 + 80 * Math.cos(angle), y1 = 100 + 80 * Math.sin(angle);
            const x2 = 100 + 90 * Math.cos(angle), y2 = 100 + 90 * Math.sin(angle);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00ff7f" strokeWidth="3"/>;
          })}
        </svg>
      </div>
    </div>
  );
}
