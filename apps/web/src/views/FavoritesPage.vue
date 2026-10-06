<template>
  <main class="favorites-page">
    <header class="favorites-header">
      <RouterLink to="/" class="favorites-back">
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
        <span>Voltar ao mapa</span>
      </RouterLink>
      <div class="favorites-heading">
        <p class="favorites-eyebrow">LUXXIE</p>
        <h1>Imóveis favoritos</h1>
      </div>
      <span class="favorites-count" v-if="!carregando && !loginNecessario">
        {{ imoveis.length }} {{ imoveis.length === 1 ? 'imóvel' : 'imóveis' }}
      </span>
    </header>

    <p v-if="carregando" class="favorites-state" role="status">
      <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
      Carregando seus favoritos...
    </p>

    <section v-else-if="erro" class="favorites-state favorites-error" role="alert">
      <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
      <span>{{ erro }}</span>
      <button type="button" @click="carregarFavoritos">Tentar novamente</button>
    </section>

    <section v-else-if="loginNecessario" class="favorites-empty">
      <span class="favorites-empty-icon"><i class="far fa-heart" aria-hidden="true"></i></span>
      <h2>Entre na sua conta para ver seus favoritos</h2>
      <p>Seus imóveis salvos ficam disponíveis aqui.</p>
      <RouterLink to="/" class="btn-primary favorites-return">Voltar ao mapa</RouterLink>
    </section>

    <section v-else-if="imoveis.length === 0" class="favorites-empty">
      <span class="favorites-empty-icon"><i class="far fa-heart" aria-hidden="true"></i></span>
      <h2>Nenhum imóvel favoritado ainda</h2>
      <p>Toque no coração de um imóvel para salvá-lo nesta lista.</p>
      <RouterLink to="/" class="btn-primary favorites-return">Explorar imóveis</RouterLink>
    </section>

    <section v-else class="favorites-list" aria-label="Lista de imóveis favoritos">
      <article v-for="imovel in imoveis" :key="imovel.id" class="favorite-card">
        <img
          class="favorite-photo"
          :src="imovel.foto_capa || 'https://placehold.co/520x240?text=Sem+foto'"
          :alt="imovel.titulo"
        />
        <div class="favorite-details">
          <div class="favorite-card-top">
            <span class="favorite-type">{{ imovel.tipo }}</span>
            <button
              class="favorite-remove"
              type="button"
              :aria-label="`Remover ${imovel.titulo} dos favoritos`"
              :disabled="removendoId === imovel.id"
              @click="removerFavorito(imovel)"
            >
              <i v-if="removendoId === imovel.id" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
              <i v-else class="fas fa-heart" aria-hidden="true"></i>
            </button>
          </div>
          <h2>{{ imovel.titulo }}</h2>
          <p class="favorite-location">{{ localizacao(imovel) }}</p>
          <p class="favorite-price">{{ formatarPreco(imovel.preco, imovel.tipo) }}</p>
          <div class="favorite-features">
            <span v-if="imovel.quartos !== null"><i class="fas fa-bed" aria-hidden="true"></i>{{ imovel.quartos }} quartos</span>
            <span v-if="imovel.banheiros !== null"><i class="fas fa-bath" aria-hidden="true"></i>{{ imovel.banheiros }} banheiros</span>
            <span v-if="imovel.area"><i class="fas fa-ruler-combined" aria-hidden="true"></i>{{ imovel.area }} m²</span>
            <span><i class="fas fa-paw" aria-hidden="true"></i>{{ imovel.aceita_pet ? 'Aceita pet' : 'Não aceita pet' }}</span>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Property, PropertyType } from '@luxxie/types'
import { api } from '@luxxie/api-client'

const imoveis = ref<Property[]>([])
const carregando = ref(true)
const loginNecessario = ref(false)
const erro = ref('')
const removendoId = ref<number | null>(null)

async function carregarFavoritos(): Promise<void> {
  carregando.value = true
  loginNecessario.value = false
  erro.value = ''

  try {
    const usuario = await api.currentUser()
    if (!usuario) {
      loginNecessario.value = true
      return
    }
    imoveis.value = await api.listFavorites()
  } catch (error) {
    erro.value = error instanceof Error ? error.message : 'Não foi possível carregar os favoritos.'
  } finally {
    carregando.value = false
  }
}

