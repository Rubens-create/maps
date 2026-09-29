<template>
  <div class="modal-overlay" :class="{ open: aberto }" @click.self="$emit('fechar')">
    <div class="modal-card auth-card">
      <div class="modal-header">
        <h2>{{ modo === 'login' ? 'Entrar no Luxxie' : 'Criar Conta' }}</h2>
        <button class="close-btn" @click="$emit('fechar')">×</button>
      </div>

      <div class="modal-body">
        <p class="auth-subtitle">
          {{ modo === 'login' ? 'Bem-vindo de volta! Acesse sua conta para gerenciar anúncios.' : 'Junte-se ao Luxxie e anuncie seus imóveis para milhares de pessoas.' }}
        </p>

        <!-- Formulário -->
        <form @submit.prevent="submitAuth">

          <div v-if="modo === 'registro'" class="form-group">
            <label class="form-label">Nome e Sobrenome</label>
            <input v-model="form.nome" type="text" class="form-input" placeholder="Seu nome completo" required />
          </div>

          <div class="form-group">
            <label class="form-label">E-mail</label>
            <input v-model="form.email" type="email" class="form-input" placeholder="exemplo@email.com" required />
          </div>

          <div class="form-group">
            <label class="form-label">Senha</label>
            <input v-model="form.senha" type="password" class="form-input" placeholder="No mínimo 8 caracteres" required minlength="8" />
          </div>

          <div v-if="erro" class="erro-box"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i> {{ erro }}</div>
          <div v-if="sucesso" class="sucesso-box"><i class="fas fa-circle-check" aria-hidden="true"></i> {{ sucesso }}</div>

          <button type="submit" class="btn-primary auth-btn" :disabled="carregando">
            <i v-if="carregando" class="fas fa-spinner fa-spin"></i>
            <span v-else>{{ modo === 'login' ? 'Entrar' : 'Criar Conta' }}</span>
          </button>
        </form>

        <!-- Toggle Modo -->
        <div class="auth-footer">
          <p v-if="modo === 'login'">
            Ainda não tem conta? <a href="#" @click.prevent="modo = 'registro'">Criar agora</a>
          </p>
          <p v-else>
            Já tem uma conta? <a href="#" @click.prevent="modo = 'login'">Entrar</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { AuthUser } from '@luxxie/types'
import { ApiError, api } from '@luxxie/api-client'

const props = defineProps<{ aberto: boolean }>()
const emit = defineEmits<{
  fechar: []
  sucesso: [usuario: AuthUser]
}>()

const modo = ref<'login' | 'registro'>('login')
const carregando = ref(false)
const erro = ref('')
const sucesso = ref('')

const form = reactive({
  nome: '',
  email: '',
  senha: ''
})

// Reseta o estado quando abre/fecha o modal ou troca de aba
watch([() => props.aberto, modo], () => {
  erro.value = ''
  sucesso.value = ''
  carregando.value = false
})

async function submitAuth(): Promise<void> {
  erro.value = ''
  sucesso.value = ''
  carregando.value = true

  try {
    const usuario = modo.value === 'registro'
      ? await api.register({ nome: form.nome, email: form.email, senha: form.senha })
      : await api.login({ email: form.email, senha: form.senha })

    if (modo.value === 'registro') {
      sucesso.value = 'Conta criada com sucesso! Entrando...'
      setTimeout(() => concluirAuth(usuario), 800)
    } else {
      concluirAuth(usuario)
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) erro.value = 'Este e-mail já está em uso.'
    else if (error instanceof ApiError && error.status === 401) erro.value = 'E-mail ou senha incorretos.'
    else erro.value = error instanceof Error ? error.message : 'Não foi possível autenticar.'
  } finally {
    carregando.value = false
  }
}

function concluirAuth(usuario: AuthUser): void {
  emit('sucesso', usuario)
  emit('fechar')
  reset()
}

function reset(): void {
  form.email = ''
  form.senha = ''
  form.nome = ''
  erro.value = ''
  sucesso.value = ''
  modo.value = 'login'
}
</script>

<style scoped>
.auth-card {
  max-width: 400px; /* Mais estreito que o de anúncio */
}

.auth-subtitle {
  color: var(--text-mid);
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 24px;
}

.auth-btn {
  margin-top: 12px;
  padding: 16px;
  font-size: 16px;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  font-size: 14px;
  color: var(--text-mid);
}

.auth-footer a {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
}
.auth-footer a:hover {
  text-decoration: underline;
}

.erro-box {
  background: #fff1f1;
  color: #b91c1c;
  border: 1px solid #fca5a5;
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
}

.erro-box i, .sucesso-box i { margin-right: 6px; }

.sucesso-box {
  background: var(--success-light);
  color: #15803d;
  border: 1px solid #86efac;
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
}
</style>
