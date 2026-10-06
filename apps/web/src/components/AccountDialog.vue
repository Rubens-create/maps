<template>
  <Teleport to="body">
    <Transition name="account-modal">
      <div
        v-if="aberto"
        class="account-dialog-overlay"
        @click.self="fechar"
      >
        <section
          class="account-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-dialog-title"
        >
        <header class="account-dialog-header">
          <div>
            <p class="account-eyebrow">LUXXIE</p>
            <h2 id="account-dialog-title">
              {{ usuario ? 'Minha conta' : modo === 'login' ? 'Entrar na sua conta' : 'Criar conta' }}
            </h2>
          </div>
          <button class="account-close" type="button" aria-label="Fechar" @click="fechar">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <div v-if="usuario" class="account-dialog-body">
          <div class="account-profile">
            <span class="account-avatar" aria-hidden="true">{{ iniciais }}</span>
            <div class="account-profile-copy">
              <strong>{{ usuario.nome }}</strong>
              <span>{{ usuario.email }}</span>
            </div>
          </div>

          <p class="account-signed-in">
            <i class="fas fa-circle-check" aria-hidden="true"></i>
            Você está conectado à sua conta.
          </p>

          <button class="account-logout" type="button" @click="$emit('sair')">
            <i class="fas fa-arrow-right-from-bracket" aria-hidden="true"></i>
            Sair da conta
          </button>
        </div>

        <div v-else class="account-dialog-body">
          <p class="account-description">
            {{ modo === 'login' ? 'Entre com seus dados para acessar sua conta.' : 'Preencha os dados para criar sua conta.' }}
          </p>

          <form data-account-form @submit.prevent="enviarFormulario">
            <div v-if="modo === 'registro'" class="account-field">
              <label for="account-name">Nome completo</label>
              <input
                id="account-name"
                v-model="form.nome"
                class="account-input"
                type="text"
                name="nome"
                autocomplete="name"
                placeholder="Seu nome completo"
                minlength="2"
                maxlength="100"
                required
              />
            </div>

            <div class="account-field">
              <label for="account-email">E-mail</label>
              <input
                id="account-email"
                v-model="form.email"
                class="account-input"
                type="email"
                name="email"
                autocomplete="email"
                placeholder="voce@email.com"
                required
              />
            </div>

            <div class="account-field">
              <label for="account-password">Senha</label>
              <input
                id="account-password"
                v-model="form.senha"
                class="account-input"
                type="password"
                name="senha"
                :autocomplete="modo === 'login' ? 'current-password' : 'new-password'"
                :placeholder="modo === 'registro' ? 'No mínimo 8 caracteres' : 'Sua senha'"
                :minlength="modo === 'registro' ? 8 : undefined"
                maxlength="72"
                required
              />
            </div>

            <p v-if="erro" class="account-error" role="alert">
              <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
              {{ erro }}
            </p>

            <button class="btn-primary account-submit" type="submit" :disabled="carregando">
              <i v-if="carregando" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
              <span>{{ carregando ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta' }}</span>
            </button>
          </form>

          <p class="account-switch">
            {{ modo === 'login' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?' }}
            <button type="button" @click="alternarModo">
              {{ modo === 'login' ? 'Criar conta' : 'Entrar' }}
            </button>
          </p>
        </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { AuthUser } from '@luxxie/types'
import { ApiError, api } from '@luxxie/api-client'

const props = defineProps<{
  aberto: boolean
  usuario: AuthUser | null
}>()

const emit = defineEmits<{
  fechar: []
  autenticado: [usuario: AuthUser]
  sair: []
}>()

const modo = ref<'login' | 'registro'>('login')
const carregando = ref(false)
const erro = ref('')
const form = reactive({ nome: '', email: '', senha: '' })
const iniciais = computed(() => props.usuario?.nome.trim().slice(0, 1).toLocaleUpperCase('pt-BR') ?? '')

watch(() => props.aberto, (aberto) => {
  if (!aberto) return
  modo.value = 'login'
  erro.value = ''
  carregando.value = false
})

function fechar(): void {
  if (!carregando.value) emit('fechar')
}

function alternarModo(): void {
  modo.value = modo.value === 'login' ? 'registro' : 'login'
  erro.value = ''
  form.senha = ''
}

async function enviarFormulario(): Promise<void> {
  erro.value = ''
  carregando.value = true

  try {
    const usuario = modo.value === 'registro'
      ? await api.register({ nome: form.nome, email: form.email, senha: form.senha })
      : await api.login({ email: form.email, senha: form.senha })

    emit('autenticado', usuario)
    emit('fechar')
    form.nome = ''
    form.email = ''
    form.senha = ''
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      erro.value = 'Este e-mail já está cadastrado.'
    } else if (error instanceof ApiError && error.status === 401) {
      erro.value = 'E-mail ou senha incorretos.'
    } else {
      erro.value = error instanceof Error ? error.message : 'Não foi possível acessar sua conta.'
    }
  } finally {
    carregando.value = false
  }
}

function fecharComEscape(event: KeyboardEvent): void {
  if (props.aberto && event.key === 'Escape') fechar()
}

onMounted(() => document.addEventListener('keydown', fecharComEscape))
onBeforeUnmount(() => document.removeEventListener('keydown', fecharComEscape))
</script>

<style scoped>
.account-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(17, 24, 39, 0.48);
  backdrop-filter: blur(4px);
}

.account-dialog {
  width: min(100%, 420px);
  max-height: min(90vh, 680px);
  overflow-y: auto;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 24px 64px rgba(17, 24, 39, 0.24);
}

.account-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--border);
}

