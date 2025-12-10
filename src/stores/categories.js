import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'
import db from '../services/db'
import { useBusinessStore } from './business'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref([])
  const loading = ref(false)
  const businessStore = useBusinessStore()

  async function loadCategories() {
    loading.value = true
    try {
      if (!businessStore.business) return

      // Try Supabase first
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('business_id', businessStore.business.id)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (data) {
        categories.value = data
        await db.service_categories.bulkPut(data)
      } else {
        // Try local DB
        const local = await db.service_categories
          .where('business_id')
          .equals(businessStore.business.id)
          .sortBy('display_order')
        categories.value = local
      }
    } catch (error) {
      console.error('Load categories error:', error)
    } finally {
      loading.value = false
    }
  }

  async function createCategory(categoryData) {
    loading.value = true
    try {
      if (!businessStore.business) throw new Error('No business loaded')

      // Get max display_order
      const maxOrder = categories.value.length > 0
        ? Math.max(...categories.value.map(c => c.display_order || 0))
        : -1

      const newCategory = {
        ...categoryData,
        business_id: businessStore.business.id,
        id: crypto.randomUUID(),
        display_order: categoryData.display_order ?? maxOrder + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Store locally first
      await db.service_categories.add(newCategory)
      categories.value.push(newCategory)
      categories.value.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

      // Sync to Supabase
      try {
        const { data, error } = await supabase
          .from('service_categories')
          .insert(newCategory)
          .select()
          .single()

        if (data) {
          const index = categories.value.findIndex(c => c.id === newCategory.id)
          if (index !== -1) {
            categories.value[index] = data
            await db.service_categories.update(newCategory.id, data)
          }
        }
        if (error) throw error
      } catch (error) {
        console.error('Sync error:', error)
      }

      return { data: newCategory, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  async function updateCategory(categoryId, updates) {
    loading.value = true
    try {
      const index = categories.value.findIndex(c => c.id === categoryId)
      if (index === -1) throw new Error('Category not found')

      const updated = {
        ...categories.value[index],
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Update locally
      await db.service_categories.update(categoryId, updated)
      categories.value[index] = updated
      categories.value.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

      // Sync to Supabase
      try {
        const { data, error } = await supabase
          .from('service_categories')
          .update(updates)
          .eq('id', categoryId)
          .select()
          .single()

        if (data) {
          categories.value[index] = data
          await db.service_categories.update(categoryId, data)
        }
        if (error) throw error
      } catch (error) {
        console.error('Sync error:', error)
      }

      return { data: updated, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  async function deleteCategory(categoryId) {
    loading.value = true
    try {
      // Check if category is used by any services
      const { useServicesStore } = await import('./services')
      const servicesStore = useServicesStore()
      const servicesUsingCategory = servicesStore.services.filter(
        s => s.category_id === categoryId
      )

      if (servicesUsingCategory.length > 0) {
        return {
          error: {
            message: `Cette catégorie est utilisée par ${servicesUsingCategory.length} service(s). Veuillez d'abord réassigner ou supprimer ces services.`
          }
        }
      }

      // Remove locally
      await db.service_categories.delete(categoryId)
      categories.value = categories.value.filter(c => c.id !== categoryId)

      // Sync to Supabase
      try {
        await supabase
          .from('service_categories')
          .delete()
          .eq('id', categoryId)
      } catch (error) {
        console.error('Sync error:', error)
      }

      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      loading.value = false
    }
  }

  function getCategoryById(categoryId) {
    return categories.value.find(c => c.id === categoryId)
  }

  function getCategoryName(categoryId) {
    const category = getCategoryById(categoryId)
    return category ? category.name : null
  }

  return {
    categories,
    loading,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getCategoryName
  }
})



