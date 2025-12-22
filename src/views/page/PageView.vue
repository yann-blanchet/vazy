<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Page publique</div>

    <q-tabs v-model="activeTab" class="q-mb-md" active-color="primary" indicator-color="primary">
      <q-tab name="page" label="Page" icon="public" />
      <q-tab name="settings" label="Paramètres" icon="settings" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated>
      <!-- Page Tab -->
      <q-tab-panel name="page">
        <div class="q-gutter-md">
          <!-- URL publique -->
          <q-card>
            <q-card-section>
              <div class="text-h6 q-mb-md">URL publique</div>
              <q-form @submit="updateSlug" class="q-gutter-md">
                <q-input
                  v-model="slugForm.slug"
                  label="URL publique *"
                  outlined
                  :rules="[
                    val => !!val || 'Requis',
                    val => /^[a-z0-9-]+$/.test(val) || 'Seulement lettres minuscules, chiffres et tirets'
                  ]"
                  hint="Partie de l'URL après le domaine (ex: mon-commerce)"
                >
                  <template v-slot:prepend>
                    <div class="text-grey-7">{{ baseUrl }}/</div>
                  </template>
                </q-input>

                <div class="row items-center q-mt-md">
                  <div class="col">
                    <div class="text-body2 text-grey-7">Lien complet :</div>
                    <div class="text-body1 text-weight-medium">{{ publicUrl }}</div>
                  </div>
                  <div class="col-auto">
                    <q-btn
                      icon="content_copy"
                      flat
                      @click="copyUrl"
                      label="Copier"
                    />
                  </div>
                </div>

                <q-btn
                  type="submit"
                  label="Enregistrer l'URL"
                  color="primary"
                  :loading="businessStore.loading"
                  unelevated
                />
              </q-form>
            </q-card-section>
          </q-card>

          <!-- Activer / Désactiver la page -->
          <q-card>
            <q-card-section>
              <div class="text-h6 q-mb-md">Activer / Désactiver la page</div>
              <div class="row items-center q-gutter-md">
                <div class="col">
                  <div class="text-body1">
                    {{ pageForm.is_public_enabled ? 'Page publique activée' : 'Page publique désactivée' }}
                  </div>
                  <div class="text-caption text-grey-7">
                    {{
                      pageForm.is_public_enabled
                        ? 'Votre page est visible par tous'
                        : 'Votre page n\'est pas accessible publiquement'
                    }}
                  </div>
                </div>
                <div class="col-auto">
                  <q-toggle
                    v-model="pageForm.is_public_enabled"
                    color="primary"
                    @update:model-value="togglePublicPage"
                    :loading="businessStore.loading"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Ouvrir la page -->
          <q-card>
            <q-card-section>
              <q-btn
                :label="businessStore.business && pageForm.is_public_enabled ? 'Ouvrir la page' : 'Page désactivée'"
                :disable="!businessStore.business || !pageForm.is_public_enabled"
                color="primary"
                icon="open_in_new"
                @click="openPublicPage"
                unelevated
                class="full-width"
              />
            </q-card-section>
          </q-card>
        </div>
      </q-tab-panel>

      <!-- Paramètres Tab -->
      <q-tab-panel name="settings">
        <div class="q-gutter-md">
          <!-- Nom affiché -->
          <q-card>
            <q-card-section>
              <div class="text-h6 q-mb-md">Nom affiché</div>
              <q-form @submit="updatePage" class="q-gutter-md">
                <q-input
                  v-model="pageForm.business_name"
                  label="Nom affiché *"
                  outlined
                  :rules="[val => !!val || 'Requis']"
                  hint="Nom qui apparaîtra sur votre page publique"
                />
                <q-btn
                  type="submit"
                  label="Enregistrer"
                  color="primary"
                  :loading="businessStore.loading"
                  unelevated
                />
              </q-form>
            </q-card-section>
          </q-card>

          <!-- Description -->
          <q-card>
            <q-card-section>
              <div class="text-h6 q-mb-md">Description</div>
              <q-form @submit="updatePage" class="q-gutter-md">
                <q-input
                  v-model="pageForm.description"
                  label="Description"
                  type="textarea"
                  outlined
                  rows="4"
                  hint="Description de votre commerce qui apparaîtra sur la page publique"
                />
                <q-btn
                  type="submit"
                  label="Enregistrer"
                  color="primary"
                  :loading="businessStore.loading"
                  unelevated
                />
              </q-form>
            </q-card-section>
          </q-card>

          <!-- Photos -->
          <q-card>
            <q-card-section>
              <div class="text-h6 q-mb-md">Photos</div>
              <q-form @submit="updatePage" class="q-gutter-md">
                <!-- Logo -->
                <div>
                  <div class="text-subtitle2 q-mb-sm">Logo</div>
                  <div class="row q-gutter-md items-center">
                    <div class="col-auto">
                      <q-avatar v-if="logoPreview || pageForm.logo_url" size="80px">
                        <img 
                          :src="logoPreview || pageForm.logo_url" 
                          alt="Logo" 
                          @error="handleImageError"
                          @load="console.log('✅ Logo image loaded successfully')"
                        />
                      </q-avatar>
                      <q-avatar v-else size="80px" color="grey-3">
                        <q-icon name="image" size="40px" color="grey-6" />
                      </q-avatar>
                    </div>
                    <div class="col">
                      <q-file
                        v-model="logoFile"
                        label="Sélectionner un logo"
                        accept="image/*"
                        outlined
                        @update:model-value="handleLogoFileSelect"
                        :loading="uploadingLogo"
                        :disable="uploadingLogo"
                      >
                        <template v-slot:prepend>
                          <q-icon name="attach_file" />
                        </template>
                        <template v-slot:append v-if="pageForm.logo_url">
                          <q-btn
                            icon="delete"
                            flat
                            dense
                            round
                            @click.stop="removeLogo"
                            :disable="uploadingLogo"
                          />
                        </template>
                      </q-file>
                      <div v-if="uploadingLogo" class="q-mt-sm">
                        <q-linear-progress :value="logoProgress / 100" color="primary" />
                        <div class="text-caption text-grey-7 q-mt-xs">Téléchargement en cours...</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Cover Photo -->
                <div>
                  <div class="text-subtitle2 q-mb-sm">Photo de couverture</div>
                  <div class="row q-gutter-md items-center">
                    <div class="col-auto">
                      <div v-if="coverPreview || pageForm.cover_photo_url" class="cover-preview">
                        <img 
                          :src="coverPreview || pageForm.cover_photo_url" 
                          alt="Cover" 
                          class="cover-image" 
                          @error="handleImageError"
                          @load="console.log('✅ Cover image loaded successfully')"
                        />
                      </div>
                      <div v-else class="cover-placeholder">
                        <q-icon name="image" size="40px" color="grey-6" />
                      </div>
                    </div>
                    <div class="col">
                      <q-file
                        v-model="coverFile"
                        label="Sélectionner une photo de couverture"
                        accept="image/*"
                        outlined
                        @update:model-value="handleCoverFileSelect"
                        :loading="uploadingCover"
                        :disable="uploadingCover"
                      >
                        <template v-slot:prepend>
                          <q-icon name="attach_file" />
                        </template>
                        <template v-slot:append v-if="pageForm.cover_photo_url">
                          <q-btn
                            icon="delete"
                            flat
                            dense
                            round
                            @click.stop="removeCover"
                            :disable="uploadingCover"
                          />
                        </template>
                      </q-file>
                      <div v-if="uploadingCover" class="q-mt-sm">
                        <q-linear-progress :value="coverProgress / 100" color="primary" />
                        <div class="text-caption text-grey-7 q-mt-xs">Téléchargement en cours...</div>
                      </div>
                    </div>
                  </div>
                </div>

                <q-btn
                  type="submit"
                  label="Enregistrer"
                  color="primary"
                  :loading="businessStore.loading"
                  unelevated
                />
              </q-form>
            </q-card-section>
          </q-card>
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useBusinessStore } from '../../stores/business'
import { useNotifications } from '../../composables/useNotifications'
import { useImageUpload } from '../../composables/useImageUpload'

