<template>
  <div
    class="page"
    @pointerdown.capture="onPageInteracted"
    @wheel.capture="onPageInteracted"
    @keydown.capture="onPageInteracted"
  >
    <!-- Mapa -->
    <MapView
      ref="mapViewRef"
      :items="mapItems"
      @selecionar="abrirDetalhes"
      @viewport-change="onViewportChange"
    />

    <button
      class="location-control"
      type="button"
      aria-label="Atualizar minha localização"
      title="Atualizar minha localização"
      :disabled="localizacaoManualEmAndamento"
      @click="atualizarLocalizacaoManualmente"
    >
      <i v-if="localizacaoManualEmAndamento" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
      <i v-else class="fas fa-location-crosshairs" aria-hidden="true"></i>
    </button>

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
      @localizacao-alterada="atualizarPreferenciaLocalizacao"
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { AuthUser, MapBounds, MapPropertyFilters, MapResultItem, PreciseLocation, Property, PropertyMapItem, PropertyType, UserLocationSettings } from '@luxxie/types'
import { api } from '@luxxie/api-client'
import MapView from '@/components/MapView.vue'
import NavBar from '@/components/NavBar.vue'
import QuickMenu from '@/components/QuickMenu.vue'
import FiltersDialog from '@/components/FiltersDialog.vue'
import PropertyModal from '@/components/PropertyModal.vue'
import { getApproximateLocationByIp, type Coordinates } from '@/utils/ip-location'
import { requestPositionIfAllowed } from '@/utils/geolocation'
import { runLocationStages } from '@/utils/location-bootstrap'
import { getAnonymousPreciseLocation, saveAnonymousPreciseLocation } from '@/utils/precise-location'

type MapViewport = Omit<MapBounds, 'tipo'>
type MapViewHandle = { focarEm: (latitude: number, longitude: number, zoom?: number) => void }

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
const mapViewRef = ref<MapViewHandle | null>(null)
const configuracaoLocalizacaoConta = ref<UserLocationSettings | null>(null)
const localizacaoManualEmAndamento = ref(false)
const router = useRouter()
const imovelFavorito = computed(() => (
  imovelSelecionado.value !== null && favoritosIds.value.includes(imovelSelecionado.value.id)
))

const viewportAtual = ref<MapViewport | null>(null)

let debounceBusca: ReturnType<typeof setTimeout> | null = null
let buscaEmAndamento: AbortController | null = null
let buscaFavoritosId = 0
let paginaAtiva = true
let usuarioInteragiuComMapa = false
let iniciouBootstrapLocalizacao = false
let sessaoAutenticadaInicializada = false
let ultimoUsuarioLocalizacaoId: string | null = null
let revisaoSessaoLocalizacao = api.authSessionRevision()
let fluxoLocalizacaoId = 0
let promessaLocalizacaoIp: Promise<Coordinates | null> = Promise.resolve(null)
let ipLocationAbortController: AbortController | null = null

function centralizarNaLocalizacao(location: Coordinates, zoom: number): void {
  if (!paginaAtiva || usuarioInteragiuComMapa) return
  mapViewRef.value?.focarEm(location.latitude, location.longitude, zoom)
}

function centralizarExplicitamente(location: Coordinates, zoom: number): void {
  if (!paginaAtiva) return
  mapViewRef.value?.focarEm(location.latitude, location.longitude, zoom)
}

function zoomDaLocalizacaoIp(accuracyKm?: number): number {
  return zoomDaPrecisao(accuracyKm, 10, 4, 12)
}

function zoomDaPrecisao(accuracyKm: number | undefined, zoomPadrao: number, minimo: number, maximo: number): number {
  if (!accuracyKm || !Number.isFinite(accuracyKm)) return zoomPadrao
  const zoom = Math.floor(Math.log2(40_075 / (2 * accuracyKm)))
  return Math.max(minimo, Math.min(maximo, zoom))
}

function onPageInteracted(event: Event): void {
  if (event.target instanceof Element && event.target.closest('.location-control')) return
  usuarioInteragiuComMapa = true
  fluxoLocalizacaoId += 1
  localizacaoManualEmAndamento.value = false
  ipLocationAbortController?.abort()
}

function iniciarBootstrapPorIp(): Promise<Coordinates | null> {
  const controller = new AbortController()
  ipLocationAbortController = controller

  return getApproximateLocationByIp(controller.signal).then((location) => {
    if (controller.signal.aborted || !paginaAtiva || usuarioInteragiuComMapa) return null
    centralizarNaLocalizacao(location, zoomDaLocalizacaoIp(location.accuracyKm))
    return location
  }).catch(() => {
    return null
  }).finally(() => {
    if (ipLocationAbortController === controller) ipLocationAbortController = null
  })
}

