'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../../components/AuthProvider'
import { supabase } from '../../../../lib/supabase'
import Link from 'next/link'
import Modal from '../../../../components/Modal'
import ConfirmModal from '../../../../components/ConfirmModal'

export default function TrainerClientsPage() {
    const { user } = useAuth()
    const [clients, setClients] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [plans, setPlans] = useState([])
    const [assignModalOpen, setAssignModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [selectedPlan, setSelectedPlan] = useState('')
    const [currentActivePlan, setCurrentActivePlan] = useState(null)
    const [assignLoading, setAssignLoading] = useState(false)
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' })

    useEffect(() => {
        if (user) {
            const fetchClientsAndPlans = async () => {
                // 1. Get user IDs assigned to this trainer
                const { data: relations } = await supabase
                    .from('trainer_users')
                    .select('user_id')
                    .eq('trainer_id', user.id)

                if (relations && relations.length > 0) {
                    const userIds = relations.map(r => r.user_id)

                    // 2. Get profiles for these users
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('*')
                        .in('user_id', userIds)

                    setClients(profiles || [])
                } else {
                    setClients([])
                }

                // 3. Fetch Available Plans (Public or Created by this Trainer)
                const { data: plansData } = await supabase
                    .from('workout_plans')
                    .select('id, name, is_public')
                    .or(`is_public.eq.true,created_by.eq.${user.id}`)
                    .order('name')

                if (plansData) setPlans(plansData)
            }
            fetchClientsAndPlans()
        }
    }, [user])

    const openAssignModal = async (userId) => {
        console.log('Opening modal for user:', userId)
        setSelectedUser(userId)
        setSelectedPlan('')
        setCurrentActivePlan(null)
        setAssignModalOpen(true)

        try {
            console.log('Fetching active plan...')
            const { data, error } = await supabase
                .from('user_plans')
                .select('plan_id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .single() // This might error if 0 rows? .single() returns error on 0 rows in some supabase versions/settings (returns null data + error code PGRST116)

            if (error) {
                if (error.code !== 'PGRST116') { // Ignore "Row not found" error
                    console.error('Error fetching active plan query:', error)
                } else {
                    console.log('No active plan found (PGRST116)')
                }
                return
            }

            console.log('Active plan data:', data)

            if (data && data.plan_id) {
                // Try to find in loaded plans first
                const active = plans.find(p => p.id === data.plan_id)
                console.log('Found in local plans?', active)

                if (active) {
                    setCurrentActivePlan(active.name)
                } else {
                    // Fetch if not in list (e.g. from another trainer or inactive)
                    console.log('Fetching plan details from DB...')
                    const { data: planDetails, error: detailError } = await supabase
                        .from('workout_plans')
                        .select('name')
                        .eq('id', data.plan_id)
                        .single()

                    if (detailError) console.error('Error fetching plan details:', detailError)

                    if (planDetails) {
                        console.log('Fetched details:', planDetails)
                        setCurrentActivePlan(planDetails.name)
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching active plan:', error)
        }
    }

    const handleAssignPlan = async () => {
        if (!selectedPlan || !selectedUser) return
        setAssignLoading(true)

        try {
            // 1. Deactivate existing plans
            await supabase
                .from('user_plans')
                .update({ is_active: false })
                .eq('user_id', selectedUser)

            // 2. Assign new plan
            const { error } = await supabase
                .from('user_plans')
                .insert({
                    user_id: selectedUser,
                    plan_id: selectedPlan,
                    assigned_by: user.id,
                    is_active: true,
                    start_date: new Date().toISOString().split('T')[0]
                })

            if (error) throw error

            setAlertModal({
                isOpen: true,
                title: 'Success',
                message: 'Workout plan assigned successfully!',
                onClose: () => setAssignModalOpen(false)
            })
        } catch (error) {
            setAlertModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to assign plan: ' + error.message
            })
            setAssignLoading(false)
        }
    }

    const handleUnassignPlan = async () => {
        if (!selectedUser) return
        setAssignLoading(true)
        try {
            const { data, error } = await supabase
                .from('user_plans')
                .update({ is_active: false })
                .eq('user_id', selectedUser)
                .select()

            if (error) throw error

            if (!data || data.length === 0) {
                throw new Error('No active plan found to unassign, or you do not have permission to modify this data.')
            }

            setAlertModal({
                isOpen: true,
                title: 'Success',
                message: 'Workout plan unassigned successfully!',
                onClose: () => {
                    setAssignModalOpen(false)
                    setCurrentActivePlan(null)
                }
            })
        } catch (error) {
            setAlertModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to unassign plan: ' + error.message
            })
        } finally {
            setAssignLoading(false)
        }
    }

    return (
        <div>
            <h1 style={{ marginBottom: '1.5rem' }}>My Clients</h1>

            <input
                type="text"
                className="input"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ marginBottom: '1.5rem' }}
            />

            {clients.length === 0 ? (
                <p>No clients assigned yet.</p>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {clients.filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase())).map(client => (
                        <div key={client.user_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Top Row: Client Info */}
                            <Link href={`/app/trainer/users/${client.user_id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '50%',
                                    background: 'var(--primary-gradient)',
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold', fontSize: '1.2rem'
                                }}>
                                    {client.full_name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{client.full_name}</p>
                                    <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Age: {client.age || '-'} | Weight: {client.weight_kg || '-'}kg</p>
                                </div>
                            </Link>

                            {/* Bottom Row: Actions */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <Link href={`/app/workouts/log?userId=${client.user_id}`} className="btn" style={{ width: '100%', fontSize: '0.9rem', padding: '0.5rem', textAlign: 'center', background: 'var(--secondary-bg)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                                    Log Workout
                                </Link>
                                <button
                                    onClick={() => openAssignModal(client.user_id)}
                                    className="btn"
                                    style={{ width: '100%', fontSize: '0.9rem', padding: '0.5rem', textAlign: 'center', background: 'var(--secondary-bg)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                                >
                                    Assign Plan
                                </button>
                                <Link href={`/app/nutrition?userId=${client.user_id}`} className="btn" style={{ width: '100%', fontSize: '0.9rem', padding: '0.5rem', textAlign: 'center', background: 'var(--secondary-bg)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                                    View Diet
                                </Link>
                                <Link href={`/app/trainer/users/${client.user_id}/schedule`} className="btn" style={{ width: '100%', fontSize: '0.9rem', padding: '0.5rem', textAlign: 'center', background: 'var(--secondary-bg)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                                    Schedule
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}


            {/* Assign Plan Modal */}
            <Modal
                isOpen={assignModalOpen}
                onClose={() => setAssignModalOpen(false)}
                title="Assign Workout Plan"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <div>
                            {currentActivePlan && (
                                <button
                                    onClick={handleUnassignPlan}
                                    className="btn"
                                    style={{ backgroundColor: 'transparent', border: '1px solid var(--error)', color: 'var(--error)' }}
                                    disabled={assignLoading}
                                >
                                    Unassign Plan
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setAssignModalOpen(false)}
                                className="btn"
                                style={{ backgroundColor: 'var(--secondary)' }}
                                disabled={assignLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignPlan}
                                className="btn"
                                disabled={!selectedPlan || assignLoading}
                            >
                                {assignLoading ? 'Saving...' : (currentActivePlan ? 'Update Plan' : 'Assign Plan')}
                            </button>
                        </div>
                    </div>
                }
            >
                <div style={{ marginBottom: '1.5rem' }}>
                    {currentActivePlan && (
                        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '6px', border: '1px solid var(--primary)' }}>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>Currently Assigned:</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{currentActivePlan}</span>
                        </div>
                    )}
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>{currentActivePlan ? 'Update Workout Plan' : 'Select Workout Plan'}</label>
                    <select
                        className="input"
                        value={selectedPlan}
                        onChange={e => setSelectedPlan(e.target.value)}
                    >
                        <option value="">Select a plan...</option>
                        {plans.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} {p.is_public ? '(Public)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={alertModal.isOpen}
                onClose={() => {
                    setAlertModal({ ...alertModal, isOpen: false })
                    if (alertModal.onClose) alertModal.onClose()
                }}
                title={alertModal.title}
                message={alertModal.message}
                isAlert={true}
            />
        </div>
    )
}
