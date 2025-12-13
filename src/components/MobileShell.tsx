import type { ReactNode } from 'react'

export function MobileShell(props: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-4">
        <header className="mb-4">
          <h1 className="text-lg font-semibold">{props.title}</h1>
        </header>
        <main>{props.children}</main>
      </div>
    </div>
  )
}
