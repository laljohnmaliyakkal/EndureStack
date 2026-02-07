'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabase'
import { useAuth } from '../../../../../components/AuthProvider'
import ConfirmModal from '../../../../../components/ConfirmModal'

const DAYS = [
    { number: 1, name: 'Day 1' },
    { number: 2, name: 'Day 2' },
    { number: 3, name: 'Day 3' },
    { number: 4, name: 'Day 4' },
    { number: 5, name: 'Day 5' },
    { number: 6, name: 'Day 6' },
]

export default function CreatePlanPage() {
    const { user, profile } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [planData, setPlanData] = useState({
        name: '',
        description: '',
        is_public: false
    })
    const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '' })

    // Existing workouts catalog
    const [catalog, setCatalog] = useState([])
    const [muscleGroups, setMuscleGroups] = useState([])

    useEffect(() => {
        const fetchCatalog = async () => {
            const { data } = await supabase.from('workouts').select('name, muscle_group').order('name')
            if (data) {
                setCatalog(data)
                const groups = [...new Set(data.filter(w => w.muscle_group).map(w => w.muscle_group))].sort()
                setMuscleGroups(groups)
            }
        }
        fetchCatalog()
    }, [])

    // Structure: { [dayNumber]: [{ workout_name, sets, reps, muscle_group }] }
    const [dayExercises, setDayExercises] = useState({
        1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    })

    const handleAddExercise = (dayNumber) => {
        setDayExercises(prev => ({
            ...prev,
            [dayNumber]: [...prev[dayNumber], { workout_name: '', sets: 3, reps: 10, muscle_group: '' }]
        }))
    }

    const handleExerciseChange = (dayNumber, index, field, value) => {
        const newExercises = [...dayExercises[dayNumber]]
        newExercises[index] = { ...newExercises[index], [field]: value }

        // If changing muscle group, clear exercise name if it doesn't match new group? 
        // Or keep it? Let's keep it but it might be invalid. 
        // Actually, better to reset name if muscle group changes to force re-select? 
        // Maybe user wants to keep it. Let's not clear for now, just filter suggestions.

        setDayExercises(prev => ({
            ...prev,
            [dayNumber]: newExercises
        }))
    }

    const getFilteredCatalog = (muscleGroup) => {
        if (!muscleGroup) return catalog
        return catalog.filter(w => w.muscle_group === muscleGroup)
    }

    const handleRemoveExercise = (dayNumber, index) => {
        const newExercises = dayExercises[dayNumber].filter((_, i) => i !== index)
        setDayExercises(prev => ({
            ...prev,
            [dayNumber]: newExercises
        }))
    }

    // ... handleSubmit remains mostly the same, muscle_group is strictly UI state here

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!user) return
        setLoading(true)

        try {
            // 1. Create Plan
            const { data: plan, error: planError } = await supabase
                .from('workout_plans')
                .insert({
                    name: planData.name,
                    description: planData.description,
                    created_by: user.id,
                    is_public: planData.is_public,
                    gym_id: profile?.gym_id
                })
                .select()
                .single()

            if (planError) throw planError

            // 2. Create Days and Items using Promise.all for parallelism
            const dayPromises = DAYS.map(async (day) => {
                const exercises = dayExercises[day.number]
                if (exercises.length === 0) return

                // Create Day
                const { data: dayData, error: dayError } = await supabase
                    .from('workout_plan_days')
                    .insert({
                        plan_id: plan.id,
                        day_number: day.number,
                        day_name: day.name
                    })
                    .select()
                    .single()

                if (dayError) throw dayError

                // Create Items
                const itemsToInsert = exercises.map((ex, idx) => ({
                    plan_day_id: dayData.id,
                    workout_name: ex.workout_name,
                    muscle_group: ex.muscle_group,
                    sets: parseInt(ex.sets),
                    reps: parseInt(ex.reps),
                    order_index: idx
                }))

                if (itemsToInsert.length > 0) {
                    const { error: itemsError } = await supabase
                        .from('workout_plan_items')
                        .insert(itemsToInsert)

                    if (itemsError) throw itemsError
                }
            })

            await Promise.all(dayPromises)

            router.push('/app/trainer/plans')
            router.refresh()
        } catch (error) {
            console.error('Error creating plan:', error)
            setAlertState({
                isOpen: true,
                title: 'Error',
                message: 'Failed to create plan: ' + error.message
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>Create New Plan</h1>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Plan Name</label>
                        <input
                            type="text"
                            className="input"
                            value={planData.name}
                            onChange={(e) => setPlanData({ ...planData, name: e.target.value })}
                            required
                            placeholder="e.g., Summer Shred 2026"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
                        <textarea
                            className="input"
                            value={planData.description}
                            onChange={(e) => setPlanData({ ...planData, description: e.target.value })}
                            rows={3}
                            placeholder="Brief description of the plan..."
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="checkbox"
                        id="is_public"
                        checked={planData.is_public}
                        onChange={(e) => setPlanData({ ...planData, is_public: e.target.checked })}
                        style={{ width: '1.2rem', height: '1.2rem' }}
                    />
                    <label htmlFor="is_public" style={{ cursor: 'pointer' }}>
                        Make Public (Visible to Gym Members)
                    </label>
                </div>

                {DAYS.map(day => (
                    <div key={day.number} className="card" style={{ padding: '1rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            {day.name}
                        </h3>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {dayExercises[day.number].map((exercise, idx) => (
                                <div key={idx} className="exercise-row">
                                    <div style={{ flex: 1, minWidth: '150px' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Muscle Group</label>
                                        <select
                                            className="input"
                                            value={exercise.muscle_group}
                                            onChange={(e) => handleExerciseChange(day.number, idx, 'muscle_group', e.target.value)}
                                            style={{ marginBottom: 0 }}
                                        >
                                            <option value="">All Muscles</option>
                                            {muscleGroups.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ flex: 2, minWidth: '200px' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Exercise</label>
                                        <select
                                            className="input"
                                            value={exercise.workout_name}
                                            onChange={(e) => handleExerciseChange(day.number, idx, 'workout_name', e.target.value)}
                                            required
                                            style={{ marginBottom: 0 }}
                                        >
                                            <option value="">Select Exercise</option>
                                            {getFilteredCatalog(exercise.muscle_group).map((w, i) => (
                                                <option key={i} value={w.name}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Sets</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={exercise.sets}
                                                onChange={(e) => handleExerciseChange(day.number, idx, 'sets', e.target.value)}
                                                min="1"
                                                required
                                                style={{ marginBottom: 0 }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>Reps</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={exercise.reps}
                                                onChange={(e) => handleExerciseChange(day.number, idx, 'reps', e.target.value)}
                                                min="1"
                                                required
                                                style={{ marginBottom: 0 }}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveExercise(day.number, idx)}
                                        style={{
                                            color: 'var(--error)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0.5rem',
                                            alignSelf: 'center'
                                        }}
                                        title="Remove Exercise"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => handleAddExercise(day.number)}
                            style={{
                                marginTop: '1rem',
                                background: 'transparent',
                                border: '1px dashed var(--primary)',
                                color: 'var(--primary)',
                                padding: '0.5rem',
                                width: '100%',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            + Add Exercise
                        </button>
                    </div>
                ))}

                <div style={{ position: 'sticky', bottom: '1rem', zIndex: 10 }}>
                    <button
                        type="submit"
                        className="btn"
                        disabled={loading}
                        style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                    >
                        {loading ? 'Creating Plan...' : 'Save Workout Plan'}
                    </button>
                </div>
            </form>
            <style jsx>{`
                .exercise-row {
                    display: flex;
                    gap: 0.5rem;
                    align-items: flex-end;
                    flex-wrap: wrap;
                    background: rgba(var(--background-rgb), 0.5);
                    padding: 0.5rem;
                    border-radius: 8px;
                }
                @media (max-width: 600px) {
                    .exercise-row {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1rem;
                    }
                    .exercise-row > div {
                        width: 100%;
                    }
                }
            `}</style>
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
