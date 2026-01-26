'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import Modal from '../../../../components/Modal'

export default function AddExerciseModal({ isOpen, onClose, onAdd, preselectedMuscle }) {
    const [name, setName] = useState('')
    const [muscle, setMuscle] = useState(preselectedMuscle || '')
    const [existingMuscles, setExistingMuscles] = useState([])
    const [isCustomMuscle, setIsCustomMuscle] = useState(false)
    const [customMuscle, setCustomMuscle] = useState('')

    // Fetch existing muscle groups on mount
    useEffect(() => {
        if (isOpen) {
            const fetchMuscles = async () => {
                const { data } = await supabase
                    .from('workouts')
                    .select('muscle_group')
                    .not('muscle_group', 'is', null)

                if (data) {
                    const unique = [...new Set(data.map(i => i.muscle_group))].sort()
                    setExistingMuscles(unique)
                }
            }
            fetchMuscles()
        }
    }, [isOpen])

    const handleSubmit = (e) => {
        e.preventDefault()
        const finalMuscle = isCustomMuscle ? customMuscle : muscle
        if (!name || !finalMuscle) return
        onAdd({ name, muscle_group: finalMuscle })
        setName('')
        setMuscle('')
        setCustomMuscle('')
        setIsCustomMuscle(false)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Exercise"
            footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={onClose} className="btn" style={{ backgroundColor: 'var(--secondary)' }}>Cancel</button>
                    <button onClick={handleSubmit} className="btn">Save Exercise</button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Exercise Name</label>
                    <input
                        type="text"
                        className="input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Incline Bench Press"
                        autoFocus
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Muscle Group</label>
                    <select
                        className="input"
                        value={isCustomMuscle ? 'OTHER' : muscle}
                        onChange={e => {
                            if (e.target.value === 'OTHER') {
                                setIsCustomMuscle(true)
                                setMuscle('')
                            } else {
                                setIsCustomMuscle(false)
                                setMuscle(e.target.value)
                            }
                        }}
                        required
                    >
                        <option value="">Select Target Muscle</option>
                        {existingMuscles.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                        <option value="OTHER">+ Add New Muscle Group</option>
                    </select>

                    {isCustomMuscle && (
                        <input
                            type="text"
                            className="input"
                            value={customMuscle}
                            onChange={e => setCustomMuscle(e.target.value)}
                            placeholder="Enter new muscle group name"
                            style={{ marginTop: '0.5rem' }}
                            required
                        />
                    )}
                </div>
            </form>
        </Modal>
    )
}
