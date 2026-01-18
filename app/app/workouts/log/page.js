'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../components/AuthProvider'
import { useSearchParams, useRouter } from 'next/navigation'

function Logger() {
    const { user } = useAuth()
    const searchParams = useSearchParams()
    const router = useRouter()

    const targetUserId = searchParams.get('userId') || user?.id
    const urlDate = searchParams.get('date')
    const [date, setDate] = useState(urlDate || new Date().toISOString().split('T')[0])
    const [sessionId, setSessionId] = useState(null)
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(false)

    // Catalog Data
    const [availableWorkouts, setAvailableWorkouts] = useState([])
    const [muscleGroups, setMuscleGroups] = useState([])

    // Form Selection
    const [selectedMuscle, setSelectedMuscle] = useState('')
    const [selectedExercise, setSelectedExercise] = useState('')

    const [reps, setReps] = useState(0)
    const [weight, setWeight] = useState(0)
    const [setNumber, setSetNumber] = useState(1)

    // Fetch Workouts Catalog
    useEffect(() => {
        const fetchCatalog = async () => {
            const { data } = await supabase.from('workouts').select('*')
            if (data) {
                setAvailableWorkouts(data)
                const groups = [...new Set(data.map(w => w.muscle_group))].sort()
                setMuscleGroups(groups)
            }
        }
        fetchCatalog()
    }, [])

    // Filter exercises based on muscle group
    const filteredExercises = useMemo(() => {
        if (!selectedMuscle) return []
        return availableWorkouts.filter(w => w.muscle_group === selectedMuscle)
    }, [selectedMuscle, availableWorkouts])

    // Fetch or Create Session
    useEffect(() => {
        if (!targetUserId) return

        const getSession = async () => {
            const { data, error } = await supabase
                .from('workout_sessions')
                .select('id')
                .eq('user_id', targetUserId)
                .eq('session_date', date)
                .single()

            if (data) {
                setSessionId(data.id)
                fetchLogs(data.id)
            } else {
                setSessionId(null)
                setLogs([])
            }
        }
        getSession()
    }, [date, targetUserId])

    const fetchLogs = async (sId) => {
        const { data } = await supabase
            .from('workout_logs')
            .select('*')
            .eq('session_id', sId)
            .order('created_at', { ascending: true })
        if (data) {
            setLogs(data)
        }
    }

    const handleAddSet = async (e) => {
        e.preventDefault()
        if (!selectedExercise) return

        setLoading(true)

        try {
            let currentSessionId = sessionId

            // Create session if first log
            if (!currentSessionId) {
                const { data: newSession, error: sessionError } = await supabase
                    .from('workout_sessions')
                    .insert([{ user_id: targetUserId, session_date: date }])
                    .select()
                    .single()

                if (sessionError) throw sessionError
                currentSessionId = newSession.id
                setSessionId(currentSessionId)
            }

            // Add Log
            const { error: logError } = await supabase
                .from('workout_logs')
                .insert([{
                    session_id: currentSessionId,
                    workout_name: selectedExercise,
                    set_number: setNumber,
                    reps: parseInt(reps),
                    weight: parseFloat(weight),
                    updated_by: user.id
                }])

            if (logError) throw logError

            // Don't reset exercise so they can log next set easily
            setSetNumber(prev => prev + 1)
            fetchLogs(currentSessionId)
        } catch (err) {
            alert('Error logging set: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const [editingLog, setEditingLog] = useState(null)
    const [editValues, setEditValues] = useState({ weight: '', reps: '' })

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
            fetchLogs(sessionId)
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
            fetchLogs(sessionId)
        }
    }

    // Group logs by workout name
    const exercises = {}
    logs.forEach(log => {
        if (!exercises[log.workout_name]) {
            exercises[log.workout_name] = []
        }
        exercises[log.workout_name].push(log)
    })

    return (
        <div className="log-workout-container">
            <h1 style={{ marginBottom: '1.5rem' }}>Log Workout</h1>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Date</label>
                    <input
                        type="date"
                        className="input"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                    />
                </div>

                <form onSubmit={handleAddSet}>
                    <div className="log-form-grid">
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Muscle Group</label>
                            <select
                                className="input"
                                value={selectedMuscle}
                                onChange={e => {
                                    setSelectedMuscle(e.target.value)
                                    setSelectedExercise('') // Reset exercise when muscle changes
                                }}
                                required
                            >
                                <option value="">Select Muscle</option>
                                {muscleGroups.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Exercise</label>
                            <select
                                className="input"
                                value={selectedExercise}
                                onChange={e => setSelectedExercise(e.target.value)}
                                required
                                disabled={!selectedMuscle}
                            >
                                <option value="">Select Exercise</option>
                                {filteredExercises.map(ex => (
                                    <option key={ex.id} value={ex.name}>{ex.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="log-input-group">
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Reps/Min</label>
                            <input
                                type="number"
                                className="input"
                                value={reps}
                                onChange={e => setReps(e.target.value)}
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Weight (kg)</label>
                            <input
                                type="number"
                                className="input"
                                value={weight}
                                onChange={e => setWeight(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                        {loading ? 'Saving...' : 'Add Set'}
                    </button>
                </form>
            </div>

            <div className="workout-details-grid">
                {Object.entries(exercises).map(([name, logs]) => (
                    <div key={name} className="card">
                        <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            {name}
                        </h3>

                        <div className="log-table-wrapper">
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--foreground)', fontSize: '0.9rem', minWidth: '300px' }}>
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
            </div>
        </div>
    )
}

export default function LogPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Logger />
        </Suspense>
    )
}
