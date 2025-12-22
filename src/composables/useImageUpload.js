import { ref } from 'vue'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../stores/auth'

export function useImageUpload() {
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const authStore = useAuthStore()

  async function uploadImage(file) {
    console.log('📤 uploadImage called with file:', file)
    
    if (!file) {
      console.error('❌ No file provided')
      throw new Error('Aucun fichier sélectionné')
    }

    console.log('📋 File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeMB: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    })

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type)
      throw new Error('Le fichier doit être une image')
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'max:', maxSize)
      throw new Error('L\'image ne doit pas dépasser 5MB')
    }

    uploading.value = true
    uploadProgress.value = 0

    try {
      // Get user ID for folder structure
      const userId = authStore.user?.id
      console.log('👤 User ID:', userId)
      
      if (!userId) {
        console.error('❌ User not authenticated')
        throw new Error('Utilisateur non authentifié')
      }

      // Generate unique filename (no dashes, Supabase doesn't like them)
      const fileExt = file.name.split('.').pop()
      const randomStr = Math.random().toString(36).substring(2, 15).replace(/-/g, '_')
      const fileName = `${Date.now()}_${randomStr}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      // Note: listBuckets() peut nécessiter des permissions spéciales
      // On essaie directement l'upload - si le bucket existe et les politiques sont correctes, ça fonctionnera
      console.log('⬆️ Uploading file to path:', filePath)
      console.log('📄 File type:', file.type)
      
      // Convert file to ArrayBuffer to ensure binary upload (not base64)
      const arrayBuffer = await file.arrayBuffer()
      
      console.log('📦 File converted to ArrayBuffer, size:', arrayBuffer.byteLength, 'bytes')
      
      // Upload with explicit contentType and ArrayBuffer to ensure binary storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, arrayBuffer, {
          contentType: file.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('❌ Upload error:', error)
        console.error('❌ Error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error
        })
        // Provide more helpful error messages
        if (error.message?.includes('new row violates row-level security')) {
          throw new Error('Permissions insuffisantes. Vérifiez les politiques RLS du bucket "images".')
        } else if (error.message?.includes('Bucket not found')) {
          throw new Error('Le bucket "images" n\'existe pas. Veuillez le créer dans Supabase Storage.')
        } else if (error.statusCode === 400) {
          throw new Error(`Erreur d'upload: ${error.message || 'Vérifiez que le bucket existe et que les permissions sont correctement configurées.'}`)
        }
        throw error
      }

      console.log('✅ Upload successful, data:', data)

      // Get URL - try signed URL first (works even if bucket is not public)
      const pathForUrl = data.path || filePath
      
      console.log('📁 Path for URL:', pathForUrl)
      console.log('📁 Full path from upload:', data.fullPath)
      
      // Try to get a signed URL (valid for 1 year) - works even if bucket is not public
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('images')
        .createSignedUrl(pathForUrl, 31536000) // 1 year in seconds
      
      let finalUrl
      
      if (!signedError && signedUrlData?.signedUrl) {
        console.log('🔗 Using signed URL (works even if bucket is not public)')
        finalUrl = signedUrlData.signedUrl
      } else {
        console.warn('⚠️ Could not create signed URL, trying public URL:', signedError)
        
        // Fallback to public URL
        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(pathForUrl)
        
        finalUrl = urlData.publicUrl
        console.log('🔗 Using public URL:', finalUrl)
        
        // Verify URL format
        if (!finalUrl || !finalUrl.includes('/storage/v1/object/')) {
          console.error('❌ Invalid URL format:', finalUrl)
          throw new Error('URL invalide générée')
        }
      }
      
      console.log('✅ Final URL:', finalUrl)
      console.log('💡 If image does not load:')
      console.log('   1. Make sure bucket "images" is PUBLIC in Supabase Storage')
      console.log('   2. Verify policy "Public can view images" exists')
      console.log('   3. Try opening URL in new tab:', finalUrl)

      uploadProgress.value = 100
      uploading.value = false

      return {
        url: finalUrl,
        path: filePath
      }
    } catch (error) {
      uploading.value = false
      uploadProgress.value = 0
      throw error
    }
  }

  async function deleteImage(filePath) {
    if (!filePath) return

    try {
      // Extract path from full URL if needed
      const path = filePath.includes('/storage/v1/object/public/images/')
        ? filePath.split('/storage/v1/object/public/images/')[1]
        : filePath

      const { error } = await supabase.storage
        .from('images')
        .remove([path])

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      // Don't throw - deletion is not critical
    }
  }

  return {
    uploading,
    uploadProgress,
    uploadImage,
    deleteImage
  }
}

