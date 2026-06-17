'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Wizard from '@/components/Wizard'
import Dashboard from '@/components/Dashboard'

type Tab = 'dashboard' | 'wizard'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />
      case 'wizard':    return <Wizard onComplete={() => setActiveTab('dashboard')} />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {renderContent()}
      </main>
    </div>
  )
}
