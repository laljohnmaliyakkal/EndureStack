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
            // detailed profile info (like age/height/weight) is missing, we consider it incomplete.
            // We use 'age' as a proxy for completeness.
            const isProfileComplete = profile && profile.age;

            if (!user) {
                router.push('/auth/login')
            } else if ((!profile || !isProfileComplete) && pathname !== '/app/profile') {
                router.push('/app/profile?first_time=true')
            }
            // Existing profile check: If they are on profile page but have a profile, 
            // we let them stay there (it's the edit profile page).
            // Logic to redirect FROM profile TO dashboard on completion 
            // is now handled inside the Profile page component itself.
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

    // Don't show Navbar if no profile (onboard mode)
    const showNavbar = profile !== null

    const isUnpaidClient = profile?.role === 'user' && (profile.payment_status || 'pending') !== 'paid'
    const isProfilePage = pathname === '/app/profile'

    return (
        <div>
            {showNavbar && !isUnpaidClient && <Navbar />}
            <main className="container">
                {isUnpaidClient && !isProfilePage ? (
                    <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', marginTop: '10vh', maxWidth: '500px', margin: '10vh auto' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                        <h2 style={{ marginBottom: '1rem', color: 'var(--danger)' }}>Access Restricted</h2>
                        <p style={{ marginBottom: '1.5rem', color: 'var(--foreground)', fontSize: '1.1rem' }}>
                            Your platform fee payment is currently pending.
                        </p>
                        <p style={{ color: 'var(--secondary)', lineHeight: '1.5' }}>
                            To unlock EndureStack workouts, logging, and plans, please contact your Gym Administrator to process your payment.
                        </p>
                    </div>
                ) : (
                    children
                )}
            </main>
        </div>
    )
}
