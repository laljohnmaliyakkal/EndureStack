'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '../../../../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ConfirmModal from '../../../../../components/ConfirmModal'

export default function PlanDetailPage({ params }) {
    // Correctly unwrap params using React.use()
    const resolvedParams = use(params)
    const id = resolvedParams.id

    const [plan, setPlan] = useState(null)
    const [loading, setLoading] = useState(true)
    const [expandingDay, setExpandingDay] = useState(null)
    const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '', onClose: null })
    const router = useRouter()

    useEffect(() => {
        if (id) fetchPlan()
    }, [id])

    const fetchPlan = async () => {
        try {
            const { data, error } = await supabase
                .from('workout_plans')
                .select(`
                    *,
                    workout_plan_days (
                        *,
                        workout_plan_items (*)
                    )
                `)
                .eq('id', id)
                .single()

            if (error) throw error

            // Sort
            if (data.workout_plan_days) {
                data.workout_plan_days.sort((a, b) => a.day_number - b.day_number)
                data.workout_plan_days.forEach(day => {
                    if (day.workout_plan_items) {
                        day.workout_plan_items.sort((a, b) => a.order_index - b.order_index)
                    }
                })
            }

            setPlan(data)
        } catch (error) {
            console.error('Error fetching plan:', error)
            setAlertState({
                isOpen: true,
                title: 'Error',
                message: 'Error loading plan',
                onClose: () => router.push('/app/trainer/plans')
            })
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div style={{ padding: '2rem' }}>Loading details...</div>
    if (!plan && !alertState.isOpen) return <div style={{ padding: '2rem' }}>Plan not found</div>

    // Support showing modal even if plan is null (e.g. error state)
    if (!plan) return (
        <>
            <div style={{ padding: '2rem' }}>Plan not found</div>
            <ConfirmModal
                isOpen={alertState.isOpen}
                onClose={() => {
                    setAlertState({ ...alertState, isOpen: false })
                    if (alertState.onClose) alertState.onClose()
                }}
                title={alertState.title}
                message={alertState.message}
                isAlert={true}
            />
        </>
    )

    return (
        <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <Link href="/app/trainer/plans" style={{ color: 'var(--secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    ← Back to Plans
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{plan.name}</h1>
                        <p style={{ color: 'var(--secondary)', marginTop: '0.5rem' }}>{plan.description}</p>
                    </div>
                    <Link href={`/app/trainer/plans/${id}/edit`} className="btn">
                        Edit Plan
                    </Link>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {plan.workout_plan_days.map(day => (
                    <div key={day.id} className="card" style={{ padding: '1rem' }}>
                        <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => setExpandingDay(expandingDay === day.id ? null : day.id)}
                        >
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Day {day.day_number}: {day.day_name}</h3>
                            <span>{expandingDay === day.id ? '▲' : '▼'}</span>
                        </div>

                        {expandingDay === day.id && (
                            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                {day.workout_plan_items && day.workout_plan_items.length > 0 ? (
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        {day.workout_plan_items.map(item => (
                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(var(--background-rgb), 0.5)', borderRadius: '6px' }}>
                                                <span>{item.workout_name}</span>
                                                <span style={{ color: 'var(--secondary)' }}>{item.sets} x {item.reps}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--secondary)', fontStyle: 'italic' }}>No exercises in this day.</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <ConfirmModal
                isOpen={alertState.isOpen}
                onClose={() => {
                    setAlertState({ ...alertState, isOpen: false })
                    if (alertState.onClose) alertState.onClose()
                }}
                title={alertState.title}
                message={alertState.message}
                isAlert={true}
            />
        </div>
    )
}