const businessStore = useBusinessStore()
const { showNotification } = useNotifications()
const { uploading: uploadingLogo, uploadProgress: logoProgress, uploadImage: uploadLogoImage, deleteImage } = useImageUpload()
const { uploading: uploadingCover, uploadProgress: coverProgress, uploadImage: uploadCoverImage } = useImageUpload()

const activeTab = ref('page')
const logoFile = ref(null)
const coverFile = ref(null)
const logoPreview = ref(null)
const coverPreview = ref(null)

const pageForm = reactive({
  business_name: '',
  description: '',
  logo_url: '',
  cover_photo_url: '',
  is_public_enabled: true
})

const slugForm = reactive({
  slug: ''
})

const baseUrl = computed(() => {
  return window.location.origin
})

const publicUrl = computed(() => {
  if (!businessStore.business) return ''
  return `${baseUrl.value}/${businessStore.business.slug}`
})

onMounted(() => {
  if (businessStore.business) {
    loadBusinessData()
  }
})

// Watch for business changes
watch(() => businessStore.business, (newBusiness) => {
  if (newBusiness) {
    loadBusinessData()
  }
}, { deep: true })

function loadBusinessData() {
  const business = businessStore.business
  Object.assign(pageForm, {
    business_name: business.business_name || '',
    description: business.description || '',
    logo_url: business.logo_url || '',
    cover_photo_url: business.cover_photo_url || '',
    is_public_enabled: business.is_public_enabled !== false // Default to true if not set
  })
  slugForm.slug = business.slug || ''
}

