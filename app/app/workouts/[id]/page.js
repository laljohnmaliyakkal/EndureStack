'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function WorkoutDetailsPage({ params }) {
    const { id } = use(params)
    const [editingLog, setEditingLog] = useState(null)
    const [editValues, setEditValues] = useState({ weight: '', reps: '' })
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    // Fetch session logic (unchanged)... should verify I don't break it. 
    // Wait, need to refresh the page/data after update/delete.
    // Let's refactor fetchSession out of useEffect or just trigger a re-fetch.

    const fetchSession = async () => {
        const { data, error } = await supabase
            .from('workout_sessions')
            .select('*, workout_logs(*)')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching session:', error)
            router.push('/app/workouts')
            return
        }

        if (data) setSession(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchSession()
    }, [id])

    const handleDelete = async (logId) => {
        if (!confirm('Are you sure you want to delete this set?')) return

        const { error } = await supabase
            .from('workout_logs')
            .delete()
            .eq('id', logId)

        if (error) {
            alert('Error deleting log')
            console.error(error)
        } else {
            fetchSession() // Refresh data
        }
    }

    const startEdit = (log) => {
        setEditingLog(log.id)
        setEditValues({ weight: log.weight, reps: log.reps })
    }

    const cancelEdit = () => {
        setEditingLog(null)
        setEditValues({ weight: '', reps: '' })
    }

    const saveEdit = async (logId) => {
        const { error } = await supabase
            .from('workout_logs')
            .update({
                weight: editValues.weight,
                reps: editValues.reps
            })
            .eq('id', logId)

        if (error) {
            alert('Error updating log')
            console.error(error)
        } else {
            setEditingLog(null)
            fetchSession() // Refresh data
        }
    }

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
                                        <th style={{ padding: '0.25rem 0.5rem', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.sort((a, b) => a.set_number - b.set_number).map(log => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '0.25rem 0.5rem' }}>{log.set_number}</td>

                                            {/* Weight Column */}
                                            <td style={{ padding: '0.25rem 0.5rem' }}>
                                                {editingLog === log.id ? (
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        style={{ width: '60px', padding: '0.25rem', marginBottom: 0 }}
                                                        value={editValues.weight}
                                                        onChange={(e) => setEditValues({ ...editValues, weight: e.target.value })}
                                                    />
                                                ) : (
                                                    log.weight
                                                )}
                                            </td>

                                            {/* Reps Column */}
                                            <td style={{ padding: '0.25rem 0.5rem' }}>
                                                {editingLog === log.id ? (
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        style={{ width: '60px', padding: '0.25rem', marginBottom: 0 }}
                                                        value={editValues.reps}
                                                        onChange={(e) => setEditValues({ ...editValues, reps: e.target.value })}
                                                    />
                                                ) : (
                                                    log.reps
                                                )}
                                            </td>

                                            {/* Actions Column */}
                                            <td style={{ padding: '0.25rem 0.5rem', textAlign: 'right' }}>
                                                {editingLog === log.id ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => saveEdit(log.id)} style={{ color: 'var(--success)', fontSize: '1.2rem' }}>✓</button>
                                                        <button onClick={cancelEdit} style={{ color: 'var(--secondary)', fontSize: '1.2rem' }}>✕</button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => startEdit(log)} style={{ color: 'var(--primary)' }} title="Edit">✎</button>
                                                        <button onClick={() => handleDelete(log.id)} style={{ color: 'var(--danger)' }} title="Delete">🗑</button>
                                                    </div>
                                                )}
                                            </td>
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