function fluxoAutomaticoValido(requestId: number, userId: string | null, sessionRevision: number): boolean {
  return paginaAtiva
    && !usuarioInteragiuComMapa
    && requestId === fluxoLocalizacaoId
    && (usuario.value?.id ?? null) === userId
    && api.isAuthSessionCurrent(sessionRevision)
}

function locationSettingsIsValid(location: PreciseLocation | null): location is PreciseLocation {
  return location !== null
    && Number.isFinite(location.latitude)
    && location.latitude >= -90
    && location.latitude <= 90
    && Number.isFinite(location.longitude)
    && location.longitude >= -180
    && location.longitude <= 180
    && Number.isFinite(Date.parse(location.expiresAt))
    && Date.parse(location.expiresAt) > Date.now()
}

async function permissionIsDenied(): Promise<boolean> {
  if (!navigator.permissions?.query) return false
  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' })
    return permission.state === 'denied'
  } catch {
    return false
  }
}

function obterPosicaoDoNavegador(maximumAge = 300_000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Este navegador não oferece geolocalização.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge,
    })
  })
}

function coordenadasDaPosicao(position: GeolocationPosition): Coordinates {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyKm: position.coords.accuracy / 1_000,
  }
}

async function iniciarLocalizacaoPrecisa(
  user: AuthUser | null,
  requestId: number,
  sessionRevision: number,
): Promise<void> {
  const userId = user?.id ?? null
  if (!fluxoAutomaticoValido(requestId, userId, sessionRevision)) return

  if (user) {
    let settings: UserLocationSettings
    try {
      settings = await api.myLocationSettings(sessionRevision)
    } catch {
      return
    }
    if (!fluxoAutomaticoValido(requestId, userId, sessionRevision)) return
    configuracaoLocalizacaoConta.value = settings

    if (locationSettingsIsValid(settings.location)) {
      centralizarNaLocalizacao(settings.location, 14)
      return
    }
    if (!settings.enabled) return
  } else {
    const cached = getAnonymousPreciseLocation()
    if (cached) {
      centralizarNaLocalizacao(cached, zoomDaPrecisao(cached.accuracyKm, 14, 8, 16))
      return
    }
  }

  const positionResult = await requestPositionIfAllowed(
    permissionIsDenied,
    () => obterPosicaoDoNavegador(),
  )
  if (!fluxoAutomaticoValido(requestId, userId, sessionRevision)) return
  if (positionResult.status !== 'available') {
    return
  }

  const coordinates = coordenadasDaPosicao(positionResult.position)
  centralizarNaLocalizacao(coordinates, zoomDaPrecisao(coordinates.accuracyKm, 14, 8, 16))

  if (!user) {
    saveAnonymousPreciseLocation(coordinates)
    return
  }

  const settings = configuracaoLocalizacaoConta.value
  if (!settings?.enabled) return
  try {
    const updated = await api.refreshMyLocation({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      consentVersion: settings.consentVersion,
    }, sessionRevision)
    if (fluxoAutomaticoValido(requestId, userId, sessionRevision)) {
      configuracaoLocalizacaoConta.value = updated
    }
  } catch {
    if (fluxoAutomaticoValido(requestId, userId, sessionRevision)) {
      try {
        configuracaoLocalizacaoConta.value = await api.myLocationSettings(sessionRevision)
      } catch {
        // The IP estimate and the already centered GPS fix remain usable in this visit.
      }
    }
  }
}

async function carregarBootstrapLocalizacao(
  user: AuthUser | null,
  requestId: number,
  sessionRevision: number,
): Promise<void> {
  await runLocationStages({
    approximate: promessaLocalizacaoIp,
    isCurrent: () => fluxoAutomaticoValido(requestId, user?.id ?? null, sessionRevision),
    requestPrecise: () => iniciarLocalizacaoPrecisa(user, requestId, sessionRevision),
  })
}

