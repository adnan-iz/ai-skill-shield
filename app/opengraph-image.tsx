import { ImageResponse } from 'next/og'

export const alt = 'AI Skill Shield — security validation for AI agent skills'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #07140f, #0f172a)',
        color: '#f8fafc',
        padding: '80px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, color: '#86efac', fontSize: 34, fontWeight: 700 }}>
        <div style={{ display: 'flex', width: 58, height: 58, alignItems: 'center', justifyContent: 'center', border: '3px solid #22c55e', borderRadius: 14 }}>S</div>
        AI Skill Shield
      </div>
      <div style={{ display: 'flex', marginTop: 42, maxWidth: 980, fontSize: 68, lineHeight: 1.08, fontWeight: 800, letterSpacing: -2 }}>
        Validate AI agent skills before they run
      </div>
      <div style={{ display: 'flex', marginTop: 28, color: '#cbd5e1', fontSize: 28 }}>
        Security scanning · compatibility checks · install-risk reports
      </div>
    </div>,
    size,
  )
}
