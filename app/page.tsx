'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import BookingForm from '@/components/BookingForm'
import ServiceForm from '@/components/ServiceForm'
import Dashboard from '@/components/Dashboard'

type Tab = 'dashboard' | 'new-booking' | 'add-service'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':   return <Dashboard />
      case 'new-booking': return <BookingForm />
      case 'add-service': return <ServiceForm />
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
