'use client'

import Navbar from '../../components/Navbar'
import { useAuth } from '../../components/AuthProvider'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function AppLayout({ children }) {
    const { user, profile, loading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/auth/login')
            } else if (!profile && pathname !== '/app/complete-profile') {
                router.push('/app/complete-profile')
            } else if (profile && pathname === '/app/complete-profile') {
                router.push('/app/dashboard')
            }
        }
    }, [user, profile, loading, router, pathname])

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                color: 'var(--secondary)'
            }}>
                Loading...
            </div>
        )
    }

    if (!user) {
        return null // Will redirect
    }

    // Don't show Navbar on complete-profile page if you want to restrict navigation, 
    // or keep it but maybe hide links. For now, we will hide Navbar if no profile.
    const showNavbar = profile !== null

    return (
        <div>
            {showNavbar && <Navbar />}
            <main className="container">
                {children}
            </main>
        </div>
    )
}
