'use client'

type Tab = 'dashboard' | 'wizard'

interface SidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems: { id: Tab; label: string; icon: string; description: string }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '◈',
    description: 'Financial ledger & reports',
  },
  {
    id: 'wizard',
    label: 'Create Entry',
    icon: '✦',
    description: 'Register guest or service',
  },
]

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="
      w-64 flex-shrink-0 h-screen sticky top-0
      bg-[#1e293b] border-r border-[#334155]
      flex flex-col
      print:hidden
    ">
      {/* Logo / Brand */}
      <div className="px-6 py-6 border-b border-[#334155]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-sky-500/20">
            G
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm leading-tight">Garden Inn</h1>
            <p className="text-xs text-slate-500 leading-tight">Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-4 mb-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
          Navigation
        </p>
        {navItems.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            onClick={() => onTabChange(item.id)}
            className={`
              w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl
              font-medium text-sm transition-all duration-200
              ${activeTab === item.id
                ? 'bg-sky-600/20 text-sky-300 border border-sky-600/30'
                : 'text-slate-400 hover:bg-[#334155]/50 hover:text-slate-200 border border-transparent'
              }
            `}
          >
            <span className={`text-base mt-0.5 ${activeTab === item.id ? 'text-sky-400' : 'text-slate-600'}`}>
              {item.icon}
            </span>
            <div>
              <div className="leading-tight">{item.label}</div>
              <div className="text-[11px] font-normal mt-0.5 opacity-60">{item.description}</div>
            </div>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#334155]">
        <p className="text-xs text-slate-600 leading-relaxed">
          Garden Inn &copy; {new Date().getFullYear()}<br />
          <span className="text-[10px]">Hotel Management v1.1</span>
        </p>
      </div>
    </aside>
  )
}
