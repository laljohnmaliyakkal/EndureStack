'use client'

import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Navbar() {
    const { user, profile, hasTrainer, signOut } = useAuth()
    const pathname = usePathname()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    if (!user) return null

    const isActive = (path) => pathname === path ? { color: 'var(--primary)' } : {}
    const closeMenu = () => setIsMenuOpen(false)

    return (
        <nav style={{
            backgroundColor: 'var(--card-bg)',
            borderBottom: '1px solid var(--border)',
            padding: '1rem',
            marginBottom: '2rem'
        }}>
            <div className="container nav-container">
                <Link href="/app/dashboard" style={{ fontSize: '1.5rem', fontWeight: 'bold' }} onClick={closeMenu}>
                    Endure<span style={{ color: 'var(--primary)' }}>Stack</span>
                </Link>

                <button
                    className="mobile-menu-btn"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? '✕' : '☰'}
                </button>

                <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
                    <Link href="/app/dashboard" style={isActive('/app/dashboard')} onClick={closeMenu}>Dashboard</Link>

                    {profile?.role === 'user' && (
                        <>
                            <Link href="/app/workouts" style={isActive('/app/workouts')} onClick={closeMenu}>Workouts</Link>
                            <Link href="/app/nutrition" style={isActive('/app/nutrition')} onClick={closeMenu}>Nutrition</Link>
                            <Link href="/app/progress" style={isActive('/app/progress')} onClick={closeMenu}>Progress</Link>
                        </>
                    )}

                    {profile?.role === 'trainer' && (
                        <>
                            <Link href="/app/trainer/users" style={isActive('/app/trainer/users')} onClick={closeMenu}>My Clients</Link>
                        </>
                    )}

                    {profile?.role === 'admin' && (
                        <>
                            <Link href="/app/admin/users" style={isActive('/app/admin/users')} onClick={closeMenu}>Crew</Link>
                        </>
                    )}

                    {profile?.role === 'user' && !hasTrainer && (
                        <Link href="/pricing" style={isActive('/pricing')} onClick={closeMenu}>Plans</Link>
                    )}
                    <Link href="/app/profile" style={isActive('/app/profile')} onClick={closeMenu}>Profile</Link>

                    <button onClick={() => { closeMenu(); signOut(); }} style={{
                        backgroundColor: 'transparent',
                        color: 'var(--secondary)',
                        border: '1px solid var(--border)',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem'
                    }}>
                        Sign Out
                    </button>
                </div>
            </div>
        </nav>
    )
}
