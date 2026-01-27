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
            padding: '1rem 0',
            marginBottom: '2rem'
        }}>
            <div className="container nav-container" style={{ marginBottom: 0, paddingBottom: 0 }}>
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
                            <Link href="/app/nutrition" style={isActive('/app/nutrition')} onClick={closeMenu}>Diet</Link>
                            <Link href="/app/progress" style={isActive('/app/progress')} onClick={closeMenu}>Progress</Link>
                        </>
                    )}

                    {profile?.role === 'trainer' && (
                        <>
                            <Link href="/app/trainer/users" style={isActive('/app/trainer/users')} onClick={closeMenu}>My Clients</Link>
                            <Link href="/app/trainer/plans" style={isActive('/app/trainer/plans')} onClick={closeMenu}>Plans</Link>
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
                    <Link href="/app/profile" style={{ ...isActive('/app/profile'), display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={closeMenu}>
                        {profile?.avatar_url && (
                            <img
                                src={profile.avatar_url}
                                alt="Profile"
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '1px solid var(--border)'
                                }}
                            />
                        )}
                        <span>Profile</span>
                    </Link>

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

            {/* Mobile Tabs */}
            <div className="mobile-nav-tabs">
                <Link href="/app/dashboard" className={`mobile-tab ${pathname === '/app/dashboard' ? 'active' : ''}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    <span>Home</span>
                </Link>

                {profile?.role === 'user' && (
                    <>
                        <Link href="/app/workouts" className={`mobile-tab ${pathname.includes('/app/workouts') ? 'active' : ''}`}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6.5 6.5l5 5 M17.5 17.5l-5-5 M6.5 6.5l-3 3 M17.5 17.5l3-3 M3.5 9.5l4-4 M20.5 14.5l-4 4" />
                                <rect x="2" y="15" width="20" height="4" rx="2" transform="rotate(-45 12 17)" />
                                <path d="M2 17L17 2" strokeWidth="2.5" />
                                {/* Simple Dumbbell approximation */}
                                <path d="M6.3 7.8l8 8 M5 5l2 2 M17 17l2 2" strokeWidth="5" strokeLinecap="round" />
                                <circle cx="5" cy="5" r="3" />
                                <circle cx="19" cy="19" r="3" />
                            </svg>
                            <span>Workouts</span>
                        </Link>
                        <Link href="/app/nutrition" className={`mobile-tab ${pathname.includes('/app/nutrition') ? 'active' : ''}`}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2C7.5 2 4 6.5 4 6.5C4 6.5 4 12 8 16C12 20 17 21 19.5 21C20.5 21 21 20 21 19C21 16.5 21 12 18 8" />
                                <path d="M12 2L16 6" />
                            </svg>
                            <span>Diet</span>
                        </Link>
                        <Link href="/app/progress" className={`mobile-tab ${pathname.includes('/app/progress') ? 'active' : ''}`}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10"></line>
                                <line x1="12" y1="20" x2="12" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                            <span>Progress</span>
                        </Link>
                    </>
                )}

                {profile?.role === 'trainer' && (
                    <>
                        <Link href="/app/trainer/users" className={`mobile-tab ${pathname.includes('/app/trainer/users') ? 'active' : ''}`}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span>Clients</span>
                        </Link>
                        <Link href="/app/trainer/plans" className={`mobile-tab ${pathname.includes('/app/trainer/plans') ? 'active' : ''}`}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>Plans</span>
                        </Link>
                    </>
                )}

                {profile?.role === 'admin' && (
                    <Link href="/app/admin/users" className={`mobile-tab ${pathname.includes('/app/admin') ? 'active' : ''}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span>Crew</span>
                    </Link>
                )}

                <Link href="/app/profile" className={`mobile-tab ${pathname === '/app/profile' ? 'active' : ''}`}>
                    {profile?.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt="Profile"
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                objectFit: 'cover'
                            }}
                        />
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    )}
                    <span>Profile</span>
                </Link>
            </div>
        </nav>
    )
}
