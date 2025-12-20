import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'
import { useBusinessStore } from './business'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)
  const businessStore = useBusinessStore()

  const isAuthenticated = computed(() => !!user.value)
  const isBusinessOwner = computed(() => !!user.value)

  async function init() {
    loading.value = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        user.value = session.user
        await businessStore.loadBusiness()
      }
    } catch (error) {
      console.error('Auth init error:', error)
    } finally {
      loading.value = false
    }
  }

  async function signUp(email, password, metadata = {}) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })
      if (error) {
        console.error('Sign up error:', error)
        // Améliorer le message d'erreur pour l'utilisateur
        const userFriendlyMessage = getSignUpErrorMessage(error)
        return { data: null, error: { ...error, message: userFriendlyMessage } }
      }
      
      // Si l'utilisateur est créé, mettre à jour le store
      if (data?.user) {
        user.value = data.user
        
        // Si une session est disponible (email confirmation désactivée), charger le business
        if (data.session) {
          await businessStore.loadBusiness()
        }
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('Sign up exception:', error)
      const userFriendlyMessage = getSignUpErrorMessage(error)
      return { data: null, error: { ...error, message: userFriendlyMessage } }
    } finally {
      loading.value = false
    }
  }

  async function signIn(email, password) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) {
        console.error('Sign in error:', error)
        // Améliorer le message d'erreur pour l'utilisateur
        const userFriendlyMessage = getErrorMessage(error)
        return { data: null, error: { ...error, message: userFriendlyMessage } }
      }
      if (data?.user) {
        user.value = data.user
        await businessStore.loadBusiness()
      }
      return { data, error: null }
    } catch (error) {
      console.error('Sign in exception:', error)
      const userFriendlyMessage = getErrorMessage(error)
      return { data: null, error: { ...error, message: userFriendlyMessage } }
    } finally {
      loading.value = false
    }
  }

  function getErrorMessage(error) {
    if (!error) return 'Une erreur inconnue s\'est produite'
    
    // Messages d'erreur Supabase courants pour la connexion
    const errorMessages = {
      'Invalid login credentials': 'Email ou mot de passe incorrect',
      'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter',
      'User not found': 'Aucun compte trouvé avec cet email',
      'Invalid email': 'Format d\'email invalide',
      'Password is too weak': 'Le mot de passe est trop faible'
    }
    
    // Vérifier si le message d'erreur correspond à un message connu
    for (const [key, value] of Object.entries(errorMessages)) {
      if (error.message && error.message.includes(key)) {
        return value
      }
    }
    
    // Retourner le message d'erreur original ou un message par défaut
    return error.message || 'Erreur de connexion. Vérifiez vos identifiants.'
  }

  function getSignUpErrorMessage(error) {
    if (!error) return 'Une erreur inconnue s\'est produite'
    
    // Messages d'erreur Supabase courants pour l'inscription
    const errorMessages = {
      'User already registered': 'Cet email est déjà utilisé',
      'Email already registered': 'Cet email est déjà utilisé',
      'Invalid email': 'Format d\'email invalide',
      'Password is too weak': 'Le mot de passe est trop faible. Utilisez au moins 6 caractères.',
      'Password should be at least': 'Le mot de passe doit contenir au moins',
      'Signup is disabled': 'Les inscriptions sont désactivées. Contactez l\'administrateur.',
      'Email rate limit exceeded': 'Trop de tentatives. Veuillez réessayer plus tard.',
      'For security purposes, you can only request this once every': 'Trop de tentatives. Veuillez réessayer plus tard.'
    }
    
    // Vérifier si le message d'erreur correspond à un message connu
    for (const [key, value] of Object.entries(errorMessages)) {
      if (error.message && error.message.includes(key)) {
        return value
      }
    }
    
    // Vérifier les codes d'erreur HTTP spécifiques
    if (error.status === 401) {
      return 'Erreur d\'authentification. Vérifiez votre configuration Supabase ou que les inscriptions sont autorisées.'
    }
    
    // Retourner le message d'erreur original ou un message par défaut
    return error.message || 'Erreur lors de la création du compte. Vérifiez vos informations.'
  }

  async function signOut() {
    loading.value = true
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      user.value = null
      businessStore.clearBusiness()
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    isAuthenticated,
    isBusinessOwner,
    init,
    signUp,
    signIn,
    signOut
  }
})

