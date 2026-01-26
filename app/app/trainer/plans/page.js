'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../components/AuthProvider'
import Link from 'next/link'
import ConfirmModal from '../../../../components/ConfirmModal'

export default function TrainerPlansPage() {
    const { user } = useAuth()
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [planToDelete, setPlanToDelete] = useState(null)
    const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '' })

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
                .or(`created_by.eq.${user.id},is_public.eq.true`)
                .order('created_at', { ascending: false })

            if (error) throw error
            setPlans(data || [])
        } catch (error) {
            console.error('Error fetching plans:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = (planId) => {
        setPlanToDelete(planId)
        setDeleteModalOpen(true)
    }

    const executeDelete = async () => {
        if (!planToDelete) return

        try {
            const { error } = await supabase
                .from('workout_plans')
                .delete()
                .eq('id', planToDelete)

            if (error) throw error

            // Remove from local state
            setPlans(plans.filter(p => p.id !== planToDelete))
            setDeleteModalOpen(false)
            setPlanToDelete(null)
        } catch (error) {
            console.error('Error deleting plan:', error)
            setAlertState({
                isOpen: true,
                title: 'Error',
                message: 'Failed to delete plan: ' + error.message
            })
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
                        <div key={plan.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{plan.name}</h3>
                                    <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>{plan.description}</p>
                                </div>
                                <div>
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

                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                <Link href={`/app/trainer/plans/${plan.id}`} className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                                    View
                                </Link>
                                <Link href={`/app/trainer/plans/${plan.id}/edit`} className="btn" style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                                    Edit
                                </Link>
                                <button
                                    onClick={() => handleDelete(plan.id)}
                                    className="btn"
                                    disabled={plan.is_public}
                                    title={plan.is_public ? "Public plans cannot be deleted" : "Delete Plan"}
                                    style={{
                                        background: 'transparent',
                                        border: `1px solid ${plan.is_public ? 'var(--secondary)' : 'var(--error)'}`,
                                        color: plan.is_public ? 'var(--secondary)' : 'var(--error)',
                                        fontSize: '0.9rem',
                                        padding: '0.4rem 0.8rem',
                                        opacity: plan.is_public ? 0.5 : 1,
                                        cursor: plan.is_public ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={executeDelete}
                title="Delete Plan"
                message="Are you sure you want to delete this workout plan? This action cannot be undone."
                confirmText="Delete"
                isDanger={true}
            />

            <ConfirmModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState({ ...alertState, isOpen: false })}
                title={alertState.title}
                message={alertState.message}
                isAlert={true}
            />
        </div>
    )
}
