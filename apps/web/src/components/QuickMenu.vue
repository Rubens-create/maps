<template>
  <div ref="menuContainer" class="quick-menu" :class="{ 'is-open': menuAberto }">
    <button
      class="quick-menu-trigger"
      type="button"
      :aria-label="menuAberto ? 'Fechar menu' : 'Abrir menu'"
      aria-controls="quick-menu-panel"
      :aria-expanded="menuAberto"
      @click.stop="alternarMenu"
    >
      <span class="quick-menu-icon" :class="{ 'is-open': menuAberto }" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
    </button>

    <div
      id="quick-menu-panel"
      class="quick-menu-panel"
      role="menu"
      aria-label="Menu principal"
      :aria-hidden="!menuAberto"
      :inert="!menuAberto"
      @click.stop
    >
      <div v-if="usuario" class="quick-menu-profile" role="group" :aria-label="`Perfil de ${primeiroNome}`">
        <span class="quick-menu-avatar" aria-hidden="true">{{ iniciais }}</span>
        <span class="quick-menu-first-name">{{ primeiroNome }}</span>
      </div>
      <div v-else-if="verificandoSessao" class="quick-menu-session-pending" role="status">
        <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
        <span>Verificando sessão...</span>
      </div>

      <button
        v-for="item in itensMenu"
        :key="item.id"
        class="quick-menu-item"
        type="button"
        role="menuitem"
        @click="selecionarItem(item)"
      >
        <i :class="['fas', item.icone]" aria-hidden="true"></i>
        <span>{{ item.label }}</span>
      </button>
    </div>

    <AccountDialog
      :aberto="contaAberta"
      :usuario="usuario"
      @fechar="contaAberta = false"
      @autenticado="receberAutenticacao"
      @sair="sairDaConta"
      @localizacao-alterada="emit('localizacaoAlterada', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { AuthUser, UserLocationSettings } from '@luxxie/types'
import { api, AUTH_SESSION_CHANGED_EVENT } from '@luxxie/api-client'
import AccountDialog from '@/components/AccountDialog.vue'

const emit = defineEmits<{
  abrirFiltros: []
  abrirFavoritos: []
  usuarioAlterado: [usuario: AuthUser | null]
  localizacaoAlterada: [settings: UserLocationSettings]
}>()

const opcoesMenu = [
  { id: 'conta', label: 'Conta', icone: 'fa-user' },
  { id: 'filtros', label: 'Filtros', icone: 'fa-sliders' },
  { id: 'favoritos', label: 'Favoritos', icone: 'fa-heart' },
  { id: 'configuracoes', label: 'Configurações', icone: 'fa-gear' },
]

const menuContainer = ref<HTMLDivElement | null>(null)
const menuAberto = ref(false)
const contaAberta = ref(false)
const usuario = ref<AuthUser | null>(null)
const verificandoSessao = ref(true)
const itensMenu = computed(() => opcoesMenu.map((item) => (
  item.id === 'conta' && usuario.value ? { ...item, label: 'Minha conta' } : item
)))
const primeiroNome = computed(() => usuario.value?.nome.trim().split(/\s+/)[0] ?? '')
const iniciais = computed(() => primeiroNome.value.slice(0, 1).toLocaleUpperCase('pt-BR'))
let userRequestId = 0

function fecharMenu(): void {
  menuAberto.value = false
}

function alternarMenu(): void {
  menuAberto.value = !menuAberto.value
  if (menuAberto.value && !verificandoSessao.value) void carregarUsuario()
}

function abrirConta(): void {
  fecharMenu()
  contaAberta.value = true
}

function selecionarItem(item: { id: string }): void {
  fecharMenu()
  if (item.id === 'conta') abrirConta()
  if (item.id === 'filtros') emit('abrirFiltros')
  if (item.id === 'favoritos') emit('abrirFavoritos')
}

function receberAutenticacao(usuarioAutenticado: AuthUser): void {
  userRequestId += 1
  usuario.value = usuarioAutenticado
  verificandoSessao.value = false
  emit('usuarioAlterado', usuarioAutenticado)
}

function sairDaConta(): void {
  userRequestId += 1
  void api.logout()
  usuario.value = null
  verificandoSessao.value = false
  contaAberta.value = false
  emit('usuarioAlterado', null)
}

async function carregarUsuario(): Promise<void> {
  const requestId = ++userRequestId
  const sessionRevision = api.authSessionRevision()
  verificandoSessao.value = true
  try {
    const currentUser = await api.currentUser()
    if (requestId !== userRequestId || !api.isAuthSessionCurrent(sessionRevision)) return
    usuario.value = currentUser
    emit('usuarioAlterado', currentUser)
  } catch {
    // Mantém o último estado conhecido quando a API estiver temporariamente indisponível.
  } finally {
    if (requestId === userRequestId) {
      if (!api.isAuthSessionCurrent(sessionRevision)) {
        usuario.value = null
        emit('usuarioAlterado', null)
      }
      verificandoSessao.value = false
    }
  }
}

