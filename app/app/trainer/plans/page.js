'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../components/AuthProvider'
import Link from 'next/link'

export default function TrainerPlansPage() {
    const { user } = useAuth()
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) {
            fetchPlans()
        }
    }, [user])

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('workout_plans')
                .select('*')
                .eq('created_by', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setPlans(data || [])
        } catch (error) {
            console.error('Error fetching plans:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Workout Plans</h1>
                <Link href="/app/trainer/plans/create" className="btn">
                    Create New Plan
                </Link>
            </div>

            {loading ? (
                <div>Loading plans...</div>
            ) : plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-bg)', borderRadius: '12px' }}>
                    <p style={{ color: 'var(--secondary)', marginBottom: '1rem' }}>You haven't created any workout plans yet.</p>
                    <Link href="/app/trainer/plans/create" className="btn">
                        Create Your First Plan
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {plans.map(plan => (
                        <div key={plan.id} className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{plan.name}</h3>
                                <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>{plan.description}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '999px',
                                    fontSize: '0.8rem',
                                    background: plan.is_public ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--primary-rgb), 0.1)',
                                    color: plan.is_public ? 'var(--success)' : 'var(--primary)'
                                }}>
                                    {plan.is_public ? 'Public' : 'Private'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
