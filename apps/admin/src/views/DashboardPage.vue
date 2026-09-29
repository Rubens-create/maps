<template>
  <div class="dashboard-page">
    <header class="dash-header">
      <div class="header-content">
        <a class="btn-back" :href="webUrl">
          <i class="fas fa-map-marked-alt"></i> Ver anúncios públicos
        </a>
        <div class="user-info" v-if="user">
          <div class="avatar">{{ iniciais }}</div>
          <div>
            <h2 class="user-name">{{ user.nome || 'Anunciante' }}</h2>
            <p class="user-email">{{ user.email }}</p>
          </div>
        </div>
        <button v-if="user" class="btn-logout" @click="sair">
          <i class="fas fa-sign-out-alt"></i> Sair
        </button>
        <button v-else class="btn-logout" @click="authAberto = true">
          <i class="fas fa-sign-in-alt"></i> Entrar
        </button>
      </div>
    </header>

    <main class="dash-main">
      <div class="dash-topo">
        <div>
          <h1>Meus Anúncios</h1>
          <p>Gerencie os imóveis que você publicou no Luxxie.</p>
        </div>
        <button class="btn-primary btn-new-listing" :disabled="!user" @click="abrirFormulario">
          <i class="fas fa-plus"></i> Novo anúncio
        </button>
      </div>

      <div v-if="carregando" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i> Carregando seus anúncios...
      </div>

      <div v-else-if="erro" class="error-state">
        <i class="fas fa-triangle-exclamation" aria-hidden="true"></i> {{ erro }}
      </div>

      <div v-else-if="!user" class="empty-state">
        <i class="fas fa-user-lock"></i>
        <h3>Acesse sua conta</h3>
        <p>Entre ou crie uma conta para publicar e gerenciar seus imóveis.</p>
        <button class="btn-primary" style="max-width:220px; margin:20px auto 0;" @click="authAberto = true">
          Entrar ou criar conta
        </button>
      </div>

      <div v-else-if="imoveis.length === 0" class="empty-state">
        <i class="fas fa-home"></i>
        <h3>Você ainda não tem anúncios</h3>
        <p>Publique seu primeiro imóvel para ele aparecer no mapa do Luxxie.</p>
        <button class="btn-primary" style="max-width:220px; margin:20px auto 0;" @click="abrirFormulario">
          Publicar meu primeiro anúncio
        </button>
      </div>

      <div v-else class="imoveis-grid">
        <div v-for="imovel in imoveis" :key="imovel.id" class="imovel-card">
          <div class="card-img" :style="{ backgroundImage: `url(${imovel.foto_capa || 'https://placehold.co/400x200?text=Sem+foto'})` }">
            <span class="badge" :class="imovel.tipo === 'Venda' ? 'badge-venda' : 'badge-aluguel'">
              {{ imovel.tipo }}
            </span>
          </div>
          <div class="card-body">
            <h3 class="card-title">{{ imovel.titulo }}</h3>
            <p class="card-price">{{ formatarPreco(imovel.preco, imovel.tipo) }}</p>
            <p class="card-stats">
              {{ imovel.quartos }}q • {{ imovel.banheiros }}b • {{ imovel.area }}m²
            </p>
          </div>
          <div class="card-footer">
            <button class="btn-action btn-edit" @click="editar(imovel)" disabled>
              <i class="fas fa-edit"></i> Editar (Em breve)
            </button>
            <button class="btn-action btn-delete" @click="excluir(imovel.id)">
              <i class="fas fa-trash"></i> Excluir
            </button>
          </div>
        </div>
      </div>
    </main>
    <AuthModal :aberto="authAberto" @fechar="authAberto = false" @sucesso="onAuthSuccess" />
    <ListingForm :aberto="formAberto" @fechar="formAberto = false" @publicado="onPublicado" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { AuthUser, Property, PropertyType } from '@luxxie/types'
import { api } from '@luxxie/api-client'
import AuthModal from '@/components/AuthModal.vue'
import ListingForm from '@/components/ListingForm.vue'

const webUrl = import.meta.env.VITE_WEB_URL || 'http://localhost:8081'
const user = ref<AuthUser | null>(null)
const imoveis = ref<Property[]>([])
const carregando = ref(true)
const erro = ref('')
const authAberto = ref(false)
const formAberto = ref(false)

const iniciais = computed(() => {
  if (!user.value) return 'U'
  const nome = user.value.nome || user.value.email || 'U'
  return nome.substring(0, 2).toUpperCase()
})

async function checarSessao() {
  try {
    user.value = await api.currentUser()
  } catch (error) {
    erro.value = error instanceof Error ? error.message : 'Erro ao verificar a sessão.'
  }
  if (!user.value) {
    carregando.value = false
    authAberto.value = true
    return
  }
  await carregarOp()
}

