<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-sm items-center">
      <div class="col-auto">
        <q-btn flat icon="arrow_back" dense @click="goBack" />
      </div>
      <div class="col">
        <div class="text-h6">Gérer les photos</div>
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section class="q-pa-md">
        <div class="q-gutter-sm">
          <!-- Liste des photos existantes -->
          <div v-if="businessPhotos.length > 0" class="q-mb-md">
            <div class="text-subtitle2 text-grey-7 q-mb-sm">
              Photos ({{ businessPhotos.length }}/4)
            </div>
            <div class="row q-gutter-xs">
              <div
                v-for="(photo, index) in businessPhotos"
                :key="photo.id"
                class="col-6 col-sm-3"
              >
                <div class="relative-position">
                  <q-img
                    :src="photo.photo_url"
                    :alt="`Photo ${index + 1}`"
                    style="height: 120px"
                    @error="handleImageError"
                    class="rounded-borders"
                  >
                    <div class="absolute-top-right q-pa-xs">
                      <q-badge
                        v-if="index === 0"
                        color="primary"
                        label="1"
                        rounded
                        dense
                      />
                    </div>
                    <div class="absolute-bottom-right q-pa-xs">
                      <q-btn
                        icon="close"
                        size="xs"
                        round
                        dense
                        color="white"
                        text-color="negative"
                        @click="removePhoto(index)"
                        :disable="uploadingPhotos"
                      />
                    </div>
                  </q-img>
                  <div class="row q-gutter-xs justify-center q-mt-xs">
                    <q-btn
                      v-if="index > 0"
                      icon="keyboard_arrow_up"
                      size="xs"
                      flat
                      dense
                      round
                      @click="movePhotoUp(index)"
                      :disable="uploadingPhotos"
                    />
                    <q-btn
                      v-if="index < businessPhotos.length - 1"
                      icon="keyboard_arrow_down"
                      size="xs"
                      flat
                      dense
                      round
                      @click="movePhotoDown(index)"
                      :disable="uploadingPhotos"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Upload de nouvelle photo -->
          <div v-if="businessPhotos.length < 4">
            <q-file
              v-model="photoFile"
              label="Ajouter une photo"
              accept="image/*"
              outlined
              dense
              @update:model-value="handlePhotoFileSelect"
              :loading="uploadingPhotos"
              :disable="uploadingPhotos || businessPhotos.length >= 4"
            >
              <template v-slot:prepend>
                <q-icon name="add" />
              </template>
            </q-file>
            <div v-if="uploadingPhotos" class="q-mt-xs">
              <q-linear-progress :value="photoProgress / 100" color="primary" />
            </div>
          </div>
          <div v-else class="text-caption text-grey-7 q-mt-xs">
            Maximum de 4 photos atteint
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '../../stores/profile'
import { usePageSettingsStore } from '../../stores/pageSettings'
import { useNotifications } from '../../composables/useNotifications'
import { useImageUpload } from '../../composables/useImageUpload'

const router = useRouter()
const profileStore = useProfileStore()
const pageSettingsStore = usePageSettingsStore()
const { showNotification } = useNotifications()
const { uploading: uploadingPhotos, uploadProgress: photoProgress, uploadImage: uploadPhotoImage, deleteImage } = useImageUpload()

const photoFile = ref(null)
const businessPhotos = ref([])

onMounted(async () => {
  await profileStore.loadProfile()
  if (profileStore.profile) {
    await pageSettingsStore.loadPageSettings()
    loadPhotos()
  }
})

function loadPhotos() {
  const settings = pageSettingsStore.pageSettings
  
  // Load photos from page_settings
  if (settings?.photos) {
    businessPhotos.value = settings.photos.map((url, index) => ({
      id: `photo-${index}`,
      photo_url: url,
      display_order: index
    }))
  } else {
    businessPhotos.value = []
  }
}

function handleImageError(event) {
  const img = event.target
  const src = img.src
  console.error(`❌ Error loading image:`, src)
  
  if (src.startsWith('blob:')) {
    console.warn('⚠️ Preview URL failed - this is normal if file was cleared')
    return
  }
  
  img.style.opacity = '0.3'
}

