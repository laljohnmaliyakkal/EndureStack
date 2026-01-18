'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [hasTrainer, setHasTrainer] = useState(false)
    const [loading, setLoading] = useState(true)
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

    useEffect(() => {
        const initializeAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                setUser(session.user)
                await fetchProfile(session.user.id)
            } else {
                setUser(null)
                setProfile(null)
                setHasTrainer(false)
            }
            setLoading(false)

            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (session?.user) {
                    setUser(session.user)
                    await fetchProfile(session.user.id)
                } else {
                    setUser(null)
                    setProfile(null)
                    setHasTrainer(false)
                }
                setLoading(false)
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
