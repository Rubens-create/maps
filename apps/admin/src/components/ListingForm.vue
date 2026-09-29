<template>
  <div class="modal-overlay" :class="{ open: aberto }" @click.self="$emit('fechar')">
    <div class="modal-card">
      <div class="modal-header">
        <h2>Novo Anúncio</h2>
        <button class="close-btn" @click="$emit('fechar')">×</button>
      </div>

      <div class="modal-body">
        <!-- Tipo -->
        <div class="form-group">
          <label class="form-label">Tipo de negócio</label>
          <div class="select-with-icon">
            <i class="fas" :class="form.tipo === 'Venda' ? 'fa-house' : 'fa-key'" aria-hidden="true"></i>
            <select v-model="form.tipo" class="form-select">
              <option value="Venda">Vender</option>
              <option value="Aluguel">Alugar</option>
            </select>
          </div>
        </div>

        <!-- Título -->
        <div class="form-group">
          <label class="form-label">Título do anúncio</label>
          <input v-model="form.titulo" type="text" class="form-input" placeholder="Ex: Apartamento no Centro com vista" />
        </div>

        <!-- Preço -->
        <div class="form-group">
          <label class="form-label">{{ form.tipo === 'Aluguel' ? 'Preço / mês (R$)' : 'Preço de venda (R$)' }}</label>
          <input v-model="form.preco" type="number" class="form-input" placeholder="Ex: 350000" min="0" />
        </div>

        <!-- Quartos + Área -->
        <div class="row-2">
          <div class="form-group">
            <label class="form-label">Quartos</label>
            <input v-model="form.quartos" type="number" class="form-input" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">Área (m²)</label>
            <input v-model="form.area" type="number" class="form-input" min="1" />
          </div>
        </div>

        <!-- Pet -->
        <div class="form-group">
          <label class="form-label">Aceita pet?</label>
          <div class="select-with-icon">
            <i class="fas" :class="form.aceita_pet ? 'fa-paw' : 'fa-ban'" aria-hidden="true"></i>
            <select v-model="form.aceita_pet" class="form-select">
              <option :value="false">Não</option>
              <option :value="true">Sim</option>
            </select>
          </div>
        </div>

        <!-- WhatsApp -->
        <div class="form-group">
          <label class="form-label">WhatsApp para contato</label>
          <input v-model="form.whatsapp" type="tel" class="form-input" placeholder="(11) 99999-9999" />
        </div>

        <!-- Foto -->
        <div class="form-group">
          <label class="form-label">URL da foto de capa</label>
          <input v-model="form.foto_capa" type="url" class="form-input" placeholder="https://..." />
          <small style="color:var(--text-light); font-size:12px;">Upload direto será adicionado na Fase 3.</small>
        </div>

        <!-- ============ LOCALIZAÇÃO ============ -->
        <div class="form-group">
          <label class="form-label">Localização do imóvel</label>

          <!-- Botões de método -->
          <div class="loc-methods">
            <button
              type="button"
              class="loc-method-btn"
              :class="{ active: metodoLoc === 'gps' }"
              @click="ativarGps"
            >
              <i :class="geoIcon"></i>
              {{ geoLabel }}
            </button>
            <button
              type="button"
              class="loc-method-btn"
              :class="{ active: metodoLoc === 'mapa' }"
              @click="ativarMapa"
            >
              <i class="fas fa-map-pin"></i>
              Marcar no mapa
            </button>
          </div>

          <!-- Mini-mapa (aparece quando modo mapa está ativo) -->
          <div v-show="metodoLoc === 'mapa'" class="mini-map-wrapper">
            <p class="mini-map-hint">
              <i class="fas fa-hand-pointer"></i>
              Clique no mapa para marcar a localização do imóvel
            </p>
            <div ref="miniMapEl" class="mini-map"></div>
          </div>

          <!-- Coordenadas capturadas -->
          <div v-if="form.latitude" class="coords-badge">
            <i class="fas fa-check-circle"></i>
            Localização capturada: {{ form.latitude }}, {{ form.longitude }}
          </div>
        </div>

        <!-- Erro -->
        <div v-if="erro" class="erro-box"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i> {{ erro }}</div>

        <!-- Submit -->
        <button class="btn-primary" @click="salvar" :disabled="salvando">
          <i v-if="salvando" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-check-circle"></i>
          {{ salvando ? 'Publicando...' : 'Publicar Anúncio' }}
        </button>
        <div style="height:20px;"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import L from 'leaflet'
import type { PropertyInput, PropertyType } from '@luxxie/types'
import { api } from '@luxxie/api-client'

// Fix ícones Leaflet com Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon   from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete (L.Icon.Default.prototype as typeof L.Icon.Default.prototype & { _getIconUrl?: () => string })._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

defineProps<{ aberto: boolean }>()
const emit = defineEmits<{
  fechar: []
  publicado: [coords: { lat: number; lng: number }]
}>()

type LocationMethod = 'gps' | 'mapa' | null
interface ListingFormState {
  tipo: PropertyType
  titulo: string
  preco: number | ''
  quartos: number
  area: number
  aceita_pet: boolean
  whatsapp: string
  foto_capa: string
  latitude: string
  longitude: string
}

const salvando    = ref(false)
const geoLabel    = ref('Usar minha localização')
const geoIcon     = ref('fas fa-map-marker-alt')
const erro        = ref('')
const metodoLoc   = ref<LocationMethod>(null)

// Mini-mapa
const miniMapEl   = ref<HTMLDivElement | null>(null)
let miniMap: L.Map | null = null
let miniMarker: L.Marker | null = null

const form = reactive<ListingFormState>({
  tipo: 'Venda', titulo: '', preco: '',
  quartos: 1, area: 50, aceita_pet: false,
  whatsapp: '', foto_capa: '',
  latitude: '', longitude: ''
})

