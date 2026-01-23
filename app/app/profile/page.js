'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../components/AuthProvider'
import { supabase } from '../../../lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'

export default function Profile() {
    const { profile, user, refreshProfile } = useAuth()
    const searchParams = useSearchParams()
    const [formData, setFormData] = useState({
        full_name: '',
        age: '',
        height_cm: '',
        weight_kg: '',
        gym_id: null
    })

    // Gym Search State
    const [gyms, setGyms] = useState([])
    const [gymSearch, setGymSearch] = useState('')
    const [isGymDropdownOpen, setIsGymDropdownOpen] = useState(false)
    const [selectedGymName, setSelectedGymName] = useState('')
    const dropdownRef = useRef(null)

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const router = useRouter() // Import added implicitly if not present, wait I need to check imports.

    useEffect(() => {
        if (searchParams.get('first_time')) {
            setMessage('Welcome to EndureStack! Please complete your profile to get started.')
        }
    }, [searchParams])

    useEffect(() => {
        // Click outside handler
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsGymDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    // Fetch Profile & Gyms
    useEffect(() => {
        const initData = async () => {
            // Fetch Gyms
            const { data: gymsData } = await supabase.from('gyms').select('id, name, address')
            if (gymsData) setGyms(gymsData)

            // Set Profile Data
            if (profile) {
                setFormData({
                    full_name: profile.full_name || '',
                    age: profile.age || '',
                    height_cm: profile.height_cm || '',
                    weight_kg: profile.weight_kg || '',
                    gym_id: profile.gym_id || null,
                    certifications: profile.certifications || '',
                    experience: profile.experience || '',
                    achievements: profile.achievements || ''
                })

                // If user has a gym, find its name for display
                if (profile.gym_id && gymsData) {
                    const myGym = gymsData.find(g => g.id === profile.gym_id)
                    if (myGym) {
                        setSelectedGymName(myGym.name + ', ' + myGym.address)
                        setGymSearch(myGym.name + ', ' + myGym.address)
                    }
                }
            } else if (user) {
                // Fallback for new users (no profile yet)
                setFormData(prev => ({
                    ...prev,
                    full_name: user?.user_metadata?.full_name || prev.full_name
                }))
            }
        }
        initData()
    }, [profile, user])

    const handleUpdate = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        // Check if the user was incomplete before this update
        // We use this to decide if we should redirect to dashboard (onboarding flow)
        const wasIncomplete = !profile || !profile.age || searchParams.get('first_time');

        try {
            // Using upsert instead of update to handle both creation and editing
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    user_id: user.id,
                    ...formData
                })
                .select()
                .single()

            if (error) throw error

            await refreshProfile()

            // If this was an onboarding flow, redirect to dashboard
            if (wasIncomplete) {
                router.push('/app/dashboard')
            } else {
                setMessage('Profile updated successfully!')
            }
        } catch (err) {
            setMessage('Error updating profile: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const filteredGyms = gyms.filter(gym =>
        gym.name.toLowerCase().includes(gymSearch.toLowerCase())
    )

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem' }}>My Profile</h1>

            <div className="card">
                {message && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '0.375rem',
                        marginBottom: '1rem',
                        backgroundColor: message.includes('Error') ? '#7f1d1d' : '#14532d',
                        color: message.includes('Error') ? '#fca5a5' : '#86efac'
                    }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleUpdate}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        />
                    </div>

                    {/* Gym Selector */}
                    <div style={{ marginBottom: '1rem', position: 'relative' }} ref={dropdownRef}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Gym</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search for your gym..."
                                value={gymSearch}
                                onFocus={() => setIsGymDropdownOpen(true)}
                                onChange={e => {
                                    setGymSearch(e.target.value)
                                    setIsGymDropdownOpen(true)
                                    if (e.target.value === '') {
                                        setFormData({ ...formData, gym_id: null })
                                        setSelectedGymName('')
                                    }
                                }}
                                style={{ marginBottom: 0 }}
                            />
                            {selectedGymName && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, gym_id: null })
                                        setGymSearch('')
                                        setSelectedGymName('')
                                    }}
                                    style={{
                                        background: 'var(--danger)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        padding: '0 1rem'
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {isGymDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: 'var(--card-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '0.375rem',
                                marginTop: '0.25rem',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 10
                            }}>
                                {filteredGyms.length > 0 ? (
                                    filteredGyms.map(gym => (
                                        <div
                                            key={gym.id}
                                            onClick={() => {
                                                setFormData({ ...formData, gym_id: gym.id })
                                                setGymSearch(gym.name)
                                                setSelectedGymName(gym.name)
                                                setIsGymDropdownOpen(false)
                                            }}
                                            style={{
                                                padding: '0.75rem',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid var(--border)',
                                                color: 'var(--foreground)'
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--border)'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                        >
                                            {gym.name}
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '0.75rem', color: 'var(--secondary)' }}>No gyms found</div>
                                )}
                            </div>
                        )}
                        <p style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                            {formData.gym_id ? `` : 'No gym selected (Self-training)'}
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Age</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.age}
                                onChange={e => setFormData({ ...formData, age: e.target.value })}
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Height (cm)</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.height_cm}
                                onChange={e => setFormData({ ...formData, height_cm: e.target.value })}
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Weight (kg)</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.weight_kg}
                                onChange={e => setFormData({ ...formData, weight_kg: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Role</label>
                        <div className="input" style={{ opacity: 0.7 }}>{profile.role.toUpperCase()}</div>
                    </div>

                    {profile.role === 'trainer' && (
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Professional Details</h3>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Certifications</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    placeholder="e.g. ACE CPT, NASM, Crossfit L1"
                                    value={formData.certifications || ''}
                                    onChange={e => setFormData({ ...formData, certifications: e.target.value })}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Experience</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    placeholder="e.g. 5 years specializing in strength conditioning..."
                                    value={formData.experience || ''}
                                    onChange={e => setFormData({ ...formData, experience: e.target.value })}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Achievements</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    placeholder="e.g. Coached 50+ clients to transformation..."
                                    value={formData.achievements || ''}
                                    onChange={e => setFormData({ ...formData, achievements: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <button type="submit" className="btn" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    )
}
