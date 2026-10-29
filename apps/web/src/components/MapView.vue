<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import L from 'leaflet'
import type { MapBounds, MapResultItem, PropertyMapItem } from '@luxxie/types'

// Fix para ícones do Leaflet com Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete (L.Icon.Default.prototype as typeof L.Icon.Default.prototype & { _getIconUrl?: () => string })._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

type MapViewport = Omit<MapBounds, 'tipo'>

const props = defineProps<{ items: MapResultItem[] }>()
const emit = defineEmits<{
  selecionar: [imovel: PropertyMapItem]
  viewportChange: [viewport: MapViewport]
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let markersLayer: L.LayerGroup | null = null

onMounted(() => {
  if (!mapContainer.value) return
  map = L.map(mapContainer.value, { zoomControl: false }).setView([-15.793889, -47.882778], 4)

  // OpenStreetMap — 100% gratuito e legal
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map)

  markersLayer = L.layerGroup().addTo(map)
  map.on('moveend', emitirViewport)
  desenharPinos(props.items)
  emitirViewport()
})

watch(() => props.items, (novaLista: MapResultItem[]) => {
  desenharPinos(novaLista)
}, { deep: true })

function emitirViewport(): void {
  if (!map) return
  const bounds = map.getBounds()
  emit('viewportChange', {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
    zoom: map.getZoom(),
  })
}

function desenharPinos(lista: MapResultItem[]): void {
  const layer = markersLayer
  const currentMap = map
  if (!layer || !currentMap) return
  layer.clearLayers()
  lista.forEach((item: MapResultItem) => {
    const latitude = item.kind === 'property' ? item.property.latitude : item.latitude
    const longitude = item.kind === 'property' ? item.property.longitude : item.longitude
    const html = item.kind === 'property'
      ? `<div class="pin-preco" data-tipo="${item.property.tipo}">${formatarPrecoPin(item.property.preco)}</div>`
      : `<div class="pin-cluster"><span>${item.count.toLocaleString('pt-BR')}</span></div>`
    const icone = L.divIcon({
      className: item.kind === 'property' ? 'pin-preco-marker' : '',
      html,
      iconAnchor: [0, 36]
    })

    const marker = L.marker([latitude, longitude], { icon: icone })
    marker.on('click', () => {
      if (item.kind === 'cluster') {
        currentMap.setView([item.latitude, item.longitude], Math.min(currentMap.getZoom() + 2, 19))
      } else {
        emit('selecionar', item.property)
      }
    })
    layer.addLayer(marker)
  })
}

function formatarPrecoPin(valor: number): string {
  if (!valor) return '—'
  if (valor >= 1000000) return 'R$' + (valor / 1000000).toFixed(1).replace('.', ',') + 'M'
  if (valor >= 1000) return 'R$' + Math.round(valor / 1000) + 'k'
  return 'R$' + valor
}

// Expor método para focar num ponto após publicar
function focarEm(lat: number, lng: number, zoom = 15): void {
  map?.setView([lat, lng], zoom)
}

defineExpose({ focarEm })
</script>

<style>
/* Estilos globais dos pins (não scoped pois são injetados pelo Leaflet) */
.pin-preco-marker {
  width: max-content !important;
  height: max-content !important;
}
.pin-preco {
  display: inline-block;
  width: max-content;
  background: white;
  color: #111827;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 100px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  white-space: nowrap;
  border: 2px solid white;
  cursor: pointer;
  transition: all 0.2s;
  transform: translateX(-50%);
  position: relative;
}
.pin-preco::after {
  content: '';
  position: absolute;
  bottom: -7px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 7px solid white;
}
.pin-preco[data-tipo="Venda"] { background: #0057FF; color: white; border-color: #0057FF; }
.pin-preco[data-tipo="Venda"]::after { border-top-color: #0057FF; }
.pin-preco[data-tipo="Aluguel"] { background: #00C853; color: white; border-color: #00C853; }
.pin-preco[data-tipo="Aluguel"]::after { border-top-color: #00C853; }
.pin-preco:hover { transform: translateX(-50%) scale(1.1); z-index: 9999 !important; }

.pin-cluster {
  min-width: 38px;
  height: 38px;
  padding: 0 8px;
  border: 2px solid white;
  border-radius: 100px;
  background: #111827;
  color: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.24);
  display: flex;
  align-items: center;
  justify-content: center;
  font: 500 12px var(--font-mono);
  cursor: pointer;
  white-space: nowrap;
}

.map-container { height: 100%; width: 100%; z-index: 1; }
</style>
