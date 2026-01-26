'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '../../../../../lib/supabase'
import { useAuth } from '../../../../../components/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Modal from '../../../../../components/Modal'
import ConfirmModal from '../../../../../components/ConfirmModal'

export default function ClientProfilePage({ params }) {
    const { id } = use(params)
    const { user, profile } = useAuth()
    const router = useRouter()

    const [client, setClient] = useState(null)
    const [loading, setLoading] = useState(true)

    // Transfer State
    const [trainers, setTrainers] = useState([])
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
    const [selectedTrainer, setSelectedTrainer] = useState('')
    const [transferLoading, setTransferLoading] = useState(false)
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' })

    // Plan Assignment State
    const [plans, setPlans] = useState([])
    const [isAssignPlanModalOpen, setIsAssignPlanModalOpen] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState('')
    const [assignLoading, setAssignLoading] = useState(false)


    useEffect(() => {
        const fetchData = async () => {
            if (!user || !profile) return

            // 1. Fetch Client Profile
            const { data: clientData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', id)
                .single()

            if (error) {
                console.error('Error fetching client:', error)
            } else {
                setClient(clientData)
            }

            // 2. Fetch Other Trainers in same gym
            if (profile.gym_id) {
                const { data: trainersData } = await supabase
                    .from('profiles')
                    .select('user_id, full_name')
                    .eq('gym_id', profile.gym_id)
                    .eq('role', 'trainer')
                    .neq('user_id', user.id) // Exclude self

                if (trainersData) setTrainers(trainersData)
            }

            // 3. Fetch Available Plans (Public or Created by this Trainer)
            const { data: plansData } = await supabase
                .from('workout_plans')
                .select('id, name, is_public')
                .or(`is_public.eq.true,created_by.eq.${user.id}`)
                .order('name')

            if (plansData) setPlans(plansData)

            setLoading(false)
        }

        fetchData()
    }, [id, user, profile])

    const handleAssignPlan = async () => {
        if (!selectedPlan) return
        setAssignLoading(true)

        try {
            // 1. Deactivate existing plans
            await supabase
                .from('user_plans')
                .update({ is_active: false })
                .eq('user_id', id)

            // 2. Assign new plan
            const { error } = await supabase
                .from('user_plans')
                .insert({
                    user_id: id,
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
                onClose: () => setIsAssignPlanModalOpen(false)
            })
        } catch (error) {
            setAlertModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to assign plan: ' + error.message
            })
        } finally {
            setAssignLoading(false)
        }
    }

    const handleTransfer = async () => {
        if (!selectedTrainer) return
        // No redundant confirm() here; the modal action IS the confirmation.

        setTransferLoading(true)

        try {
            // Find the active assignment
            const { data: assignment } = await supabase
                .from('trainer_users')
                .select('id')
                .eq('user_id', id)
                .eq('trainer_id', user.id)
                .single()

            if (assignment) {
                const { error } = await supabase
                    .from('trainer_users')
                    .update({ trainer_id: selectedTrainer })
                    .eq('id', assignment.id)

                if (error) throw error

                setAlertModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Client transferred successfully!',
                    onClose: () => router.push('/app/trainer/users')
                })
            } else {
                setAlertModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Could not find active assignment to transfer.'
                })
            }
        } catch (error) {
            setAlertModal({
                isOpen: true,
                title: 'Error',
                message: 'Error transferring client: ' + error.message
            })
        } finally {
            setTransferLoading(false)
            setIsTransferModalOpen(false)
        }
    }

    const handleUnassign = async () => {
        setTransferLoading(true)

        try {
            // Find the active assignment
            const { data: assignment } = await supabase
                .from('trainer_users')
                .select('id')
                .eq('user_id', id)
                .eq('trainer_id', user.id)
                .single()

            if (assignment) {
                const { error } = await supabase
                    .from('trainer_users')
                    .delete()
                    .eq('id', assignment.id)

                if (error) throw error

                setAlertModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Client unassigned successfully!',
                    onClose: () => router.push('/app/trainer/users')
                })
            } else {
                // Already unassigned?
                router.push('/app/trainer/users')
            }
        } catch (error) {
            setAlertModal({
                isOpen: true,
                title: 'Error',
                message: 'Error unassigning client: ' + error.message
            })
        } finally {
            setTransferLoading(false)
            setIsTransferModalOpen(false)
        }
    }

    if (loading) return <div>Loading client profile...</div>
    if (!client) return <div>Client not found</div>

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Link href="/app/trainer/users" className="btn" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)', display: 'inline-block', marginBottom: '1.5rem' }}>
                &larr; Back to Clients
            </Link>

            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
                    <div style={{
                        width: '80px', height: '80px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', fontWeight: 'bold', color: 'white'
                    }}>
                        {client.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 style={{ marginBottom: '0.25rem' }}>{client.full_name}</h1>
                        <span style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#0f766e',
                            color: 'white',
                            borderRadius: '1rem',
                            fontSize: '0.875rem'
                        }}>
                            Client
                        </span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Age</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: '600' }}>{client.age || '-'}</p>
                    </div>
                    <div>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Height</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: '600' }}>{client.height_cm ? `${client.height_cm}cm` : '-'}</p>
                    </div>
                    <div>
                        <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Weight</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: '600' }}>{client.weight_kg ? `${client.weight_kg}kg` : '-'}</p>
                    </div>
                </div>

                <button
                    onClick={() => setIsAssignPlanModalOpen(true)}
                    className="btn"
                    style={{ backgroundColor: 'var(--primary)', flex: '1 1 auto', textAlign: 'center' }}
                >
                    Assign Plan
                </button>

                <Link href={`/app/nutrition?userId=${id}`} className="btn" style={{ backgroundColor: '#059669', textDecoration: 'none', textAlign: 'center' }}>
                    View Diet
                </Link>

                <button
                    onClick={() => setIsTransferModalOpen(true)}
                    className="btn"
                    style={{ backgroundColor: '#be123c' }} // Red for danger action
                >
                    Transfer Client
                </button>
            </div>


            {/* Assign Plan Modal */}
            <Modal
                isOpen={isAssignPlanModalOpen}
                onClose={() => setIsAssignPlanModalOpen(false)}
                title="Assign Workout Plan"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', width: '100%' }}>
                        <button
                            onClick={() => setIsAssignPlanModalOpen(false)}
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
                            {assignLoading ? 'Assigning...' : 'Assign Plan'}
                        </button>
                    </div>
                }
            >
                <p style={{ marginBottom: '1.5rem', color: 'var(--secondary)' }}>
                    Select a workout plan to assign to <strong>{client.full_name}</strong>. This will replace their currently active plan.
                </p>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Workout Plan</label>
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

            {/* Transfer Modal */}
            <Modal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                title="Transfer Client"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex' }}>
                            <button
                                onClick={handleUnassign}
                                className="btn"
                                style={{ backgroundColor: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', marginRight: 'auto' }}
                                disabled={transferLoading}
                            >
                                Unassign
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flex: 1, justifyContent: 'flex-end', minWidth: '200px' }}>
                            <button
                                onClick={() => setIsTransferModalOpen(false)}
                                className="btn"
                                style={{ backgroundColor: 'var(--secondary)', flex: 1 }}
                                disabled={transferLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTransfer}
                                className="btn"
                                style={{ backgroundColor: '#be123c', flex: 1 }}
                                disabled={!selectedTrainer || transferLoading}
                            >
                                {transferLoading ? 'Transferring...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                }
            >
                <p style={{ marginBottom: '1.5rem', color: 'var(--secondary)' }}>
                    Select a new trainer for <strong>{client.full_name}</strong>. You will lose access to this client after transfer.
                </p>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>New Trainer</label>
                    <select
                        className="input"
                        value={selectedTrainer}
                        onChange={e => setSelectedTrainer(e.target.value)}
                    >
                        <option value="">Select a trainer...</option>
                        {trainers.length > 0 ? (
                            trainers.map(t => (
                                <option key={t.user_id} value={t.user_id}>{t.full_name}</option>
                            ))
                        ) : (
                            <option disabled>No other trainers available</option>
                        )}
                    </select>
                </div>
            </Modal>

            {/* Alert Modal */}
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
        </div >
    )
}
