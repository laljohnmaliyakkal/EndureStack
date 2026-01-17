'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../components/AuthProvider'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function UsersPage() {
    const { user } = useAuth()
    const searchParams = useSearchParams()

    // Initialize viewMode from URL or default to 'user'
    const roleParam = searchParams.get('role')
    const initialMode = (roleParam === 'trainer' || roleParam === 'user') ? roleParam : 'user'

    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState(initialMode)

    // Assignment State
    const [trainers, setTrainers] = useState([])
    const [assignments, setAssignments] = useState({})

    // Assign Modal State
    const [assigningUser, setAssigningUser] = useState(null)
    const [selectedTrainer, setSelectedTrainer] = useState('')
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [isTransfer, setIsTransfer] = useState(false)

    const fetchUsers = async () => {
        if (!user) return

        // 1. Get Gym ID
        const { data: adminDetails } = await supabase
            .from('profiles')
            .select('gym_id')
            .eq('user_id', user.id)
            .single()

        if (!adminDetails?.gym_id) {
            setUsers([])
            setLoading(false)
            return
        }

        const gymId = adminDetails.gym_id

        // 2. Get Users + Trainers
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('gym_id', gymId)
            .neq('role', 'admin') // Exclude admins
            .order('created_at', { ascending: false })

        if (data) {
            setUsers(data)
            setTrainers(data.filter(u => u.role === 'trainer'))

            // 3. Fetch Assignments for these users
            const userIds = data.map(u => u.user_id)
            const { data: assignmentData } = await supabase
                .from('trainer_users')
                .select('*')
                .in('user_id', userIds)

            if (assignmentData) {
                const map = {}
                assignmentData.forEach(a => {
                    map[a.user_id] = a.trainer_id
                })
                setAssignments(map)
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchUsers()
    }, [user])

    const handlePromote = async (userId, newRole) => {
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('user_id', userId)
        if (!error) fetchUsers()
    }

    const openAssignModal = (user, currentTrainerId) => {
        setAssigningUser(user)
        setSelectedTrainer(currentTrainerId || '')
        setIsTransfer(!!currentTrainerId)
        setIsAssignModalOpen(true)
    }

    const handleAssignTrainer = async () => {
        if (!assigningUser || !selectedTrainer) return

        let error

        // Check if assignment exists (we can trust our local state for UI, but verify for DB op)
        // Or simpler: fetch existing by user_id
        const { data: existing } = await supabase
            .from('trainer_users')
            .select('*')
            .eq('user_id', assigningUser.user_id)
            .single()

        if (existing) {
            // Update (Transfer)
            const { error: updateError } = await supabase
                .from('trainer_users')
                .update({ trainer_id: selectedTrainer })
                .eq('id', existing.id)
            error = updateError
        } else {
            // Insert
            const { error: insertError } = await supabase.from('trainer_users').insert([{
                user_id: assigningUser.user_id,
                trainer_id: selectedTrainer,
                gym_id: assigningUser.gym_id
            }])
            error = insertError
        }

        if (!error) {
            setIsAssignModalOpen(false)
            alert(isTransfer ? 'Trainer transferred!' : 'Trainer assigned!')
            fetchUsers() // Refresh to update assignments map
        } else {
            alert('Error assigning trainer: ' + error.message)
        }
    }

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRole = u.role === viewMode
        return matchesSearch && matchesRole
    })

    // Helper to get trainer name
    const getTrainerName = (trainerId) => {
        const t = trainers.find(tr => tr.user_id === trainerId)
        return t ? t.full_name : 'Unknown'
    }

    // Helper to get client count for a trainer
    const getClientCount = (trainerId) => {
        return Object.values(assignments).filter(tid => tid === trainerId).length
    }

    return (
        <div>
            <h1 style={{ marginBottom: '1.5rem' }}>Manage Users</h1>

            {/* Controls */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    className="input"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ maxWidth: '300px', marginBottom: 0 }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setViewMode('user')}
                        className="btn"
                        style={{
                            backgroundColor: viewMode === 'user' ? 'var(--primary)' : 'var(--card-bg)',
                            color: viewMode === 'user' ? 'white' : 'var(--foreground)',
                            border: '1px solid var(--border)'
                        }}
                    >
                        Clients
                    </button>
                    <button
                        onClick={() => setViewMode('trainer')}
                        className="btn"
                        style={{
                            backgroundColor: viewMode === 'trainer' ? 'var(--primary)' : 'var(--card-bg)',
                            color: viewMode === 'trainer' ? 'white' : 'var(--foreground)',
                            border: '1px solid var(--border)'
                        }}
                    >
                        Trainers
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--foreground)' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem' }}>Name</th>
                            {viewMode === 'user' && <th style={{ padding: '0.75rem' }}>Assigned To</th>}
                            {viewMode === 'trainer' && <th style={{ padding: '0.75rem' }}>Clients</th>}
                            <th style={{ padding: '0.75rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(u => {
                            const assignedTrainerId = assignments[u.user_id]
                            const assignedTrainerName = assignedTrainerId ? getTrainerName(assignedTrainerId) : null
                            const clientCount = u.role === 'trainer' ? getClientCount(u.user_id) : 0

                            return (
                                <tr key={u.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.75rem' }}>
                                        <Link href={`/app/admin/users/${u.user_id}`} style={{ fontWeight: '500', textDecoration: 'underline' }}>
                                            {u.full_name}
                                        </Link>
                                    </td>
                                    {viewMode === 'user' && (
                                        <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                                            {assignedTrainerName ? (
                                                <span style={{ color: 'var(--primary)', fontWeight: '500' }}>
                                                    {assignedTrainerName}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--secondary)', fontStyle: 'italic' }}>Unassigned</span>
                                            )}
                                        </td>
                                    )}
                                    {viewMode === 'trainer' && (
                                        <td style={{ padding: '0.75rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                            {clientCount}
                                        </td>
                                    )}
                                    <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                                        {/* Role Management */}
                                        {u.role === 'user' && (
                                            <>
                                                <button onClick={() => handlePromote(u.user_id, 'trainer')} className="btn" style={{ fontSize: '0.8rem', background: 'var(--success)', padding: '0.3rem 0.6rem' }}>
                                                    Promote
                                                </button>

                                                {assignedTrainerId ? (
                                                    <button
                                                        onClick={() => openAssignModal(u, assignedTrainerId)}
                                                        className="btn"
                                                        style={{ fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--foreground)', padding: '0.3rem 0.6rem' }}
                                                    >
                                                        Transfer
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => openAssignModal(u, null)}
                                                        className="btn"
                                                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                                                    >
                                                        Assign Trainer
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {u.role === 'trainer' && (
                                            <button onClick={() => handlePromote(u.user_id, 'user')} className="btn" style={{ fontSize: '0.8rem', background: 'var(--danger)', padding: '0.3rem 0.6rem' }}>
                                                Demote
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        {!loading && filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={viewMode === 'user' ? 4 : 3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--secondary)' }}>
                                    No users found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Assign/Transfer Modal */}
            {isAssignModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 100
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '400px' }}>
                        <h3 style={{ marginBottom: '1rem' }}>{isTransfer ? 'Transfer Client' : 'Assign Trainer'}</h3>
                        <p style={{ marginBottom: '1.5rem' }}>
                            {isTransfer
                                ? `Select a new trainer for ${assigningUser?.full_name}.`
                                : `Assign a trainer to ${assigningUser?.full_name}.`
                            }
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Select Trainer</label>
                            <select
                                className="input"
                                value={selectedTrainer}
                                onChange={e => setSelectedTrainer(e.target.value)}
                            >
                                <option value="">Select a trainer...</option>
                                {trainers.map(t => (
                                    <option key={t.user_id} value={t.user_id}>{t.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsAssignModalOpen(false)} className="btn" style={{ backgroundColor: 'var(--secondary)' }}>Cancel</button>
                            <button onClick={handleAssignTrainer} className="btn" disabled={!selectedTrainer}>
                                {isTransfer ? 'Transfer' : 'Assign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
