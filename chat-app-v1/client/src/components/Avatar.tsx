const COLORS = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-teal-500']

export function Avatar({ name, online, size = 'md' }: { name: string; online?: boolean; size?: 'sm' | 'md' }) {
  const color = COLORS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length]
  const dims = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-10 w-10 text-sm'
  return (
    <span className="relative inline-flex shrink-0">
      <span className={`${dims} ${color} inline-flex items-center justify-center rounded-full font-semibold text-white uppercase`}>
        {name.slice(0, 2)}
      </span>
      {online !== undefined && (
        <span className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${online ? 'bg-emerald-400' : 'bg-slate-600'}`} />
      )}
    </span>
  )
}
