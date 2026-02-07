'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../components/AuthProvider'
import { useSearchParams, useRouter } from 'next/navigation'
import Modal from '../../../../components/Modal'
import AddExerciseModal from './AddExerciseModal'
import { getOverloadRecommendation } from '../../../../lib/progressiveOverload'

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
    const [recommendation, setRecommendation] = useState(null)
    const [showRecDetail, setShowRecDetail] = useState(false)

    const [reps, setReps] = useState(0)
    const [weight, setWeight] = useState(0)
    const [setNumber, setSetNumber] = useState(1)

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState({ type: null, id: null, name: null })

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

    // Add Exercise Logic
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)

    const handleAddExercise = async ({ name, muscle_group }) => {
        const { data, error } = await supabase
            .from('workouts')
            .insert([{ name, muscle_group }])
            .select()
            .single()

        if (error) {
            console.error('Error adding exercise:', error)
            alert('Error adding exercise: ' + error.message)
        } else {
            console.log('Exercise added:', data)
            // Update local state
            setAvailableWorkouts(prev => [...prev, data])

            // If the muscle group wasn't in our list (e.g. custom), add it
            if (!muscleGroups.includes(muscle_group)) {
                setMuscleGroups(prev => [...prev, muscle_group].sort())
            }

            // Auto select
            setSelectedMuscle(muscle_group)
            setSelectedExercise(name)
            setIsAddModalOpen(false)
        }
    }

    // Filter exercises based on muscle group
    const filteredExercises = useMemo(() => {
        if (!selectedMuscle) return []
        return availableWorkouts
            .filter(w => w.muscle_group === selectedMuscle)
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [selectedMuscle, availableWorkouts])

    // Fetch or Create Session
    useEffect(() => {
        if (!targetUserId) return
        // ... (existing getSession logic)
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

    // Auto-populate from previous session & Calculate Recommendation
    useEffect(() => {
        if (!selectedExercise || !user) return

        const fetchExerciseHistory = async () => {
            // Fetch history for Overload Analysis (last 12 sessions)
            const { data, error } = await supabase
                .from('workout_sessions')
                .select('session_date, workout_logs!inner(weight, reps, workout_name)')
                .eq('user_id', user.id)
                .eq('workout_logs.workout_name', selectedExercise)
                .lt('session_date', date) // strictly before current selected date
                .order('session_date', { ascending: false })
                .limit(12)

            if (data && data.length > 0) {
                // 1. Format history for analysis
                const history = data.map(session => ({
                    date: session.session_date,
                    sets: session.workout_logs
                }))

                // 2. Get Recommendation
                const config = {
                    minReps: 12,
                    maxReps: 15,
                    incrementKg: 2.5,
                    muscleGroup: selectedMuscle // Passed from state
                }

                // Dynamically import to avoid server/client issues if any, though standard import is fine here
                // We'll use the imported function
                const rec = getOverloadRecommendation(history, config)
                setRecommendation(rec)

                // 3. Auto-populate inputs from MOST RECENT session (history[0])
                const lastSessionLogs = history[0].sets
                const bestSet = lastSessionLogs.reduce((best, current) => {
                    if (!best) return current
                    if (current.weight > best.weight) return current
                    if (current.weight === best.weight && current.reps > best.reps) return current
                    return best
                }, null)

                if (bestSet) {
                    setWeight(bestSet.weight)
                    setReps(bestSet.reps)
                    return
                }
            } else {
                setRecommendation(null)
                setWeight(0)
                setReps(0)
            }
        }

        fetchExerciseHistory()
    }, [selectedExercise, user, date, selectedMuscle])

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

            // Check if exercise already has logs in this session
            // logs state is from the beginning of this render cycle, which is correct for this check
            const existingLogs = logs.filter(l => l.workout_name === selectedExercise)
            const isFirstTime = existingLogs.length === 0

            const setsToInsert = []

            // Only add 3 sets if it's the first time AND NOT Cardio
            if (isFirstTime && selectedMuscle !== 'Cardio') {
                // Add 3 sets
                for (let i = 1; i <= 3; i++) {
                    setsToInsert.push({
                        session_id: currentSessionId,
                        workout_name: selectedExercise,
                        set_number: i,
                        reps: parseInt(reps),
                        weight: parseFloat(weight),
                        updated_by: user.id
                    })
                }
            } else {
                // Add single next set
                const maxSet = existingLogs.reduce((max, log) => (log.set_number > max ? log.set_number : max), 0)
                setsToInsert.push({
                    session_id: currentSessionId,
                    workout_name: selectedExercise,
                    set_number: maxSet + 1,
                    reps: parseInt(reps),
                    weight: parseFloat(weight),
                    updated_by: user.id
                })
            }

            // Perform Insert
            const { error: logError } = await supabase
                .from('workout_logs')
                .insert(setsToInsert)

            if (logError) throw logError

            // Determine what the next set number would be for valid UI state
            const lastInsertedSet = setsToInsert[setsToInsert.length - 1].set_number
            setSetNumber(lastInsertedSet + 1)

            fetchLogs(currentSessionId)
        } catch (err) {
            alert('Error logging set: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const [editingLog, setEditingLog] = useState(null)
    const [editValues, setEditValues] = useState({ weight: '', reps: '' })

    const handleDeleteLog = (logId) => {
        setDeleteTarget({ type: 'single', id: logId })
        setIsDeleteModalOpen(true)
    }

    const handleDeleteExercise = (workoutName) => {
        setDeleteTarget({ type: 'exercise', name: workoutName })
        setIsDeleteModalOpen(true)
    }

    const confirmDelete = async () => {
        if (!deleteTarget.type) return

        let error = null

        if (deleteTarget.type === 'single') {
            const { error: singleError } = await supabase
                .from('workout_logs')
                .delete()
                .eq('id', deleteTarget.id)
            error = singleError
        } else if (deleteTarget.type === 'exercise') {
            const { error: groupError } = await supabase
                .from('workout_logs')
                .delete()
                .eq('session_id', sessionId)
                .eq('workout_name', deleteTarget.name)
            error = groupError
        }

        if (error) {
            alert('Error deleting: ' + error.message)
            console.error(error)
        } else {
            fetchLogs(sessionId)
        }
        setIsDeleteModalOpen(false)
        setDeleteTarget({ type: null, id: null, name: null })
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={{ display: 'block' }}>Exercise</label>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(true)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--primary)',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    + Add New
                                </button>
                            </div>
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

                    {/* Recommendation Badge & Popup */}
                    {recommendation && (
                        <div style={{ position: 'relative', marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--secondary)', marginLeft: '0.5rem' }}>
                                RECOMMENDATION
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowRecDetail(!showRecDetail)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: recommendation.type === 'weight' ? 'var(--primary)' :
                                        recommendation.type === 'reps' ? '#34c759' :
                                            recommendation.type === 'cardio' ? '#007AFF' :
                                                recommendation.type === 'deload' ? '#5856D6' :
                                                    'var(--secondary)',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                }}
                            >
                                <span>💡 {recommendation.type.toUpperCase()}</span>
                                {recommendation.target && (
                                    <span style={{ opacity: 0.9, fontWeight: 'normal', fontSize: '0.8rem' }}>
                                        • {recommendation.target.weight}kg x {recommendation.target.reps}
                                    </span>
                                )}
                                <span style={{ fontSize: '0.7rem' }}>{showRecDetail ? '▼' : '▶'}</span>
                            </button>

                            {/* Popup Detail */}
                            {showRecDetail && (
                                <div style={{
                                    position: 'absolute',
                                    top: '110%',
                                    left: 0,
                                    zIndex: 10,
                                    width: '280px',
                                    background: 'white',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                    border: '1px solid var(--border)',
                                    animation: 'fadeIn 0.2s ease'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--foreground)' }}>Analysis</span>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: '#f2f2f7',
                                            color: '#666'
                                        }}>
                                            {recommendation.confidence.toUpperCase()} CONFIDENCE
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--secondary)', lineHeight: 1.4, marginBottom: 0 }}>
                                        {recommendation.explanation}
                                    </p>
                                    <style jsx>{`
                                        @keyframes fadeIn {
                                            from { opacity: 0; transform: translateY(-5px); }
                                            to { opacity: 1; transform: translateY(0); }
                                        }
                                    `}</style>
                                </div>
                            )}
                        </div>
                    )}

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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <h3 style={{ color: 'var(--primary)', margin: 0 }}>
                                {name}
                            </h3>
                            <button
                                onClick={() => handleDeleteExercise(name)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--danger)',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    padding: '0.25rem'
                                }}
                                title="Delete entire exercise"
                            >
                                🗑
                            </button>
                        </div>

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

                                            <td style={{ padding: '0.25rem 0.5rem', textAlign: 'right' }}>
                                                {editingLog === log.id ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => saveEdit(log.id)} style={{ color: 'var(--success)', fontSize: '1.2rem' }}>✓</button>
                                                        <button onClick={cancelEdit} style={{ color: 'var(--secondary)', fontSize: '1.2rem' }}>✕</button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => startEdit(log)} style={{ color: 'var(--primary)' }} title="Edit">✎</button>
                                                        <button onClick={() => handleDeleteLog(log.id)} style={{ color: 'var(--danger)' }} title="Delete">🗑</button>
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

            <AddExerciseModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddExercise}
                preselectedMuscle={selectedMuscle}
            />

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Delete"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="btn"
                            style={{ background: 'var(--secondary)', color: 'white' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="btn"
                            style={{ background: 'var(--danger)', color: 'white' }}
                        >
                            Delete
                        </button>
                    </div>
                }
            >
                <p>
                    {deleteTarget.type === 'exercise'
                        ? `Are you sure you want to delete ALL sets for "${deleteTarget.name}"?`
                        : "Are you sure you want to delete this set?"}
                </p>
                <p style={{ fontSize: '0.9rem', color: 'var(--secondary)', marginTop: '0.5rem' }}>This action cannot be undone.</p>
            </Modal>
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
