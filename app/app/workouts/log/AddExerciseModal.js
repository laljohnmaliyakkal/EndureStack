'use client'

import { useState } from 'react'
import Modal from '../../../../components/Modal'

export default function AddExerciseModal({ isOpen, onClose, onAdd, preselectedMuscle }) {
    const [name, setName] = useState('')
    const [muscle, setMuscle] = useState(preselectedMuscle || '')

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!name || !muscle) return
        onAdd({ name, muscle_group: muscle })
        setName('')
    }

    // List of standard muscle groups to suggest, plus allow custom? 
    // Ideally this matches the Select in the parent, but for now unique text is fine or select.
    const commonMuscles = [
        'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body'
    ]

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
                        value={muscle}
                        onChange={e => setMuscle(e.target.value)}
                        required
                    >
                        <option value="">Select Target Muscle</option>
                        {commonMuscles.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
            </form>
        </Modal>
    )
}