.account-eyebrow {
  margin-bottom: 4px;
  color: var(--primary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.account-dialog-header h2 {
  color: var(--text-dark);
  font-size: 21px;
  font-weight: 700;
}

.account-close {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--bg);
  color: var(--text-mid);
}

.account-close:hover { background: var(--border); color: var(--text-dark); }

.account-dialog-body { padding: 22px 24px 24px; }

.account-description {
  margin-bottom: 20px;
  color: var(--text-mid);
  font-size: 14px;
  line-height: 1.5;
}

.account-field { margin-bottom: 16px; }
.account-field label {
  display: block;
  margin-bottom: 7px;
  color: var(--text-mid);
  font-size: 12px;
  font-weight: 700;
}

.account-input {
  width: 100%;
  min-height: 46px;
  padding: 11px 13px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: #fff;
  color: var(--text-dark);
  font: 500 14px var(--font-sans);
}

.account-input:focus {
  border-color: var(--primary);
  outline: 3px solid rgba(0, 87, 255, 0.12);
}

.account-submit {
  min-height: 48px;
  margin-top: 4px;
  padding: 13px 18px;
  font-size: 14px;
}

.account-submit:disabled { cursor: wait; opacity: 0.7; }

.account-switch {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin-top: 20px;
  color: var(--text-mid);
  font-size: 13px;
}

.account-switch button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--primary);
  font-size: inherit;
  font-weight: 700;
}

.account-switch button:hover { text-decoration: underline; }

.account-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 0 14px;
  padding: 11px 12px;
  border: 1px solid #fca5a5;
  border-radius: 10px;
  background: #fff1f1;
  color: #b91c1c;
  font-size: 13px;
  line-height: 1.4;
}

.account-error i { margin-top: 2px; }

.account-profile {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 8px 0 18px;
}

.account-avatar {
  display: grid;
  width: 50px;
  height: 50px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font: 700 20px var(--font-display);
}

.account-profile-copy { min-width: 0; }
.account-profile-copy strong,
.account-profile-copy span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-profile-copy strong { color: var(--text-dark); font-size: 15px; }
.account-profile-copy span { margin-top: 4px; color: var(--text-mid); font-size: 13px; }

.account-signed-in {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 18px;
  padding: 11px 12px;
  border: 1px solid #bbf7d0;
  border-radius: 11px;
  background: #f0fdf4;
  color: #15803d;
  font-size: 13px;
  font-weight: 600;
}

.account-logout {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: #fff;
  color: #b91c1c;
  font-size: 14px;
  font-weight: 700;
}

.account-logout:hover { background: #fff1f1; border-color: #fca5a5; }
.account-close:focus-visible,
.account-submit:focus-visible,
.account-switch button:focus-visible,
.account-logout:focus-visible {
  outline: 3px solid rgba(0, 87, 255, 0.28);
  outline-offset: 2px;
}

.account-modal-enter-active,
.account-modal-leave-active { transition: opacity 160ms ease; }
.account-modal-enter-active .account-dialog,
.account-modal-leave-active .account-dialog { transition: transform 160ms ease; }
.account-modal-enter-from,
.account-modal-leave-to { opacity: 0; }
.account-modal-enter-from .account-dialog,
.account-modal-leave-to .account-dialog { transform: translateY(8px) scale(0.98); }

@media (prefers-reduced-motion: reduce) {
  .account-modal-enter-active,
  .account-modal-leave-active,
  .account-modal-enter-active .account-dialog,
  .account-modal-leave-active .account-dialog { transition: none; }
}
</style>
