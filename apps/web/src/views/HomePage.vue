<template>
  <div class="page">
    <!-- Mapa -->
    <MapView
      :items="mapItems"
      @selecionar="abrirDetalhes"
      @viewport-change="onViewportChange"
    />

    <!-- Erro de conexão -->
    <div v-if="erroConexao" class="erro-toast">
      <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>{{ erroConexao }}
    </div>

    <!-- Navbar -->
    <NavBar
      :filtroAtivo="filtroAtivo"
      @filtrar="alternarFiltro"
    />

    <QuickMenu
      ref="quickMenuRef"
      @abrir-filtros="filtrosAbertos = true"
      @abrir-favoritos="abrirFavoritos"
      @usuario-alterado="atualizarUsuario"
    />

    <FiltersDialog
      :aberto="filtrosAbertos"
      :model-value="filtrosAtivos"
      @fechar="filtrosAbertos = false"
      @aplicar="aplicarFiltros"
    />

    <!-- Modal detalhes -->
    <PropertyModal
      :imovel="imovelSelecionado"
      :autenticado="usuario !== null"
      :favorito="imovelFavorito"
      :carregando-favorito="favoritoEmAtualizacao"
      @fechar="imovelSelecionado = null"
      @alternar-favorito="alternarFavorito"
      @solicitar-login="quickMenuRef?.abrirConta()"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { AuthUser, MapBounds, MapPropertyFilters, MapResultItem, Property, PropertyMapItem, PropertyType } from '@luxxie/types'
import { api } from '@luxxie/api-client'
import MapView from '@/components/MapView.vue'
import NavBar from '@/components/NavBar.vue'
import QuickMenu from '@/components/QuickMenu.vue'
import FiltersDialog from '@/components/FiltersDialog.vue'
import PropertyModal from '@/components/PropertyModal.vue'

type MapViewport = Omit<MapBounds, 'tipo'>

const mapItems = ref<MapResultItem[]>([])
const erroConexao = ref('')
const filtroAtivo = ref<PropertyType | null>(null)
const filtrosAtivos = ref<MapPropertyFilters>({})
const filtrosAbertos = ref(false)
const imovelSelecionado = ref<Property | null>(null)
const usuario = ref<AuthUser | null>(null)
const favoritosIds = ref<number[]>([])
const favoritoEmAtualizacao = ref(false)
const quickMenuRef = ref<{ abrirConta: () => void } | null>(null)
const router = useRouter()
const imovelFavorito = computed(() => (
  imovelSelecionado.value !== null && favoritosIds.value.includes(imovelSelecionado.value.id)
))

const viewportAtual = ref<MapViewport | null>(null)

let debounceBusca: ReturnType<typeof setTimeout> | null = null
let buscaEmAndamento: AbortController | null = null
let buscaFavoritosId = 0

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
  erroConexao.value = ''

  try {
    const resultado = await api.searchMap({
      ...viewport,
      ...filtrosAtivos.value,
      tipo: filtroAtivo.value ?? undefined,
    }, controller.signal)
    if (!controller.signal.aborted) mapItems.value = resultado.items
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    if (!controller.signal.aborted) {
      erroConexao.value = error instanceof Error ? error.message : 'Erro ao consultar imóveis.'
    }
  }
}

watch(filtroAtivo, () => {
  if (viewportAtual.value) agendarBusca(viewportAtual.value)
})

function alternarFiltro(tipo: PropertyType): void {
  filtroAtivo.value = filtroAtivo.value === tipo ? null : tipo
}

function aplicarFiltros(filtros: MapPropertyFilters): void {
  filtrosAtivos.value = filtros
  filtrosAbertos.value = false
  if (viewportAtual.value) agendarBusca(viewportAtual.value)
}

function abrirFavoritos(): void {
  void router.push({ name: 'favoritos' })
}

function atualizarUsuario(usuarioAtual: AuthUser | null): void {
  usuario.value = usuarioAtual
  favoritosIds.value = []
  const requestId = ++buscaFavoritosId
  if (!usuarioAtual) return

  void api.listFavorites().then((favoritos) => {
    if (requestId === buscaFavoritosId && usuario.value?.id === usuarioAtual.id) {
      favoritosIds.value = favoritos.map((favorito) => favorito.id)
    }
  }).catch((error: unknown) => {
    if (requestId === buscaFavoritosId && usuario.value?.id === usuarioAtual.id) {
      erroConexao.value = error instanceof Error ? error.message : 'Não foi possível carregar os favoritos.'
    }
  })
}

async function alternarFavorito(propertyId: number): Promise<void> {
  if (!usuario.value) {
    quickMenuRef.value?.abrirConta()
    return
  }
  if (favoritoEmAtualizacao.value) return

  favoritoEmAtualizacao.value = true
  erroConexao.value = ''
  const jaFavoritado = favoritosIds.value.includes(propertyId)
  try {
    if (jaFavoritado) {
      await api.removeFavorite(propertyId)
      favoritosIds.value = favoritosIds.value.filter((id) => id !== propertyId)
    } else {
      await api.addFavorite(propertyId)
      if (!favoritosIds.value.includes(propertyId)) favoritosIds.value = [...favoritosIds.value, propertyId]
    }
  } catch (error) {
    erroConexao.value = error instanceof Error ? error.message : 'Não foi possível atualizar os favoritos.'
  } finally {
    favoritoEmAtualizacao.value = false
  }
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
