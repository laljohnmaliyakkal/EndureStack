'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../components/AuthProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import ConfirmModal from '../../../../components/ConfirmModal'
import Modal from '../../../../components/Modal'

export default function UserPlanPage() {
    const { user } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const targetUserId = searchParams.get('userId') || user?.id
    const [activePlan, setActivePlan] = useState(null)
    const [availablePlans, setAvailablePlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandingDay, setExpandingDay] = useState(null)
    const [assignedByName, setAssignedByName] = useState(null)
    const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isAlert: false })
    const [previewPlan, setPreviewPlan] = useState(null)
    const [previewLoading, setPreviewLoading] = useState(false)

    useEffect(() => {
        if (user && targetUserId) {
            fetchData()
        }
    }, [user, targetUserId])

    const fetchData = async () => {
        try {
            // 1. Check for active plan
            const { data: userPlan } = await supabase
                .from('user_plans')
                .select(`
                    id, 
                    start_date,
                    assigned_by,
                    workout_plans (
                        id, name, description,
                        workout_plan_days (
                            id, day_number, day_name,
                            workout_plan_items (
                                id, workout_name, sets, reps, order_index
                            )
                        )
                    )
                `)
                .eq('user_id', targetUserId)
                .eq('is_active', true)
                .single()

            if (userPlan) {
                // Sort days and items
                if (userPlan.workout_plans && userPlan.workout_plans.workout_plan_days) {
                    userPlan.workout_plans.workout_plan_days.sort((a, b) => a.day_number - b.day_number)
                    userPlan.workout_plans.workout_plan_days.forEach(day => {
                        if (day.workout_plan_items) {
                            day.workout_plan_items.sort((a, b) => a.order_index - b.order_index)
                        }
                    })
                }
                if (userPlan.assigned_by) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('user_id', userPlan.assigned_by)
                        .single()
                    if (profile) setAssignedByName(profile.full_name)
                }
                setActivePlan(userPlan)
            }

            // 2. Fetch public plans (Always fetch to allow switching)
            const { data: plans } = await supabase
                .from('workout_plans')
                .select('*')
                .eq('is_public', true)
                .order('name')

            setAvailablePlans(plans || [])
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePreviewPlan = async (planId) => {
        setPreviewLoading(true)
        setPreviewPlan(null) // Reset
        try {
            const { data, error } = await supabase
                .from('workout_plans')
                .select(`
                    id, name, description,
                    workout_plan_days (
                        id, day_number, day_name,
                        workout_plan_items (
                            id, workout_name, sets, reps, order_index
                        )
                    )
                `)
                .eq('id', planId)
                .single()

            if (error) throw error

            // Sort days and items
            if (data && data.workout_plan_days) {
                data.workout_plan_days.sort((a, b) => a.day_number - b.day_number)
                data.workout_plan_days.forEach(day => {
                    if (day.workout_plan_items) {
                        day.workout_plan_items.sort((a, b) => a.order_index - b.order_index)
                    }
                })
            }

            setPreviewPlan(data)
        } catch (error) {
            console.error('Error fetching plan details:', error)
            setModalState({
                isOpen: true,
                title: 'Error',
                message: 'Failed to load plan details.',
                isAlert: true
            })
        } finally {
            setPreviewLoading(false)
        }
    }

    const handleSelectPlan = (planId) => {
        setModalState({
            isOpen: true,
            title: 'Start Plan',
            message: 'Are you sure you want to start this plan?',
            onConfirm: () => executeSelectPlan(planId)
        })
    }

    const executeSelectPlan = async (planId) => {
        setLoading(true)
        try {
            // 1. Deactivate any existing active plans for this user
            await supabase
                .from('user_plans')
                .update({ is_active: false })
                .eq('user_id', targetUserId)
                .eq('is_active', true)

            // 2. Insert new plan
            const { error } = await supabase
                .from('user_plans')
                .insert({
                    user_id: targetUserId,
                    plan_id: planId,
                    assigned_by: user.id !== targetUserId ? user.id : null,
                    is_active: true,
                    start_date: new Date().toISOString().split('T')[0]
                })

            if (error) throw error
            fetchData() // Refresh to show the new active plan
        } catch (error) {
            setModalState({
                isOpen: true,
                title: 'Error',
                message: 'Error starting plan: ' + error.message,
                isAlert: true
            })
            setLoading(false)
        }
    }

    const handleLeavePlan = () => {
        console.log('Stop Plan clicked')
        setModalState({
            isOpen: true,
            title: 'Stop Plan',
            message: 'Are you sure you want to stop the current plan?',
            confirmText: 'Stop Plan',
            isDanger: true,
            onConfirm: executeLeavePlan
        })
    }

    const executeLeavePlan = async () => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('user_plans')
                .update({ is_active: false })
                .eq('user_id', targetUserId)
                .eq('is_active', true)

            if (error) throw error

            setActivePlan(null)
            fetchData()
        } catch (error) {
            setModalState({
                isOpen: true,
                title: 'Error',
                message: 'Error stopping plan: ' + error.message,
                isAlert: true
            })
            setLoading(false)
        }
    }

    const handleStartWorkout = (dayItems) => {
        setModalState({
            isOpen: true,
            title: 'Start Workout',
            message: 'Start this workout now? This will add these exercises to your daily log.',
            onConfirm: () => executeStartWorkout(dayItems)
        })
    }

    const executeStartWorkout = async (dayItems) => {
        setLoading(true)
        try {
            const today = new Date().toISOString().split('T')[0]

            // 1. Get or Create Session
            let sessionId
            const { data: existingSession, error: fetchError } = await supabase
                .from('workout_sessions')
                .select('id')
                .eq('user_id', targetUserId)
                .eq('session_date', today)
                .single()

            if (existingSession) {
                sessionId = existingSession.id
            } else {
                const { data: newSession, error: createError } = await supabase
                    .from('workout_sessions')
                    .insert([{ user_id: targetUserId, session_date: today }])
                    .select()
                    .single()

                if (createError) throw createError
                sessionId = newSession.id
            }

            // 2. Prepare Logs
            const logsToInsert = []
            dayItems.forEach(item => {
                const sets = item.sets || 3
                const reps = item.reps || 10

                for (let i = 1; i <= sets; i++) {
                    logsToInsert.push({
                        session_id: sessionId,
                        workout_name: item.workout_name,
                        set_number: i,
                        reps: reps,
                        weight: 0,
                        updated_by: user.id
                    })
                }
            })

            // 3. Insert Logs
            if (logsToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('workout_logs')
                    .insert(logsToInsert)

                if (insertError) throw insertError
            }

            // 4. Redirect
            router.push(`/app/workouts/log?userId=${targetUserId}&date=${today}`)

        } catch (error) {
            console.error('Error starting workout:', error)
            setModalState({
                isOpen: true,
                title: 'Error',
                message: 'Failed to start workout: ' + error.message,
                isAlert: true
            })
            setLoading(false)
        }
    }

    if (loading) return <div>Loading plan...</div>

    if (activePlan) {
        const plan = activePlan.workout_plans
        return (
            <div style={{ paddingBottom: '4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.5rem' }}>My Plan</h1>
                    <button
                        type="button"
                        onClick={handleLeavePlan}
                        style={{ color: 'var(--danger)', background: 'none', border: '1px solid var(--danger)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Stop Plan
                    </button>
                </div>

                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{plan.name}</h2>
                    <p style={{ color: 'var(--secondary)' }}>{plan.description}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginTop: '0.5rem' }}>
                        Started on {new Date(activePlan.start_date).toLocaleDateString()}
                    </p>
                    {assignedByName && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                            Assigned by {assignedByName}
                        </p>
                    )}
                </div>

                <h3 style={{ marginBottom: '1rem' }}>Weekly Schedule</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {plan.workout_plan_days.map(day => (
                        <div key={day.id} className="card" style={{ padding: '1rem' }}>
                            <div
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                onClick={() => setExpandingDay(expandingDay === day.id ? null : day.id)}
                            >
                                <h4 style={{ fontWeight: 'bold' }}>Day {day.day_number}: {day.day_name}</h4>
                                <span>{expandingDay === day.id ? '▲' : '▼'}</span>
                            </div>

                            {expandingDay === day.id && (
                                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                    {day.workout_plan_items.map(item => (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                            <span>{item.workout_name}</span>
                                            <span style={{ color: 'var(--secondary)' }}>{item.sets} x {item.reps}</span>
                                        </div>
                                    ))}
                                    <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                                        <button
                                            className="btn"
                                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                            onClick={() => handleStartWorkout(day.workout_plan_items)}
                                        >
                                            Start Workout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <Modal
                    isOpen={!!previewPlan || previewLoading}
                    onClose={() => setPreviewPlan(null)}
                    title={previewPlan ? previewPlan.name : 'Loading...'}
                    footer={
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', width: '100%' }}>
                            <button
                                onClick={() => setPreviewPlan(null)}
                                className="btn"
                                style={{ backgroundColor: 'var(--secondary)' }}
                            >
                                Close
                            </button>
                            {previewPlan && (
                                <button
                                    onClick={() => {
                                        setPreviewPlan(null)
                                        handleSelectPlan(previewPlan.id)
                                    }}
                                    className="btn"
                                >
                                    Start Plan
                                </button>
                            )}
                        </div>
                    }
                >
                    {previewLoading ? (
                        <p>Loading plan details...</p>
                    ) : (
                        previewPlan && (
                            <div>
                                <p style={{ color: 'var(--secondary)', marginBottom: '1.5rem' }}>{previewPlan.description}</p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {previewPlan.workout_plan_days.map(day => (
                                        <div key={day.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                                            <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Day {day.day_number}: {day.day_name}</h4>
                                            <div style={{ paddingLeft: '0.5rem' }}>
                                                {day.workout_plan_items.map(item => (
                                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                                        <span>{item.workout_name}</span>
                                                        <span style={{ color: 'var(--secondary)' }}>{item.sets} x {item.reps}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    )}
                </Modal>

                <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Switch to Another Plan</h2>
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {availablePlans.filter(p => p.id !== activePlan.workout_plans.id).map(plan => (
                            <div key={plan.id} className="card">
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{plan.name}</h3>
                                <p style={{ color: 'var(--secondary)', marginBottom: '1rem' }}>{plan.description}</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button
                                        className="btn"
                                        style={{ width: '100%', fontSize: '0.9rem', padding: '0.5rem', textAlign: 'center', background: 'var(--secondary-bg)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                                        onClick={() => handlePreviewPlan(plan.id)}
                                    >
                                        View Details
                                    </button>
                                    <button
                                        className="btn"
                                        style={{ width: '100%', fontSize: '0.9rem', padding: '0.5rem', textAlign: 'center', background: 'var(--secondary-bg)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                                        onClick={() => handleSelectPlan(plan.id)}
                                    >
                                        Start Plan
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <ConfirmModal
                    isOpen={modalState.isOpen}
                    onClose={() => setModalState({ ...modalState, isOpen: false })}
                    onConfirm={() => {
                        if (modalState.onConfirm) modalState.onConfirm()
                        setModalState({ ...modalState, isOpen: false })
                    }}
                    title={modalState.title}
                    message={modalState.message}
                    isAlert={modalState.isAlert}
                />
            </div>
        )
    }

    return (
        <div>
            <h1>Select a Workout Plan</h1>
            <p style={{ color: 'var(--secondary)', marginBottom: '2rem' }}>You don't have an active plan. Choose one to get started.</p>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {availablePlans.map(plan => (
                    <div key={plan.id} className="card">
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{plan.name}</h3>
                        <p style={{ color: 'var(--secondary)', marginBottom: '1rem' }}>{plan.description}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button
                                className="btn"
                                style={{ width: '100%', fontSize: '0.9rem', padding: '0.5rem', textAlign: 'center', background: 'var(--secondary-bg)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                                onClick={() => handlePreviewPlan(plan.id)}
                            >
                                View Details
                            </button>
                            <button
                                className="btn"
                                style={{ width: '100%', fontSize: '0.9rem', padding: '0.5rem', textAlign: 'center', background: 'var(--secondary-bg)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                                onClick={() => handleSelectPlan(plan.id)}
                            >
                                Start Plan
                            </button>
                        </div>
                    </div>
                ))}
            </div>


            <Modal
                isOpen={!!previewPlan || previewLoading}
                onClose={() => setPreviewPlan(null)}
                title={previewPlan ? previewPlan.name : 'Loading...'}
                footer={
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', width: '100%' }}>
                        <button
                            onClick={() => setPreviewPlan(null)}
                            className="btn"
                            style={{ backgroundColor: 'var(--secondary)' }}
                        >
                            Close
                        </button>
                        {previewPlan && (
                            <button
                                onClick={() => {
                                    setPreviewPlan(null)
                                    handleSelectPlan(previewPlan.id)
                                }}
                                className="btn"
                            >
                                Start Plan
                            </button>
                        )}
                    </div>
                }
            >
                {previewLoading ? (
                    <p>Loading plan details...</p>
                ) : (
                    previewPlan && (
                        <div>
                            <p style={{ color: 'var(--secondary)', marginBottom: '1.5rem' }}>{previewPlan.description}</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {previewPlan.workout_plan_days.map(day => (
                                    <div key={day.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                                        <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Day {day.day_number}: {day.day_name}</h4>
                                        <div style={{ paddingLeft: '0.5rem' }}>
                                            {day.workout_plan_items.map(item => (
                                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                                    <span>{item.workout_name}</span>
                                                    <span style={{ color: 'var(--secondary)' }}>{item.sets} x {item.reps}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}
            </Modal>

            <ConfirmModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ ...modalState, isOpen: false })}
                onConfirm={() => {
                    if (modalState.onConfirm) modalState.onConfirm()
                    setModalState({ ...modalState, isOpen: false })
                }}
                title={modalState.title}
                message={modalState.message}
                isAlert={modalState.isAlert}
            />
        </div >
    )
}