async function carregarOp() {
  carregando.value = true
  try {
    imoveis.value = await api.myProperties()
  } catch (error) {
    erro.value = error instanceof Error ? error.message : 'Erro ao carregar anúncios.'
  } finally {
    carregando.value = false
  }
}

async function excluir(id: number): Promise<void> {
  if (!confirm('Tem certeza que deseja excluir permanentemente este anúncio?')) return

  try {
    await api.deleteProperty(id)
    imoveis.value = imoveis.value.filter(i => i.id !== id)
  } catch (error) {
    alert(error instanceof Error ? `Erro ao excluir: ${error.message}` : 'Erro ao excluir o anúncio.')
  }
}

function editar(_imovel: Property): void {
  alert('A edição de imóveis será desenvolvida na Fase 5!')
}

function abrirFormulario(): void {
  if (user.value) formAberto.value = true
  else authAberto.value = true
}

function onAuthSuccess(usuario: AuthUser): void {
  user.value = usuario
  authAberto.value = false
  void carregarOp()
}

function onPublicado(_coords: { lat: number; lng: number }): void {
  formAberto.value = false
  void carregarOp()
}

function sair(): void {
  api.logout()
  user.value = null
  imoveis.value = []
  authAberto.value = true
}

function formatarPreco(valor: number, tipo: PropertyType): string {
  if (!valor) return '—'
  const f = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  return tipo === 'Aluguel' ? f.format(valor) + '/mês' : f.format(valor)
}

onMounted(checarSessao)
</script>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 60px;
}

.dash-header {
  background: white;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1000px;
  margin: 0 auto;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.btn-back, .btn-logout {
  background: transparent;
  border: 1px solid var(--border);
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-mid);
  transition: var(--transition);
}
.btn-back:hover { background: var(--border); color: var(--text-dark); }
.btn-logout:hover { background: #fff1f1; border-color: #fca5a5; color: var(--danger); }
.btn-back { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; }

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  background: var(--primary);
  color: white;
  width: 42px; height: 42px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 16px;
}
.user-name { font-size: 15px; font-weight: 700; color: var(--text-dark); margin: 0; }
.user-email { font-size: 13px; color: var(--text-light); margin: 0; }

.dash-main {
  max-width: 1000px;
  margin: 40px auto;
  padding: 0 20px;
}

.dash-topo { margin-bottom: 30px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.dash-topo h1 { font-size: 24px; color: var(--text-dark); margin-bottom: 6px; }
.dash-topo p { color: var(--text-mid); font-size: 15px; }
.btn-new-listing { width: auto; white-space: nowrap; }

.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: var(--radius-md);
  border: 1px dashed var(--border);
}
.loading-state { color: var(--primary); font-weight: 600; }
.error-state { color: var(--danger); background: #fff1f1; border-color: #fca5a5; }
.empty-state i { font-size: 48px; color: var(--border); margin-bottom: 16px; }
.empty-state h3 { font-size: 18px; margin-bottom: 8px; }
.empty-state p { color: var(--text-mid); font-size: 14px; }

.imoveis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.imovel-card {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  border: 1px solid var(--border);
  display: flex; flex-direction: column;
}

.card-img {
  height: 160px;
  background-size: cover;
  background-position: center;
  position: relative;
}
.badge {
  position: absolute; top: 12px; left: 12px;
  color: white; font-size: 11px; font-weight: 700;
  padding: 4px 10px; border-radius: 100px; text-transform: uppercase;
}
.badge-venda { background: var(--primary); }
.badge-aluguel { background: var(--success); }

.card-body { padding: 16px; flex: 1; }
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; line-height: 1.4; color: var(--text-dark); }
.card-price { font-size: 18px; font-weight: 500; color: var(--text-dark); margin-bottom: 8px; }
.card-stats { font-size: 13px; color: var(--text-mid); }

.card-footer {
  padding: 12px 16px;
  background: var(--bg);
  border-top: 1px solid var(--border);
  display: flex; gap: 8px;
}
.btn-action {
  flex: 1; border: none; padding: 8px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s;
}
.btn-edit { background: white; color: var(--text-dark); border: 1px solid var(--border); }
.btn-edit:not(:disabled):hover { border-color: var(--primary); color: var(--primary); }
.btn-delete { background: #fff1f1; color: var(--danger); border: 1px solid transparent; }
.btn-delete:hover { background: var(--danger); color: white; }
.btn-edit:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 600px) {
  .dash-topo { align-items: stretch; flex-direction: column; }
  .btn-new-listing { width: 100%; }
}
</style>