// ── Inicializa mini-mapa quando o painel ficar visível ──────────────
function initMiniMap(): void {
  const existingMap = miniMap
  if (existingMap) {
    // Já existe, só invalida o tamanho (muda de display:none para visível)
    setTimeout(() => existingMap.invalidateSize(), 50)
    return
  }

  if (!miniMapEl.value) return
  const mapInstance = L.map(miniMapEl.value, { zoomControl: true }).setView([-15.793889, -47.882778], 4)
  miniMap = mapInstance

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(mapInstance)

  // Clique no mapa → posiciona marcador e salva coordenadas
  mapInstance.on('click', (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng
    form.latitude  = lat.toFixed(6)
    form.longitude = lng.toFixed(6)

    if (miniMarker) {
      miniMarker.setLatLng([lat, lng])
    } else {
      miniMarker = L.marker([lat, lng]).addTo(mapInstance)
    }
    miniMarker.bindPopup('<i class="fas fa-location-dot" aria-hidden="true"></i> Imóvel aqui').openPopup()
  })
}

// ── Modo GPS ────────────────────────────────────────────────────────
function ativarGps(): void {
  metodoLoc.value = 'gps'
  erro.value = ''
  geoLabel.value = 'Obtendo localização...'
  geoIcon.value  = 'fas fa-spinner fa-spin'

  if (!navigator.geolocation) {
    erro.value = 'Navegador sem suporte a GPS.'
    metodoLoc.value = null
    return
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      form.latitude  = pos.coords.latitude.toFixed(6)
      form.longitude = pos.coords.longitude.toFixed(6)
      geoLabel.value = 'GPS capturado!'
      geoIcon.value  = 'fas fa-check'
    },
    () => {
      erro.value     = 'Erro ao obter GPS. Tente "Marcar no mapa".'
      geoLabel.value = 'Usar minha localização'
      geoIcon.value  = 'fas fa-map-marker-alt'
      metodoLoc.value = null
    }
  )
}

// ── Modo Mapa ───────────────────────────────────────────────────────
function ativarMapa(): void {
  metodoLoc.value = 'mapa'
  erro.value = ''
  // Espera o v-show renderizar e inicializa o mapa
  nextTick(() => initMiniMap())
}

// Se já tinha coord GPS e user troca pro mapa, posiciona marcador
watch(() => [metodoLoc.value, form.latitude] as const, ([modo]) => {
  const mapInstance = miniMap
  if (modo === 'mapa' && form.latitude && mapInstance) {
    const lat = parseFloat(form.latitude)
    const lng = parseFloat(form.longitude)
    if (miniMarker) miniMarker.setLatLng([lat, lng])
    else miniMarker = L.marker([lat, lng]).addTo(mapInstance)
    mapInstance.setView([lat, lng], 15)
  }
})

// ── Salvar ─────────────────────────────────────────────────────────
async function salvar(): Promise<void> {
  erro.value = ''
  if (!form.titulo.trim())         { erro.value = 'Informe o título.'; return }
  if (form.preco === '' || !Number.isFinite(form.preco) || form.preco <= 0) { erro.value = 'Informe um preço válido.'; return }
  if (!form.latitude)              { erro.value = 'Selecione a localização do imóvel.'; return }

  salvando.value = true
  const input: PropertyInput = {
    titulo:     form.titulo.trim(),
    preco:      form.preco,
    tipo:       form.tipo,
    quartos:    form.quartos,
    area:       form.area,
    aceita_pet: form.aceita_pet,
    whatsapp:   form.whatsapp.trim(),
    foto_capa:  form.foto_capa.trim() || null,
    latitude:   parseFloat(form.latitude),
    longitude:  parseFloat(form.longitude),
  }

  try {
    await api.createProperty(input)
    emit('publicado', { lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) })
    emit('fechar')
    resetar()
  } catch (error) {
    erro.value = error instanceof Error ? `Erro ao salvar: ${error.message}` : 'Erro ao salvar o anúncio.'
  } finally {
    salvando.value = false
  }
}

function resetar(): void {
  Object.assign(form, {
    titulo: '', preco: '', quartos: 1, area: 50,
    aceita_pet: false, whatsapp: '', foto_capa: '',
    latitude: '', longitude: ''
  })
  geoLabel.value  = 'Usar minha localização'
  geoIcon.value   = 'fas fa-map-marker-alt'
  metodoLoc.value = null
  erro.value      = ''
  if (miniMarker) { miniMarker.remove(); miniMarker = null }
}
</script>

<style scoped>
.row-2 { display: flex; gap: 10px; }
.row-2 .form-group { flex: 1; }
.select-with-icon { position: relative; }
.select-with-icon > i {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  color: var(--text-mid);
  pointer-events: none;
}
.select-with-icon .form-select { padding-left: 40px; }

/* ── Seleção de método de localização ── */
.loc-methods {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.loc-method-btn {
  flex: 1;
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-mid);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: var(--transition);
}
.loc-method-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
}
.loc-method-btn.active {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
}

/* ── Mini-mapa ── */
.mini-map-wrapper {
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-top: 4px;
}

.mini-map-hint {
  background: var(--primary-light);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-map {
  height: 220px;
  width: 100%;
  cursor: crosshair;
}

/* ── Badge de coordenadas confirmadas ── */
.coords-badge {
  background: var(--success-light);
  color: #15803d;
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  word-break: break-all;
}

/* ── Erro ── */
.erro-box {
  background: #fff1f1;
  color: #b91c1c;
  border: 1px solid #fca5a5;
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
}
.erro-box i { margin-right: 6px; }
</style>
