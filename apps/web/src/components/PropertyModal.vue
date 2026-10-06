<template>
  <div class="modal-overlay" :class="{ open: imovel }" @click.self="$emit('fechar')">
    <div class="modal-card" v-if="imovel">
      <!-- Galeria -->
      <div class="modal-gallery">
        <img :src="imovel.foto_capa || 'https://placehold.co/520x240?text=Sem+foto'" class="main-photo" :alt="imovel.titulo" />
        <div class="gallery-overlay">
          <span class="badge-tipo">{{ imovel.tipo }}</span>
        </div>
        <button class="close-btn gallery-close" @click="$emit('fechar')">×</button>
        <button
          class="close-btn gallery-favorite"
          :class="{ 'is-favorite': favorito }"
          type="button"
          :aria-label="favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'"
          :aria-pressed="favorito"
          :disabled="carregandoFavorito"
          @click="alternarFavorito"
        >
          <i v-if="carregandoFavorito" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
          <i v-else :class="favorito ? 'fas fa-heart' : 'far fa-heart'" aria-hidden="true"></i>
        </button>
      </div>

      <!-- Informações -->
      <div class="modal-body">
        <h2 class="prop-title">{{ imovel.titulo }}</h2>
        <p class="prop-price">{{ formatarPreco(imovel.preco, imovel.tipo) }}</p>

        <!-- Features -->
        <div class="features">
          <div class="feature-item" v-if="imovel.quartos">
            <i class="fas fa-bed"></i>
            <span>{{ imovel.quartos }} quarto{{ imovel.quartos > 1 ? 's' : '' }}</span>
          </div>
          <div class="feature-item" v-if="imovel.banheiros">
            <i class="fas fa-bath"></i>
            <span>{{ imovel.banheiros }} banheiro{{ imovel.banheiros > 1 ? 's' : '' }}</span>
          </div>
          <div class="feature-item" v-if="imovel.area">
            <i class="fas fa-ruler-combined"></i>
            <span>{{ imovel.area }} m²</span>
          </div>
          <div class="feature-item" :class="imovel.aceita_pet ? 'pet-ok' : 'pet-no'">
            <i class="fas fa-paw"></i>
            <span>{{ imovel.aceita_pet ? 'Aceita pet' : 'Sem pet' }}</span>
          </div>
        </div>

        <!-- Descrição -->
        <p class="prop-desc" v-if="imovel.descricao">{{ imovel.descricao }}</p>

        <!-- Botão -->
        <a
          :href="whatsappLink"
          target="_blank"
          rel="noopener"
          class="btn-whatsapp"
        >
          <i class="fab fa-whatsapp" style="font-size:20px;"></i>
          Contatar via WhatsApp
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Property, PropertyType } from '@luxxie/types'

const props = defineProps<{
  imovel: Property | null
  autenticado: boolean
  favorito: boolean
  carregandoFavorito: boolean
}>()
const emit = defineEmits<{
  fechar: []
  alternarFavorito: [id: number]
  solicitarLogin: []
}>()

function alternarFavorito(): void {
  if (!props.imovel || props.carregandoFavorito) return
  if (!props.autenticado) {
    emit('solicitarLogin')
    return
  }
  emit('alternarFavorito', props.imovel.id)
}

function formatarPreco(valor: number | null, tipo: PropertyType): string {
  if (!valor) return '—'
  const f = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  return tipo === 'Aluguel' ? f.format(valor) + '/mês' : f.format(valor)
}

const whatsappLink = computed(() => {
  const imovel = props.imovel
  if (!imovel) return '#'
  const tel = imovel.whatsapp || ''
  const msg = encodeURIComponent(`Olá! Vi o anúncio "${imovel.titulo}" no Luxxie e gostaria de mais informações.`)
  return tel ? `https://wa.me/55${tel.replace(/\D/g,'')}?text=${msg}` : `https://wa.me/?text=${msg}`
})
</script>

<style scoped>
.modal-gallery {
  height: 42vh;
  min-height: 200px;
  background: #111;
  position: relative;
  flex-shrink: 0;
}
.main-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.gallery-overlay {
  position: absolute;
  bottom: 12px;
  left: 16px;
}
.badge-tipo {
  background: rgba(0,0,0,0.55);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 100px;
  backdrop-filter: blur(6px);
}
.gallery-close {
  position: absolute;
  top: 12px;
  right: 12px;
}
.gallery-favorite {
  position: absolute;
  top: 12px;
  left: 12px;
}
.gallery-favorite.is-favorite { color: #dc2626; }
.gallery-favorite:disabled { cursor: wait; opacity: 0.75; }

.prop-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: 6px;
  line-height: 1.3;
}
.prop-price {
  font-size: 24px;
  font-weight: 500;
  color: var(--primary);
  margin-bottom: 16px;
}
.features {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-mid);
  background: var(--bg);
  padding: 6px 12px;
  border-radius: 100px;
}
.feature-item i { color: var(--primary); font-size: 13px; }
.pet-ok { background: var(--success-light); color: #15803d; }
.pet-ok i { color: #15803d; }
.pet-no { background: #fff1f1; color: #b91c1c; }
.pet-no i { color: #b91c1c; }

.prop-desc {
  font-size: 14px;
  color: var(--text-mid);
  line-height: 1.6;
  margin-bottom: 20px;
}
</style>
