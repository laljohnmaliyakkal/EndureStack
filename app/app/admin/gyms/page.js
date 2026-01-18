'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../components/AuthProvider'

export default function GymsPage() {
    const { user } = useAuth()
    const [gyms, setGyms] = useState([])
    const [loading, setLoading] = useState(true)

    // Add Form State
    const [newGymName, setNewGymName] = useState('')
    const [newGymAddress, setNewGymAddress] = useState('')
    const [newGymPhone, setNewGymPhone] = useState('')

    // Edit State
    const [editingGym, setEditingGym] = useState(null)

    const fetchGyms = async () => {
        // RLS will ensure we only see our own gyms (after the SQL script is run)

        const { data: adminDetails, error: gymError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)

        if (gymError) {
            console.error('Error fetching gyms:', gymError)
            setLoading(false)
            return
        }

        const gymIds = adminDetails.map(g => g.gym_id)

        if (gymIds.length === 0) {
            setUsers([])
            setLoading(false)
            return
        }


        const { data, error } = await supabase
            .from('gyms')
            .select('*')
            .in('id', gymIds)
            .order('created_at', { ascending: false })

        if (data) setGyms(data)
        setLoading(false)
    }

    useEffect(() => {
        if (user) fetchGyms()
    }, [user])

    const handleAddGym = async (e) => {
        e.preventDefault()
        if (!newGymName.trim()) return

        const { error } = await supabase.from('gyms').insert([{
            name: newGymName,
            address: newGymAddress,
            phone: newGymPhone,
            admin_id: user.id
        }])

        if (!error) {
            setNewGymName('')
            setNewGymAddress('')
            setNewGymPhone('')
            fetchGyms()
        } else {
            alert('Error adding gym: ' + error.message)
        }
    }

    const handleUpdateGym = async (e) => {
        e.preventDefault()
        if (!editingGym) return

        const { error } = await supabase
            .from('gyms')
            .update({
                name: editingGym.name,
                address: editingGym.address,
                phone: editingGym.phone
            })
            .eq('id', editingGym.id)

        if (!error) {
            setEditingGym(null)
            fetchGyms()
        } else {
            alert('Error updating gym: ' + error.message)
        }
    }

    const handleDeleteGym = async (id) => {
        if (!confirm('Are you sure you want to delete this gym?')) return
        const { error } = await supabase.from('gyms').delete().eq('id', id)
        if (!error) fetchGyms()
    }

    return (
        <div>
            <h1 style={{ marginBottom: '1.5rem' }}>Manage My Gyms</h1>

            {/* Add Gym Form */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Add New Gym</h3>
                <form onSubmit={handleAddGym} style={{ display: 'grid', gap: '1rem' }}>
                    <input
                        type="text"
                        className="input"
                        placeholder="Gym Name *"
                        value={newGymName}
                        onChange={(e) => setNewGymName(e.target.value)}
                        required
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Address"
                            value={newGymAddress}
                            onChange={(e) => setNewGymAddress(e.target.value)}
                        />
                        <input
                            type="text"
                            className="input"
                            placeholder="Phone"
                            value={newGymPhone}
                            onChange={(e) => setNewGymPhone(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn">Add Gym</button>
                </form>
            </div>

            {/* List Gyms */}
            <div style={{ display: 'grid', gap: '1rem' }}>
                {gyms.map(gym => (
                    <div key={gym.id} className="card">
                        {editingGym?.id === gym.id ? (
                            // Edit Mode
                            <form onSubmit={handleUpdateGym} style={{ display: 'grid', gap: '1rem' }}>
                                <input
                                    type="text"
                                    className="input"
                                    value={editingGym.name}
                                    onChange={(e) => setEditingGym({ ...editingGym, name: e.target.value })}
                                    required
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <input
                                        type="text"
                                        className="input"
                                        value={editingGym.address || ''}
                                        onChange={(e) => setEditingGym({ ...editingGym, address: e.target.value })}
                                        placeholder="Address"
                                    />
                                    <input
                                        type="text"
                                        className="input"
                                        value={editingGym.phone || ''}
                                        onChange={(e) => setEditingGym({ ...editingGym, phone: e.target.value })}
                                        placeholder="Phone"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="submit" className="btn" style={{ background: 'var(--success)' }}>Save</button>
                                    <button type="button" className="btn" style={{ background: 'var(--secondary)' }} onClick={() => setEditingGym(null)}>Cancel</button>
                                </div>
                            </form>
                        ) : (
                            // View Mode
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ marginBottom: '0.5rem' }}>{gym.name}</h3>
                                    <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>
                                        {gym.address || 'No address'} • {gym.phone || 'No phone'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => setEditingGym(gym)} className="btn" style={{ padding: '0.5rem' }}>
                                        Edit
                                    </button>
                                    {/* 
                           Optional: Delete functionality 
                           <button onClick={() => handleDeleteGym(gym.id)} className="btn" style={{ backgroundColor: '#dc2626', padding: '0.5rem' }}>Delete</button>  
                        */}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {!loading && gyms.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--secondary)' }}>You don't have any gyms yet.</p>
                )}
            </div>
        </div>
    )
}
