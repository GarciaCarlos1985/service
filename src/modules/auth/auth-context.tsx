import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase } from '~/lib/supabase'
import { resetPassword, resendConfirmation, signIn, signUp } from './auth-requests'
import type { SignInInput, SignUpInput } from './schemas'

interface AuthContextValue {
  user: User | null
  session: Session | null
  isLoading: boolean
  signUp: (input: SignUpInput, captchaToken?: string) => Promise<{ requiresConfirmation: boolean }>
  signIn: (input: SignInInput, captchaToken?: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string, captchaToken?: string) => Promise<void>
  resendConfirmation: (email: string, captchaToken?: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const previousUser = useRef<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      const currentUser = currentSession?.user.id ?? null
      if (
        event === 'SIGNED_OUT' ||
        (previousUser.current && previousUser.current !== currentUser)
      ) {
        queryClient.removeQueries({
          predicate: (query) =>
            typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('guide-'),
        })
      }
      if (event === 'MFA_CHALLENGE_VERIFIED' || event === 'TOKEN_REFRESHED') {
        void queryClient.invalidateQueries({ queryKey: ['guide-assurance'] })
      }
      previousUser.current = currentUser
      setSession(currentSession)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])

  async function signOut() {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function updatePassword(password: string) {
    const supabase = getSupabase()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        isLoading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        resendConfirmation,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  }
  return context
}