async function updatePage() {
  const updates = {
    business_name: pageForm.business_name,
    description: pageForm.description,
    logo_url: pageForm.logo_url || null,
    cover_photo_url: pageForm.cover_photo_url || null
  }

  const { error } = await businessStore.updateBusiness(updates)
  if (error) {
    showNotification({
      message: error.message || 'Erreur lors de la mise à jour',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
  } else {
    showNotification({
      message: 'Page mise à jour avec succès',
      type: 'success',
      icon: 'check_circle',
      timeout: 3000
    })
  }
}

async function updateSlug() {
  if (!slugForm.slug || !/^[a-z0-9-]+$/.test(slugForm.slug)) {
    showNotification({
      message: 'URL invalide. Utilisez seulement des lettres minuscules, chiffres et tirets.',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
    return
  }

  const { error } = await businessStore.updateBusiness({ slug: slugForm.slug })
  if (error) {
    showNotification({
      message: error.message || 'Erreur lors de la mise à jour de l\'URL',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
  } else {
    showNotification({
      message: 'URL mise à jour avec succès',
      type: 'success',
      icon: 'check_circle',
      timeout: 3000
    })
  }
}

async function togglePublicPage() {
  const { error } = await businessStore.updateBusiness({
    is_public_enabled: pageForm.is_public_enabled
  })
  if (error) {
    // Revert toggle on error
    pageForm.is_public_enabled = !pageForm.is_public_enabled
    showNotification({
      message: error.message || 'Erreur lors de la mise à jour',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
  } else {
    showNotification({
      message: pageForm.is_public_enabled
        ? 'Page publique activée'
        : 'Page publique désactivée',
      type: 'success',
      icon: 'check_circle',
      timeout: 3000
    })
  }
}

function copyUrl() {
  navigator.clipboard.writeText(publicUrl.value).then(() => {
    showNotification({
      message: 'URL copiée dans le presse-papiers',
      type: 'success',
      icon: 'content_copy',
      timeout: 2000
    })
  }).catch(() => {
    showNotification({
      message: 'Erreur lors de la copie',
      type: 'error',
      icon: 'error',
      timeout: 2000
    })
  })
}

function openPublicPage() {
  if (businessStore.business && pageForm.is_public_enabled) {
    window.open(publicUrl.value, '_blank')
  }
}

function handleImageError(event) {
  const img = event.target
  const src = img.src
  console.error(`❌ Error loading image:`, src)
  console.error('🔍 Image element:', img)
  console.error('🔍 Error event:', event)
  
  // Check if it's a preview URL (blob) or a Supabase URL
  if (src.startsWith('blob:')) {
    console.warn('⚠️ Preview URL failed - this is normal if file was cleared')
    return
  }
  
  // For Supabase URLs, test accessibility
  console.error('🔍 Testing Supabase URL accessibility...')
  fetch(src, { method: 'HEAD', mode: 'no-cors' })
    .then(() => {
      console.log('✅ URL is accessible (CORS might be blocking image display)')
      console.log('💡 Try opening the URL directly in a new tab:', src)
    })
    .catch((err) => {
      console.error('❌ URL fetch error:', err)
      console.error('💡 Possible issues:')
      console.error('   1. Bucket is not public')
      console.error('   2. RLS policies are blocking access')
      console.error('   3. CORS configuration issue')
      console.error('   4. URL format is incorrect')
    })
  
  // Don't hide the image - show error icon instead
  img.style.opacity = '0.3'
}

function handleLogoFileSelect(file) {
  console.log('🖼️ handleLogoFileSelect called with file:', file)
  
  if (!file) {
    console.warn('⚠️ No file in handleLogoFileSelect')
    logoPreview.value = null
    return
  }

  // Create preview URL immediately
  logoPreview.value = URL.createObjectURL(file)
  
  // Start upload
  handleLogoUpload(file)
}

async function handleLogoUpload(file) {
  console.log('🖼️ handleLogoUpload called with file:', file)
  
  if (!file) {
    console.warn('⚠️ No file in handleLogoUpload')
    return
  }

  try {
    console.log('📤 Starting logo upload...')
    const result = await uploadLogoImage(file)
    console.log('✅ Logo upload result:', result)
    
    // Clean up preview URL
    if (logoPreview.value) {
      URL.revokeObjectURL(logoPreview.value)
      logoPreview.value = null
    }
    
    pageForm.logo_url = result.url
    
    // Auto-save after upload
    await updatePage()
    
    showNotification({
      message: 'Logo téléchargé avec succès',
      type: 'success',
      icon: 'check_circle',
      timeout: 3000
    })
  } catch (error) {
    // Clean up preview URL on error
    if (logoPreview.value) {
      URL.revokeObjectURL(logoPreview.value)
      logoPreview.value = null
    }
    
    showNotification({
      message: error.message || 'Erreur lors du téléchargement du logo',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
    logoFile.value = null
  }
}

function handleCoverFileSelect(file) {
  console.log('🖼️ handleCoverFileSelect called with file:', file)
  
  if (!file) {
    console.warn('⚠️ No file in handleCoverFileSelect')
    coverPreview.value = null
    return
  }

  // Create preview URL immediately
  coverPreview.value = URL.createObjectURL(file)
  
  // Start upload
  handleCoverUpload(file)
}

async function handleCoverUpload(file) {
  console.log('🖼️ handleCoverUpload called with file:', file)
  
  if (!file) {
    console.warn('⚠️ No file in handleCoverUpload')
    return
  }

  try {
    console.log('📤 Starting cover upload...')
    const result = await uploadCoverImage(file)
    console.log('✅ Cover upload result:', result)
    
    // Clean up preview URL
    if (coverPreview.value) {
      URL.revokeObjectURL(coverPreview.value)
      coverPreview.value = null
    }
    
    pageForm.cover_photo_url = result.url
    
    // Auto-save after upload
    await updatePage()
    
    showNotification({
      message: 'Photo de couverture téléchargée avec succès',
      type: 'success',
      icon: 'check_circle',
      timeout: 3000
    })
  } catch (error) {
    // Clean up preview URL on error
    if (coverPreview.value) {
      URL.revokeObjectURL(coverPreview.value)
      coverPreview.value = null
    }
    
    showNotification({
      message: error.message || 'Erreur lors du téléchargement de la photo',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
    coverFile.value = null
  }
}

async function removeLogo() {
  if (pageForm.logo_url) {
    try {
      await deleteImage(pageForm.logo_url)
      pageForm.logo_url = ''
      logoFile.value = null
      await updatePage()
      showNotification({
        message: 'Logo supprimé',
        type: 'success',
        icon: 'check_circle',
        timeout: 2000
      })
    } catch (error) {
      showNotification({
        message: 'Erreur lors de la suppression du logo',
        type: 'error',
        icon: 'error',
        timeout: 3000
      })
    }
  }
}

async function removeCover() {
  if (pageForm.cover_photo_url) {
    try {
      await deleteImage(pageForm.cover_photo_url)
      pageForm.cover_photo_url = ''
      coverFile.value = null
      await updatePage()
      showNotification({
        message: 'Photo de couverture supprimée',
        type: 'success',
        icon: 'check_circle',
        timeout: 2000
      })
    } catch (error) {
      showNotification({
        message: 'Erreur lors de la suppression de la photo',
        type: 'error',
        icon: 'error',
        timeout: 3000
      })
    }
  }
}
</script>

<style scoped>
.cover-preview {
  width: 120px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 120px;
  height: 80px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