async function removerFavorito(imovel: Property): Promise<void> {
  if (removendoId.value !== null) return
  removendoId.value = imovel.id
  erro.value = ''

  try {
    await api.removeFavorite(imovel.id)
    imoveis.value = imoveis.value.filter((item) => item.id !== imovel.id)
  } catch (error) {
    erro.value = error instanceof Error ? error.message : 'Não foi possível remover este favorito.'
  } finally {
    removendoId.value = null
  }
}

function localizacao(imovel: Property): string {
  return [imovel.bairro, imovel.cidade, imovel.estado].filter(Boolean).join(', ') || 'Localização não informada'
}

function formatarPreco(valor: number, tipo: PropertyType): string {
  const formatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor)
  return tipo === 'Aluguel' ? `${formatado}/mês` : formatado
}

onMounted(() => void carregarFavoritos())
</script>

<style scoped>
.favorites-page {
  height: 100vh;
  overflow-y: auto;
  padding: 24px 24px 48px;
  background: var(--bg);
  color: var(--text-dark);
}

.favorites-header,
.favorites-list,
.favorites-empty,
.favorites-state {
  width: min(100%, 1040px);
  margin-right: auto;
  margin-left: auto;
}

.favorites-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}

.favorites-back {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 9px;
  color: var(--text-mid);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.favorites-back:hover { color: var(--primary); }
.favorites-heading { text-align: center; }
.favorites-eyebrow {
  margin-bottom: 4px;
  color: var(--primary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.favorites-heading h1 { font-size: 24px; font-weight: 700; }

.favorites-count {
  justify-self: end;
  padding: 8px 12px;
  border-radius: 100px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.favorites-list { display: grid; gap: 14px; }

.favorite-card {
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
  min-height: 190px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: #fff;
  box-shadow: var(--shadow-sm);
}

.favorite-photo {
  width: 100%;
  height: 100%;
  min-height: 190px;
  object-fit: cover;
  background: #e5e7eb;
}

.favorite-details { min-width: 0; padding: 18px 20px; }
.favorite-card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.favorite-type {
  padding: 5px 10px;
  border-radius: 100px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.favorite-remove {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #fff1f1;
  color: #dc2626;
  transition: background 160ms ease, transform 160ms ease;
}

.favorite-remove:hover:not(:disabled) { transform: scale(1.06); background: #fee2e2; }
.favorite-remove:disabled { cursor: wait; opacity: 0.65; }
.favorite-details h2 { margin-top: 4px; font-size: 18px; font-weight: 700; }
.favorite-location { margin-top: 4px; color: var(--text-mid); font-size: 13px; }
.favorite-price { margin-top: 9px; color: var(--primary); font-size: 18px; font-weight: 700; }
.favorite-features { display: flex; flex-wrap: wrap; gap: 7px 14px; margin-top: 12px; }
.favorite-features span { display: inline-flex; align-items: center; gap: 5px; color: var(--text-mid); font-size: 12px; }
.favorite-features i { color: var(--primary); }

.favorites-state,
.favorites-empty {
  display: flex;
  min-height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 20px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: #fff;
  color: var(--text-mid);
  text-align: center;
}

.favorites-empty-icon {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 22px;
}

.favorites-empty h2 { color: var(--text-dark); font-size: 18px; }
.favorites-empty p { max-width: 360px; font-size: 14px; line-height: 1.5; }
.favorites-return { width: auto; margin-top: 4px; padding: 12px 18px; font-size: 13px; }
.favorites-error { color: #b91c1c; }
.favorites-error button { border: 0; background: none; color: var(--primary); font-weight: 700; }

.favorites-back:focus-visible,
.favorite-remove:focus-visible,
.favorites-error button:focus-visible {
  outline: 3px solid rgba(0, 87, 255, 0.28);
  outline-offset: 3px;
}

@media (max-width: 680px) {
  .favorites-page { padding: 18px 14px 32px; }
  .favorites-header { grid-template-columns: auto 1fr; gap: 12px; margin-bottom: 20px; }
  .favorites-heading { grid-column: 1 / -1; grid-row: 1; padding-top: 10px; }
  .favorites-back { grid-column: 1; grid-row: 2; }
  .favorites-count { grid-column: 2; grid-row: 2; }
  .favorite-card { grid-template-columns: 1fr; }
  .favorite-photo { height: 190px; min-height: 190px; }
  .favorite-details { padding: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .favorite-remove { transition-duration: 100ms; }
}
</style>