function atualizarSessaoAutenticada(): void {
  userRequestId += 1
  usuario.value = null
  const hasToken = api.hasAuthToken()
  verificandoSessao.value = hasToken
  emit('usuarioAlterado', null)
  if (hasToken) void carregarUsuario()
  else verificandoSessao.value = false
}

function fecharAoClicarFora(event: PointerEvent): void {
  if (event.target instanceof Node && !menuContainer.value?.contains(event.target)) {
    fecharMenu()
  }
}

function fecharComEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') fecharMenu()
}

onMounted(() => {
  document.addEventListener('pointerdown', fecharAoClicarFora)
  document.addEventListener('keydown', fecharComEscape)
  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, atualizarSessaoAutenticada)
  void carregarUsuario()
})

onBeforeUnmount(() => {
  userRequestId += 1
  document.removeEventListener('pointerdown', fecharAoClicarFora)
  document.removeEventListener('keydown', fecharComEscape)
  window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, atualizarSessaoAutenticada)
})

defineExpose({ abrirConta })
</script>

<style scoped>
.quick-menu {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9100;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
  transition:
    width 320ms cubic-bezier(.4, 0, .2, 1),
    height 320ms cubic-bezier(.4, 0, .2, 1),
    border-radius 320ms cubic-bezier(.4, 0, .2, 1),
    box-shadow 220ms ease,
    transform 220ms ease;
}

.quick-menu.is-open {
  width: min(260px, calc(100vw - 40px));
  height: min(304px, calc(100vh - 40px));
  border-radius: 20px;
  box-shadow: 0 14px 36px rgba(17, 24, 39, 0.2);
}

.quick-menu:not(.is-open):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.quick-menu-trigger {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #111827;
  transition: color 180ms ease, background 180ms ease;
}

.quick-menu-trigger:focus-visible,
.quick-menu-item:focus-visible {
  outline: 3px solid rgba(0, 87, 255, 0.35);
  outline-offset: -4px;
}

.quick-menu-icon {
  position: relative;
  display: block;
  width: 18px;
  height: 16px;
}

.quick-menu-icon span {
  position: absolute;
  left: 0;
  width: 18px;
  height: 2px;
  border-radius: 2px;
  background: currentColor;
  transition:
    top 260ms cubic-bezier(.4, 0, .2, 1),
    transform 260ms cubic-bezier(.4, 0, .2, 1),
    opacity 160ms ease;
}

.quick-menu-icon span:nth-child(1) { top: 1px; }
.quick-menu-icon span:nth-child(2) { top: 7px; }
.quick-menu-icon span:nth-child(3) { top: 13px; }

.quick-menu-icon.is-open span:nth-child(1) {
  top: 7px;
  transform: rotate(45deg);
}

.quick-menu-icon.is-open span:nth-child(2) {
  transform: scaleX(0.2);
  opacity: 0;
}

.quick-menu-icon.is-open span:nth-child(3) {
  top: 7px;
  transform: rotate(-45deg);
}

.quick-menu-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 54px 8px 8px;
  overflow-y: auto;
  opacity: 0;
  transform: translateY(-6px);
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 140ms ease,
    transform 220ms cubic-bezier(.4, 0, .2, 1),
    visibility 0s linear 280ms;
}

.quick-menu.is-open .quick-menu-panel {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
  pointer-events: auto;
  transition:
    opacity 150ms ease 100ms,
    transform 220ms cubic-bezier(.4, 0, .2, 1) 80ms,
    visibility 0s;
}

.quick-menu-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 2px 7px;
  padding: 7px 10px;
  border-radius: 11px;
  color: #111827;
}

.quick-menu-avatar {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font: 700 14px var(--font-display);
}

.quick-menu-first-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 700;
}

.quick-menu-session-pending {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 2px 7px;
  padding: 11px 10px;
  color: #6b7280;
  font-size: 12px;
}

.quick-menu-item {
  display: flex;
  flex: 0 0 auto;
  width: 100%;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #374151;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  transition: background 160ms ease, color 160ms ease;
}

.quick-menu-item:hover {
  background: #f3f6fb;
  color: #111827;
}

.quick-menu-item i {
  width: 18px;
  color: #6b7280;
  text-align: center;
  font-size: 15px;
}

.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
  transform-origin: top right;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  transform: translateY(-5px) scale(0.97);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .quick-menu {
    transition-duration: 190ms, 190ms, 190ms, 160ms, 160ms;
  }
  .quick-menu-icon span,
  .quick-menu-panel {
    transition-duration: 160ms, 160ms, 120ms;
  }
  .quick-menu-trigger,
  .quick-menu-item { transition-duration: 160ms; }
}
</style>
