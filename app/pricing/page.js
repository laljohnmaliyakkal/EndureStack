'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../../components/AuthProvider'
import Navbar from '../../components/Navbar'

const PRICING = {
    monthly: {
        label: 'Monthly',
        base: 69,
        premium: 149
    },
    quarterly: {
        label: 'Quarterly',
        base: 199,
        premium: 349
    },
    halfYearly: {
        label: 'Half-Yearly',
        base: 369,
        premium: 649
    },
    annual: {
        label: 'Annual',
        base: 729,
        premium: 1199
    }
}

export default function PricingPage() {
    const [billingCycle, setBillingCycle] = useState('monthly')
    const { user } = useAuth()

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {user && <Navbar />}

            <div className="container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {!user && (
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', paddingTop: '1rem' }}>
                        <Link href="/" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                            Endure<span style={{ color: 'var(--primary)' }}>Stack</span>
                        </Link>
                        <Link href="/auth/login" style={{ color: 'var(--secondary)', fontWeight: '600' }}>
                            Login
                        </Link>
                    </header>
                )}

                <div className="pricing-header" style={{ marginTop: user ? '0' : '0' }}>
                    <h1 className="pricing-title">Flexible Pricing for Everyone</h1>
                    <p className="pricing-subtitle">Choose the plan that fits your fitness journey.</p>

                    {/* Billing Cycle Toggle */}
                    <div className="billing-toggle">
                        {Object.keys(PRICING).map((cycle) => (
                            <button
                                key={cycle}
                                onClick={() => setBillingCycle(cycle)}
                                className={`billing-btn ${billingCycle === cycle ? 'active' : ''}`}
                            >
                                {PRICING[cycle].label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pricing-grid">
                    {/* Base Plan */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Base Plan</h2>
                        <p style={{ color: 'var(--secondary)', marginBottom: '1.5rem' }}>Essential tools for your workout tracking.</p>

                        <div style={{ marginBottom: '2rem' }}>
                            <span style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--foreground)' }}>
                                {PRICING[billingCycle].base}
                            </span>
                            <span style={{ color: 'var(--secondary)', fontSize: '1.1rem' }}> / {PRICING[billingCycle].label}</span>
                        </div>

                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flex: 1 }}>
                            {['Unlimited Workout Logging', 'Progress Tracking', 'Community Access', 'Basic Stats'].map((feature, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', color: 'var(--foreground)' }}>
                                    <span style={{ color: 'var(--success)', marginRight: '0.75rem', fontSize: '1.2rem' }}>✓</span>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <Link href="/auth/signup?plan=base" className="btn" style={{ width: '100%', backgroundColor: 'var(--secondary-bg)', color: 'var(--foreground)', border: '1px solid var(--border)', boxShadow: 'none' }}>
                            Choose Base
                        </Link>
                    </div>

                    {/* Premium Plan */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', border: '2px solid var(--primary)', position: 'relative' }}>
                        <div style={{
                            position: 'absolute',
                            top: '-12px',
                            right: '24px',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 10px rgba(255, 112, 81, 0.3)'
                        }}>
                            MOST POPULAR
                        </div>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Premium Plan</h2>
                        <p style={{ color: 'var(--secondary)', marginBottom: '1.5rem' }}>Supercharge your gains with AI.</p>

                        <div style={{ marginBottom: '2rem' }}>
                            <span style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--primary)' }}>
                                {PRICING[billingCycle].premium}
                            </span>
                            <span style={{ color: 'var(--secondary)', fontSize: '1.1rem' }}> / {PRICING[billingCycle].label}</span>
                        </div>

                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flex: 1 }}>
                            {[
                                'Everything in Base Plan',
                                'AI Analysis for Progress',
                                'AI Workout Suggestions',
                                'AI Diet Plan',
                                'Priority Support'
                            ].map((feature, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', color: 'var(--foreground)' }}>
                                    <span style={{ color: 'var(--primary)', marginRight: '0.75rem', fontSize: '1.2rem' }}>✓</span>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <Link href="/auth/signup?plan=premium" className="btn" style={{ width: '100%' }}>
                            Get Premium
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
