'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/AuthProvider'
import { useRouter } from 'next/navigation'

export default function CompleteProfile() {
    const { user, refreshProfile } = useAuth()
    const router = useRouter()

    const [formData, setFormData] = useState({
        full_name: user?.user_metadata?.full_name || '',
        age: '',
        height_cm: '',
        weight_kg: '',
        role: 'user' // Default to user
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (!formData.full_name.trim()) throw new Error('Full Name is required')

            const updates = {
                user_id: user.id,
                ...formData,
                gym_id: null // Explicitly null for now
            }

            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert(updates)
                .select()
                .single()

            if (upsertError) throw upsertError

            await refreshProfile()
            router.push('/app/dashboard')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: '500px', margin: '2rem auto' }}>
            <div className="card">
                <h1 style={{ marginBottom: '1rem', textAlign: 'center' }}>Complete Your Profile</h1>
                <p style={{ marginBottom: '2rem', textAlign: 'center', color: 'var(--secondary)' }}>
                    Please provide your details to continue.
                </p>

                {error && <div style={{ color: 'var(--accent)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name *</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Age</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.age}
                                onChange={e => setFormData({ ...formData, age: e.target.value })}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Height (cm)</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.height_cm}
                                onChange={e => setFormData({ ...formData, height_cm: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Weight (kg)</label>
                        <input
                            type="number"
                            className="input"
                            value={formData.weight_kg}
                            onChange={e => setFormData({ ...formData, weight_kg: e.target.value })}
                        />
                    </div>

                    <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Saving...' : 'Save & Continue'}
                    </button>
                </form>
            </div>
        </div>
    )
}
