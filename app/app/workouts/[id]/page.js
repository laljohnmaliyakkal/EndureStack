'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function WorkoutDetailsPage({ params }) {
    const { id } = use(params)
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const fetchSession = async () => {
            const { data, error } = await supabase
                .from('workout_sessions')
                .select('*, workout_logs(*)')
                .eq('id', id)
                .single()

            if (error) {
                console.error('Error fetching session:', error)
                router.push('/app/workouts') // Redirect if not found or error
                return
            }

            if (data) setSession(data)
            setLoading(false)
        }

        fetchSession()
    }, [id])

    if (loading) return <div>Loading details...</div>
    if (!session) return <div>Workout not found</div>

    // Group logs by workout name
    const exercises = {}
    session.workout_logs?.forEach(log => {
        if (!exercises[log.workout_name]) {
            exercises[log.workout_name] = []
        }
        exercises[log.workout_name].push(log)
    })

    return (
        <div>
            <Link href="/app/workouts" className="btn" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)', display: 'inline-block', marginBottom: '1.5rem' }}>
                &larr; Back to Workouts
            </Link>

            <h1 style={{ marginBottom: '0.5rem' }}>Workout Details</h1>
            <p style={{ color: 'var(--secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>
                {new Date(session.session_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="workout-details-grid">
                {Object.entries(exercises).map(([name, logs]) => (
                    <div key={name} className="card">
                        <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            {name}
                        </h3>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--foreground)', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--secondary)' }}>
                                        <th style={{ padding: '0.25rem 0.5rem' }}>Set</th>
                                        <th style={{ padding: '0.25rem 0.5rem' }}>Weight (kg)</th>
                                        <th style={{ padding: '0.25rem 0.5rem' }}>Reps/Min</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.sort((a, b) => a.set_number - b.set_number).map(log => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '0.25rem 0.5rem' }}>{log.set_number}</td>
                                            <td style={{ padding: '0.25rem 0.5rem' }}>{log.weight}</td>
                                            <td style={{ padding: '0.25rem 0.5rem' }}>{log.reps}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}

                {Object.keys(exercises).length === 0 && (
                    <div className="card">
                        <p style={{ color: 'var(--secondary)' }}>No exercises logged for this session.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
