'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../components/AuthProvider'

export default function UserPlanPage() {
    const { user } = useAuth()
    const [activePlan, setActivePlan] = useState(null)
    const [availablePlans, setAvailablePlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandingDay, setExpandingDay] = useState(null)

    useEffect(() => {
        if (user) {
            fetchData()
        }
    }, [user])

    const fetchData = async () => {
        try {
            // 1. Check for active plan
            const { data: userPlan } = await supabase
                .from('user_plans')
                .select(`
                    id, 
                    start_date,
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
                .eq('user_id', user.id)
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
                setActivePlan(userPlan)
            } else {
                // 2. Fetch public plans if no active plan
                const { data: plans } = await supabase
                    .from('workout_plans')
                    .select('*')
                    .eq('is_public', true)
                    .order('name')

                setAvailablePlans(plans || [])
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectPlan = async (planId) => {
        if (!confirm('Are you sure you want to start this plan?')) return
        setLoading(true)
        try {
            const { error } = await supabase
                .from('user_plans')
                .insert({
                    user_id: user.id,
                    plan_id: planId,
                    is_active: true,
                    start_date: new Date().toISOString().split('T')[0]
                })

            if (error) throw error
            fetchData() // Refresh to show the new active plan
        } catch (error) {
            alert('Error starting plan: ' + error.message)
            setLoading(false)
        }
    }

    const handleLeavePlan = async () => {
        if (!confirm('Are you sure you want to stop the current plan?')) return
        setLoading(true)
        try {
            await supabase
                .from('user_plans')
                .update({ is_active: false })
                .eq('user_id', user.id)
                .eq('is_active', true)

            setActivePlan(null)
            fetchData()
        } catch (error) {
            alert('Error stopping plan: ' + error.message)
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
                    <button onClick={handleLeavePlan} style={{ color: 'var(--danger)', background: 'none', border: '1px solid var(--danger)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        Stop Plan
                    </button>
                </div>

                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{plan.name}</h2>
                    <p style={{ color: 'var(--secondary)' }}>{plan.description}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginTop: '0.5rem' }}>
                        Started on {new Date(activePlan.start_date).toLocaleDateString()}
                    </p>
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
                                        {/* Future integration: Link to start a workout session pre-filled with these items */}
                                        <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => alert('Start Workout feature coming soon!')}>
                                            Start Workout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
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
                        <button
                            className="btn"
                            style={{ width: '100%' }}
                            onClick={() => handleSelectPlan(plan.id)}
                        >
                            Start Plan
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