async function atualizarLocalizacaoManualmente(): Promise<void> {
  if (localizacaoManualEmAndamento.value) return
  localizacaoManualEmAndamento.value = true
  usuarioInteragiuComMapa = true
  const requestId = ++fluxoLocalizacaoId
  const userId = usuario.value?.id ?? null
  const sessionRevision = revisaoSessaoLocalizacao
  if (!userId && api.hasAuthToken()) {
    localizacaoManualEmAndamento.value = false
    return
  }
  ipLocationAbortController?.abort()

  const manualFlowIsCurrent = () => paginaAtiva
    && requestId === fluxoLocalizacaoId
    && api.isAuthSessionCurrent(sessionRevision)
    && (usuario.value?.id ?? null) === userId

  try {
    await runLocationStages({
      approximate: getApproximateLocationByIp(),
      isCurrent: manualFlowIsCurrent,
      onApproximate: (estimate) => {
        centralizarExplicitamente(estimate, zoomDaLocalizacaoIp(estimate.accuracyKm))
      },
      requestPrecise: async () => {
        const position = await obterPosicaoDoNavegador(0)
        if (!manualFlowIsCurrent()) return null
        const coordinates = coordenadasDaPosicao(position)
        centralizarExplicitamente(coordinates, zoomDaPrecisao(coordinates.accuracyKm, 14, 8, 16))

        if (!userId) {
          saveAnonymousPreciseLocation(coordinates)
          return true
        }

        let settings = configuracaoLocalizacaoConta.value
        if (!settings) {
          settings = await api.myLocationSettings(sessionRevision)
          if (!manualFlowIsCurrent()) return null
          configuracaoLocalizacaoConta.value = settings
        }
        if (!settings.enabled) {
          return false
        }

        const updated = await api.refreshMyLocation({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          consentVersion: settings.consentVersion,
        }, sessionRevision)
        if (manualFlowIsCurrent()) {
          configuracaoLocalizacaoConta.value = updated
        }
        return true
      },
    })
  } finally {
    if (requestId === fluxoLocalizacaoId) localizacaoManualEmAndamento.value = false
  }
}

function atualizarPreferenciaLocalizacao(settings: UserLocationSettings): void {
  if (!api.isAuthSessionCurrent(revisaoSessaoLocalizacao) || !usuario.value) return
  configuracaoLocalizacaoConta.value = settings
  fluxoLocalizacaoId += 1
  localizacaoManualEmAndamento.value = false
  ipLocationAbortController?.abort()
  if (settings.location) {
    centralizarExplicitamente(settings.location, 14)
  }
}

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
  const usuarioId = usuarioAtual?.id ?? null
  const sessionRevision = api.authSessionRevision()
  const mudouIdentidade = !sessaoAutenticadaInicializada
    || usuarioId !== ultimoUsuarioLocalizacaoId
    || sessionRevision !== revisaoSessaoLocalizacao
  usuario.value = usuarioAtual
  if (!mudouIdentidade) return

  sessaoAutenticadaInicializada = true
  ultimoUsuarioLocalizacaoId = usuarioId
  revisaoSessaoLocalizacao = sessionRevision
  configuracaoLocalizacaoConta.value = null
  localizacaoManualEmAndamento.value = false
  favoritosIds.value = []
  const requestFavoritosId = ++buscaFavoritosId

  if (usuarioAtual) {
    void api.listFavorites().then((favoritos) => {
      if (requestFavoritosId === buscaFavoritosId && usuario.value?.id === usuarioAtual.id) {
        favoritosIds.value = favoritos.map((favorito) => favorito.id)
      }
    }).catch((error: unknown) => {
      if (requestFavoritosId === buscaFavoritosId && usuario.value?.id === usuarioAtual.id) {
        erroConexao.value = error instanceof Error ? error.message : 'Não foi possível carregar os favoritos.'
      }
    })
  }

  const requestLocationId = ++fluxoLocalizacaoId
  if (iniciouBootstrapLocalizacao && !(usuarioAtual === null && api.hasAuthToken())) {
    void carregarBootstrapLocalizacao(usuarioAtual, requestLocationId, sessionRevision)
  }
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
  paginaAtiva = false
  fluxoLocalizacaoId += 1
  localizacaoManualEmAndamento.value = false
  ipLocationAbortController?.abort()
  if (debounceBusca) clearTimeout(debounceBusca)
  buscaEmAndamento?.abort()
})

onMounted(() => {
  iniciouBootstrapLocalizacao = true
  promessaLocalizacaoIp = iniciarBootstrapPorIp()
  if (sessaoAutenticadaInicializada) {
    const requestLocationId = ++fluxoLocalizacaoId
    void carregarBootstrapLocalizacao(usuario.value, requestLocationId, revisaoSessaoLocalizacao)
  }
})
</script>

<style scoped>
.page { height: 100vh; width: 100%; position: relative; overflow: hidden; }

.location-control {
  position: fixed;
  right: 18px;
  bottom: 96px;
  z-index: 9000;
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-md);
  color: var(--primary);
  font-size: 17px;
  transition: transform 150ms ease, background 150ms ease, opacity 150ms ease;
}
.location-control:hover:not(:disabled) { transform: translateY(-1px); background: #f9fafb; }
.location-control:disabled { cursor: wait; opacity: 0.65; }
.location-control:focus-visible { outline: 3px solid rgba(0, 87, 255, 0.3); outline-offset: 2px; }

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
