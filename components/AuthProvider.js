'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [hasTrainer, setHasTrainer] = useState(false)
    const [loading, setLoading] = useState(true)
    const lastUserId = useRef(null) // Track the last processed user ID to prevent redundant updates
    const router = useRouter()

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .single()

            if (error) {
                console.error('Error fetching profile:', error)
            } else {
                setProfile(data)

                // Check if user has a trainer
                if (data.role === 'user') {
                    const { count, error: trainerError } = await supabase
                        .from('trainer_users')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', userId)

                    if (!trainerError) {
                        setHasTrainer(count > 0)
                    }
                } else {
                    setHasTrainer(false)
                }
            }
        } catch (err) {
            console.error('Profile fetch error:', err)
        }
    }

    // Helper to handle user updates and prevent redundant fetches
    const handleUserUpdate = async (session) => {
        const currentUserId = session?.user?.id || null

        // If the User ID hasn't changed, strictly do nothing.
        // This blocks redundant token refreshes from resetting state.
        if (currentUserId === lastUserId.current) {
            setLoading(false)
            return
        }

        // Update the ref to the new ID
        lastUserId.current = currentUserId

        if (currentUserId) {
            setUser(session.user)
            // Only fetch profile if we have a real user
            await fetchProfile(currentUserId)
        } else {
            setUser(null)
            setProfile(null)
            setHasTrainer(false)
        }
        setLoading(false)
    }

    useEffect(() => {
        const initializeAuth = async () => {
            // Initial Check
            const { data: { session } } = await supabase.auth.getSession()
            await handleUserUpdate(session)

            // Listener
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                await handleUserUpdate(session)
            })

            return () => subscription.unsubscribe()
        }

        initializeAuth()
    }, [])

    const value = {
        user,
        profile,
        hasTrainer,
        loading,
        refreshProfile: () => fetchProfile(user?.id),
        signOut: async () => {
            lastUserId.current = null // Reset the ref so next login works
            await supabase.auth.signOut()
            router.push('/auth/login')
        }
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
