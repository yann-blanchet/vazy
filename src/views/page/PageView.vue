<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Page publique</div>

    <!-- Live Preview -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Aperçu live</div>
        <div class="row q-gutter-md">
          <div class="col-12 col-md-6">
            <div class="preview-container">
              <iframe
                v-if="businessStore.business && pageForm.is_public_enabled"
                :src="publicUrl"
                class="preview-iframe"
                frameborder="0"
              />
              <div v-else class="preview-placeholder flex flex-center">
                <div class="text-center">
                  <q-icon name="visibility_off" size="48px" color="grey-5" />
                  <div class="text-grey-6 q-mt-sm">La page est désactivée</div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <q-btn
              :label="businessStore.business && pageForm.is_public_enabled ? 'Ouvrir dans un nouvel onglet' : 'Page désactivée'"
              :disable="!businessStore.business || !pageForm.is_public_enabled"
              color="primary"
              icon="open_in_new"
              @click="openPublicPage"
              unelevated
              class="full-width"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Title / Description -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Titre / Description</div>
        <q-form @submit="updatePage" class="q-gutter-md">
          <q-input
            v-model="pageForm.business_name"
            label="Titre de la page *"
            outlined
            :rules="[val => !!val || 'Requis']"
            hint="Nom qui apparaîtra sur votre page publique"
          />

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

    <!-- Photo / Colors -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Photo / Couleurs</div>
        <q-form @submit="updatePage" class="q-gutter-md">
          <!-- Logo -->
          <div>
            <div class="text-subtitle2 q-mb-sm">Logo</div>
            <div class="row q-gutter-md items-center">
              <div class="col-auto">
                <q-avatar v-if="pageForm.logo_url" size="80px">
                  <img :src="pageForm.logo_url" alt="Logo" />
                </q-avatar>
                <q-avatar v-else size="80px" color="grey-3">
                  <q-icon name="image" size="40px" color="grey-6" />
                </q-avatar>
              </div>
              <div class="col">
                <q-input
                  v-model="pageForm.logo_url"
                  label="URL du logo"
                  outlined
                  hint="URL de l'image du logo"
                />
              </div>
            </div>
          </div>

          <!-- Cover Photo -->
          <div>
            <div class="text-subtitle2 q-mb-sm">Photo de couverture</div>
            <div class="row q-gutter-md items-center">
              <div class="col-auto">
                <div v-if="pageForm.cover_photo_url" class="cover-preview">
                  <img :src="pageForm.cover_photo_url" alt="Cover" class="cover-image" />
                </div>
                <div v-else class="cover-placeholder">
                  <q-icon name="image" size="40px" color="grey-6" />
                </div>
              </div>
              <div class="col">
                <q-input
                  v-model="pageForm.cover_photo_url"
                  label="URL de la photo de couverture"
                  outlined
                  hint="URL de l'image de couverture"
                />
              </div>
            </div>
          </div>

          <!-- Primary Color -->
          <div>
            <div class="text-subtitle2 q-mb-sm">Couleur principale</div>
            <div class="row q-gutter-md items-center">
              <div class="col-auto">
                <input
                  v-model="pageForm.primary_color"
                  type="color"
                  class="color-input"
                />
              </div>
              <div class="col">
                <q-input
                  v-model="pageForm.primary_color"
                  label="Couleur principale (hex)"
                  outlined
                  hint="Ex: #1976d2"
                >
                  <template v-slot:prepend>
                    <div
                      class="color-preview"
                      :style="{ backgroundColor: pageForm.primary_color || '#1976d2' }"
                    />
                  </template>
                </q-input>
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

    <!-- Public Link -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Lien public</div>
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

    <!-- Enable / Disable Page -->
    <q-card class="q-mb-md">
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
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useBusinessStore } from '../../stores/business'
import { useNotifications } from '../../composables/useNotifications'

const businessStore = useBusinessStore()
const { showNotification } = useNotifications()

const pageForm = reactive({
  business_name: '',
  description: '',
  logo_url: '',
  cover_photo_url: '',
  primary_color: '#1976d2',
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
    primary_color: business.primary_color || '#1976d2',
    is_public_enabled: business.is_public_enabled !== false // Default to true if not set
  })
  slugForm.slug = business.slug || ''
}

async function updatePage() {
  const updates = {
    business_name: pageForm.business_name,
    description: pageForm.description,
    logo_url: pageForm.logo_url || null,
    cover_photo_url: pageForm.cover_photo_url || null,
    primary_color: pageForm.primary_color || null
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
</script>

<style scoped>
.preview-container {
  width: 100%;
  height: 400px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  background: white;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.preview-placeholder {
  width: 100%;
  height: 100%;
  background: #f5f5f5;
}

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

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.color-input {
  width: 60px;
  height: 40px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
}
</style>

