'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from './ui/Button'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-16 border-b border-gray-800 px-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        Log out
      </Button>
    </header>
  )
}
