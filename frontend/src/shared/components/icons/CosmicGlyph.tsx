type Glyph = 'planet' | 'rose' | 'board' | 'sprint' | 'docs' | 'rotation'

export function CosmicGlyph({ type, size = 28 }: { type: Glyph; size?: number }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" {...common}>
    {type === 'planet' && <><circle cx="16" cy="16" r="7"/><path d="M4 18c2.5 4 20 7 24-2M6 13c4-4 17-7 22-2"/><path d="M18 11c2 1 3 3 2 5M13 19c1 2 3 3 5 3"/></>}
    {type === 'rose' && <><path d="M16 13c-5-2-6-7-2-9 2-1 3 1 3 2 2-3 7-2 7 2 0 3-3 5-8 5Z"/><path d="M16 13v15M16 19c-4-3-7-1-8 2 4 1 6 0 8-2ZM16 22c4-3 7-1 8 2-4 1-6 0-8-2Z"/></>}
    {type === 'board' && <><rect x="4" y="5" width="24" height="22" rx="4"/><path d="M12 5v22M20 5v22"/><path d="M7 10h2M15 10h2M23 10h2M7 14h2M15 15h2"/></>}
    {type === 'sprint' && <><circle cx="16" cy="16" r="11"/><path d="M16 9v7l5 3M11 4l-3 3M21 4l3 3"/><path d="M12 29h8"/></>}
    {type === 'docs' && <><path d="M8 4h11l5 5v19H8Z"/><path d="M19 4v6h5M12 15h8M12 19h8M12 23h5"/></>}
    {type === 'rotation' && <><path d="M7 9h13a6 6 0 0 1 6 6v1"/><path d="m22 12 4 4 4-4M25 23H12a6 6 0 0 1-6-6v-1"/><path d="m10 20-4-4-4 4"/></>}
  </svg>
}
