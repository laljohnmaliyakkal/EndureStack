'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../components/AuthProvider'
import { supabase } from '../../../lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import Avatar from '../../../components/Avatar'

export default function Profile() {
    const { profile, user, refreshProfile } = useAuth()
    const searchParams = useSearchParams()
    const [formData, setFormData] = useState({
        full_name: '',
        age: '',
        height_cm: '',
        weight_kg: '',
        weight_kg: '',
        gym_id: null,
        gender: '',
        activity_level: ''
    })

    // Gym Search State
    const [gyms, setGyms] = useState([])
    const [gymSearch, setGymSearch] = useState('')
    const [isGymDropdownOpen, setIsGymDropdownOpen] = useState(false)
    const [selectedGymName, setSelectedGymName] = useState('')
    const dropdownRef = useRef(null)

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
    const router = useRouter()

    // Generate avatar list
    const avatars = Array.from({ length: 17 }, (_, i) => `/avatars/avatar_${i + 1}.png`)

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
                    achievements: profile.achievements || '',
                    avatar_url: profile.avatar_url || null,
                    gender: profile.gender || '',
                    activity_level: profile.activity_level || ''
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
                    full_name: user?.user_metadata?.full_name || prev.full_name,
                    avatar_url: null
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

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                    <div
                        style={{
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '4px solid var(--primary)',
                            marginBottom: '1rem',
                            cursor: 'pointer',
                            position: 'relative',
                            width: '120px',
                            height: '120px'
                        }}
                        onClick={() => setIsAvatarModalOpen(!isAvatarModalOpen)}
                    >
                        <Avatar
                            url={formData.avatar_url}
                            userId={user?.id}
                            name={formData.full_name || 'User'}
                            size={112}
                            className="profile-avatar"
                        />
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '100%',
                            display: 'flex',
                            alignItems: 'end',
                            justifyContent: 'center',
                            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 40%)',
                        }}>
                            <span style={{
                                color: 'white',
                                fontSize: '0.7rem',
                                marginBottom: '0.5rem'
                            }}>Change</span>
                        </div>
                    </div>

                    {isAvatarModalOpen && (
                        <div style={{
                            marginBottom: '1.5rem',
                            background: 'var(--bg)',
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            width: '100%'
                        }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Choose an Avatar</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                                gap: '0.5rem'
                            }}>
                                {avatars.map((avatar) => (
                                    <div
                                        key={avatar}
                                        onClick={() => {
                                            setFormData({ ...formData, avatar_url: avatar })
                                            setIsAvatarModalOpen(false)
                                        }}
                                        style={{
                                            aspectRatio: '1/1',
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            border: formData.avatar_url === avatar ? '3px solid var(--primary)' : '2px solid transparent',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <img
                                            src={avatar}
                                            alt="Avatar Option"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

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
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Gender</label>
                            <select
                                className="input"
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Activity Level</label>
                            <select
                                className="input"
                                value={formData.activity_level}
                                onChange={e => setFormData({ ...formData, activity_level: e.target.value })}
                            >
                                <option value="">Select Activity Level</option>
                                <option value="sedentary">Sedentary</option>
                                <option value="light">Light</option>
                                <option value="moderate">Moderate</option>
                                <option value="active">Active</option>
                                <option value="very_active">Very Active</option>
                            </select>
                        </div>
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
