<template>
  <div class="page">
    <!-- Mapa -->
    <MapView
      :items="mapItems"
      @selecionar="abrirDetalhes"
      @viewport-change="onViewportChange"
    />

    <!-- Loading overlay -->
    <div v-if="carregando" class="loading-overlay">
      <div class="spinner"></div>
      <p>Carregando imóveis...</p>
    </div>

    <!-- Erro de conexão -->
    <div v-if="erroConexao" class="erro-toast">
      <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>{{ erroConexao }}
    </div>

    <!-- Navbar -->
    <NavBar
      :filtroAtivo="filtroAtivo"
      @filtrar="alternarFiltro"
    />

    <!-- Modal detalhes -->
    <PropertyModal
      :imovel="imovelSelecionado"
      @fechar="imovelSelecionado = null"
    />

  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import type { MapBounds, MapResultItem, Property, PropertyMapItem, PropertyType } from '@luxxie/types'
import { api } from '@luxxie/api-client'
import MapView from '@/components/MapView.vue'
import NavBar from '@/components/NavBar.vue'
import PropertyModal from '@/components/PropertyModal.vue'

type MapViewport = Omit<MapBounds, 'tipo'>

const mapItems = ref<MapResultItem[]>([])
const carregando = ref(true)
const erroConexao = ref('')
const filtroAtivo = ref<PropertyType | null>(null)
const imovelSelecionado = ref<Property | null>(null)

const viewportAtual = ref<MapViewport | null>(null)

let debounceBusca: ReturnType<typeof setTimeout> | null = null
let buscaEmAndamento: AbortController | null = null

function onViewportChange(viewport: MapViewport): void {
  viewportAtual.value = viewport
  agendarBusca(viewport)
}

function agendarBusca(viewport: MapViewport): void {
  if (debounceBusca) clearTimeout(debounceBusca)
  debounceBusca = setTimeout(() => void carregarMapa(viewport), 160)
}

async function carregarMapa(viewport: MapViewport): Promise<void> {
  buscaEmAndamento?.abort()
  const controller = new AbortController()
  buscaEmAndamento = controller
  carregando.value = true
  erroConexao.value = ''

  try {
    const resultado = await api.searchMap({
      ...viewport,
      tipo: filtroAtivo.value ?? undefined,
    }, controller.signal)
    if (!controller.signal.aborted) mapItems.value = resultado.items
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    if (!controller.signal.aborted) {
      erroConexao.value = error instanceof Error ? error.message : 'Erro ao consultar imóveis.'
    }
  } finally {
    if (!controller.signal.aborted) carregando.value = false
  }
}

watch(filtroAtivo, () => {
  if (viewportAtual.value) agendarBusca(viewportAtual.value)
})

function alternarFiltro(tipo: PropertyType): void {
  filtroAtivo.value = filtroAtivo.value === tipo ? null : tipo
}

async function abrirDetalhes(imovel: PropertyMapItem): Promise<void> {
  try {
    imovelSelecionado.value = await api.getProperty(imovel.id)
  } catch (error) {
    erroConexao.value = error instanceof Error ? error.message : 'Erro ao carregar o imóvel.'
  }
}

onBeforeUnmount(() => {
  if (debounceBusca) clearTimeout(debounceBusca)
  buscaEmAndamento?.abort()
})
</script>

<style scoped>
.page { height: 100vh; width: 100%; position: relative; overflow: hidden; }

.loading-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 24px 32px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 9500;
  font-weight: 600;
  color: var(--text-mid);
  font-size: 14px;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.erro-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff1f1;
  color: #b91c1c;
  border: 1px solid #fca5a5;
  border-radius: var(--radius-md);
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 500;
  z-index: 9500;
  box-shadow: var(--shadow-md);
}
.erro-toast i { margin-right: 6px; }
</style>