function handlePhotoFileSelect(file) {
  if (!file) {
    console.warn('⚠️ No file in handlePhotoFileSelect')
    return
  }

  if (businessPhotos.value.length >= 4) {
    showNotification({
      message: 'Maximum de 4 photos atteint',
      type: 'error',
      icon: 'error',
      timeout: 3000
    })
    photoFile.value = null
    return
  }

  handlePhotoUpload(file)
}

async function handlePhotoUpload(file) {
  if (!file) {
    console.warn('⚠️ No file in handlePhotoUpload')
    return
  }

  if (businessPhotos.value.length >= 4) {
    showNotification({
      message: 'Maximum de 4 photos atteint',
      type: 'error',
      icon: 'error',
      timeout: 3000
    })
    photoFile.value = null
    return
  }

  try {
    const result = await uploadPhotoImage(file)
    
    // Add photo to page_settings.photos array
    const currentPhotos = pageSettingsStore.pageSettings?.photos || []
    const newPhotos = [...currentPhotos, result.url]
    
    const updates = { photos: newPhotos }
    
    // Create page_settings if it doesn't exist
    if (!pageSettingsStore.pageSettings) {
      await pageSettingsStore.createPageSettings(updates)
    } else {
      const { error } = await pageSettingsStore.updatePageSettings(updates)
      if (error) {
        throw error
      }
    }
    
    // Reload photos
    loadPhotos()
    
    photoFile.value = null
    
    showNotification({
      message: 'Photo ajoutée avec succès',
      type: 'success',
      icon: 'check_circle',
      timeout: 3000
    })
  } catch (error) {
    showNotification({
      message: error.message || 'Erreur lors du téléchargement de la photo',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
    photoFile.value = null
  }
}

async function removePhoto(photoIndex) {
  try {
    const photo = businessPhotos.value[photoIndex]
    if (!photo) return

    // Remove from photos array
    const currentPhotos = pageSettingsStore.pageSettings?.photos || []
    const newPhotos = currentPhotos.filter((_, index) => index !== photoIndex)
    
    const updates = { photos: newPhotos }
    const { error } = await pageSettingsStore.updatePageSettings(updates)
    
    if (error) {
      throw error
    }

    // Delete from storage
    if (photo.photo_url) {
      await deleteImage(photo.photo_url)
    }
    
    // Reload photos
    loadPhotos()
    
    showNotification({
      message: 'Photo supprimée',
      type: 'success',
      icon: 'check_circle',
      timeout: 3000
    })
  } catch (error) {
    showNotification({
      message: error.message || 'Erreur lors de la suppression',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
  }
}

async function movePhotoUp(index) {
  if (index === 0) return
  
  const currentPhotos = pageSettingsStore.pageSettings?.photos || []
  const newPhotos = [...currentPhotos]
  [newPhotos[index - 1], newPhotos[index]] = [newPhotos[index], newPhotos[index - 1]]
  
  const updates = { photos: newPhotos }
  const { error } = await pageSettingsStore.updatePageSettings(updates)
  
  if (error) {
    showNotification({
      message: error.message || 'Erreur lors du réordonnancement',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
  } else {
    loadPhotos()
  }
}

async function movePhotoDown(index) {
  if (index >= businessPhotos.value.length - 1) return
  
  const currentPhotos = pageSettingsStore.pageSettings?.photos || []
  const newPhotos = [...currentPhotos]
  [newPhotos[index], newPhotos[index + 1]] = [newPhotos[index + 1], newPhotos[index]]
  
  const updates = { photos: newPhotos }
  const { error } = await pageSettingsStore.updatePageSettings(updates)
  
  if (error) {
    showNotification({
      message: error.message || 'Erreur lors du réordonnancement',
      type: 'error',
      icon: 'error',
      timeout: 4000
    })
  } else {
    loadPhotos()
  }
}

function goBack() {
  router.push('/page')
}
</script>



