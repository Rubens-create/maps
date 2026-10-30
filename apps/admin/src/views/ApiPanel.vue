<template>
  <div class="api-screen">
    <header class="api-toolbar">
      <RouterLink class="toolbar-back" to="/">
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
        <span>Voltar ao painel</span>
      </RouterLink>
      <div class="toolbar-links">
        <a href="/docs" target="_blank" rel="noreferrer">
          Swagger interativo <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>
        <a href="/docs-json" target="_blank" rel="noreferrer">OpenAPI JSON</a>
      </div>
    </header>

    <div class="api-layout">
      <aside class="api-sidebar" aria-label="Navegação da documentação">
        <div class="sidebar-brand">
          <span class="brand-icon"><i class="fas fa-code" aria-hidden="true"></i></span>
          <span>Luxxie <small>API docs</small></span>
        </div>

        <label class="search-field">
          <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
          <span class="sr-only">Buscar endpoint</span>
          <input ref="campoBusca" v-model="busca" type="search" placeholder="Buscar endpoint..." />
          <kbd>/</kbd>
        </label>

        <p class="sidebar-label">DOCUMENTAÇÃO</p>
        <nav class="sidebar-nav">
          <RouterLink to="/api" class="nav-link" exact-active-class="nav-link-active">
            <i class="fas fa-book-open" aria-hidden="true"></i> Visão geral
          </RouterLink>
          <button v-if="visaoGeral" type="button" class="nav-link" @click="irPara('primeiros-passos')">
            <i class="fas fa-rocket" aria-hidden="true"></i> Primeiros passos
          </button>
          <p class="sidebar-label endpoints-label">SEÇÕES DA API</p>
          <RouterLink
            v-for="group in gruposFiltrados"
            :key="group.name"
            class="nav-link group-link"
            :to="`/api/${slugGrupo(group.name)}`"
            active-class="nav-link-active"
          >
            <span class="nav-dot"></span>{{ group.name }}
            <span class="nav-count">{{ group.operations.length }}</span>
          </RouterLink>
          <p v-if="busca && gruposFiltrados.length === 0" class="sidebar-empty">Nenhuma seção encontrada</p>
        </nav>

        <div class="sidebar-footer">
          <span class="health-dot" :class="`health-${statusApi}`"></span>
          <span>API {{ labelStatusApi }}</span>
          <button type="button" aria-label="Verificar conexão novamente" title="Verificar conexão" @click="verificarSaude">
            <i class="fas fa-rotate" aria-hidden="true"></i>
          </button>
        </div>
      </aside>

      <main class="readme-content">
        <div v-if="carregando" class="state-card" role="status">
          <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
          Carregando a especificação OpenAPI...
        </div>

        <div v-else-if="erroDocumentacao" class="state-card error-card" role="alert">
          <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
          <div>
            <strong>Não foi possível carregar a documentação.</strong>
            <p>{{ erroDocumentacao }}</p>
            <button type="button" class="retry-button" @click="carregarDocumentacao">Tentar novamente</button>
          </div>
        </div>

        <article v-else-if="spec" class="readme-paper">
          <div class="doc-kicker"><i class="fas fa-book-open" aria-hidden="true"></i> DOCUMENTAÇÃO DO DESENVOLVEDOR</div>
          <h1>{{ grupoAtual?.name || spec.info.title || 'Luxxie API' }}</h1>
          <p class="doc-lead">
            {{ grupoAtual ? `${operacoesDaPagina.length} operações nesta seção.` : spec.info.description || 'Referência dos endpoints disponíveis na API Luxxie.' }}
          </p>

          <div class="doc-badges">
            <span class="version-badge">v{{ spec.info.version || '—' }}</span>
            <span class="openapi-badge">OpenAPI</span>
            <span class="service-badge" :class="`service-${statusApi}`">
              <span class="health-dot" :class="`health-${statusApi}`"></span>{{ labelStatusApi }}
            </span>
          </div>

          <hr />

          <section v-if="visaoGeral" id="visao-geral" class="doc-section">
            <h2>Visão geral</h2>
            <p>A API HTTP do Luxxie fornece autenticação, consulta geográfica de imóveis, favoritos e gestão da conta.</p>
            <div class="quick-facts">
              <div class="fact-card">
                <span class="fact-label">BASE URL</span>
                <div class="fact-value code-value">
                  <code>{{ apiBaseUrl }}</code>
                  <button type="button" title="Copiar base URL" aria-label="Copiar base URL" @click="copiar(apiBaseUrl, 'base')">
                    <i :class="copiado === 'base' ? 'fas fa-check' : 'far fa-copy'" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
              <div class="fact-card">
                <span class="fact-label">OPERAÇÕES</span>
                <strong class="fact-number">{{ operacoes.length }}</strong>
              </div>
              <div class="fact-card">
                <span class="fact-label">GRUPOS</span>
                <strong class="fact-number">{{ grupos.length }}</strong>
              </div>
            </div>
            <p class="muted-note">A referência desta página é carregada do documento OpenAPI servido pela própria API.</p>
          </section>

          <hr v-if="visaoGeral" />

          <section v-if="visaoGeral" id="primeiros-passos" class="doc-section">
            <h2>Primeiros passos</h2>
            <p>Faça uma chamada simples para verificar se a API e o banco estão disponíveis:</p>
            <div class="code-block">
              <div class="code-header">
                <span><i class="fas fa-terminal" aria-hidden="true"></i> Terminal</span>
                <button type="button" @click="copiar(exemploHealth, 'health')">
                  <i :class="copiado === 'health' ? 'fas fa-check' : 'far fa-copy'" aria-hidden="true"></i>
                  {{ copiado === 'health' ? 'Copiado' : 'Copiar' }}
                </button>
              </div>
              <pre><code>{{ exemploHealth }}</code></pre>
            </div>
            <div class="callout">
              <i class="fas fa-shield-halved" aria-hidden="true"></i>
              <p><strong>Autenticação</strong> Endpoints protegidos exigem <code>Authorization: Bearer &lt;token&gt;</code>. O playground pode usar o token retornado pelo login ou cadastro, mantendo-o somente em memória, sem persistir no navegador.</p>
            </div>
          </section>

          <hr v-if="visaoGeral" />

          <section id="endpoints" class="doc-section endpoint-index">
            <div class="section-title-row">
              <div>
                <h2>{{ visaoGeral ? 'Seções da API' : `Endpoints de ${grupoAtual?.name || ''}` }}</h2>
                <p>{{ visaoGeral ? 'Abra uma área para consultar e testar suas rotas.' : 'Rotas, parâmetros, autenticação e schemas desta seção.' }}</p>
              </div>
              <span class="total-chip">{{ visaoGeral ? gruposFiltrados.length : operacoesDaPagina.length }} {{ visaoGeral ? 'seções' : 'rotas' }}</span>
            </div>

            <div v-if="visaoGeral && gruposFiltrados.length" class="category-grid">
              <RouterLink v-for="group in gruposFiltrados" :key="group.name" class="category-card" :to="`/api/${slugGrupo(group.name)}`">
                <span class="category-icon"><i class="fas fa-layer-group" aria-hidden="true"></i></span>
                <span class="category-copy">
                  <strong>{{ group.name }}</strong>
                  <small>{{ group.operations.length }} operação{{ group.operations.length === 1 ? '' : 'ões' }}</small>
                </span>
                <i class="fas fa-arrow-right category-arrow" aria-hidden="true"></i>
              </RouterLink>
            </div>

            <div v-else-if="visaoGeral" class="no-results">
              Nenhuma seção corresponde à busca “{{ busca }}”.
            </div>

            <div v-else-if="!grupoAtual" class="no-results route-not-found">
              Esta seção não existe. <RouterLink to="/api">Voltar à visão geral</RouterLink>
            </div>

            <div v-else-if="operacoesDaPagina.length === 0" class="no-results">
              Nenhum endpoint desta seção corresponde à busca “{{ busca }}”.
              <button type="button" @click="busca = ''">Limpar busca</button>
            </div>

            <section
              v-for="group in gruposPagina"
              :id="slugGrupo(group.name)"
              :key="group.name"
              class="endpoint-group"
            >
              <details v-for="operation in group.operations" :key="`${operation.method}:${operation.path}`" class="endpoint-card" :open="Boolean(busca.trim())">
                <summary class="endpoint-summary">
                  <span class="method-badge" :class="`method-${operation.method}`">{{ operation.method.toUpperCase() }}</span>
                  <code class="endpoint-path">{{ operation.path }}</code>
                  <span class="endpoint-name">{{ operation.summary || 'Operação da API' }}</span>
                  <span class="auth-badge" :class="operation.exigeAuth ? 'auth-required' : 'auth-public'">
                    {{ operation.exigeAuth ? 'Bearer' : 'Público' }}
                  </span>
                </summary>

                <div class="endpoint-details">
                  <p v-if="operation.description" class="operation-description">{{ operation.description }}</p>

                  <div v-if="operation.parameters.length" class="detail-block">
                    <h4>Parâmetros</h4>
                    <div class="table-scroll">
                      <table>
                        <thead><tr><th>Nome</th><th>Local</th><th>Tipo</th><th>Obrigatório</th><th>Detalhes</th></tr></thead>
                        <tbody>
                          <tr v-for="parameter in operation.parameters" :key="`${parameter.in}:${parameter.name}`">
                            <td><code>{{ parameter.name }}</code></td>
                            <td>{{ parameter.in }}</td>
                            <td><code>{{ tipoSchema(parameter.schema) }}</code></td>
                            <td>{{ parameter.required ? 'Sim' : 'Não' }}</td>
                            <td>{{ detalhesSchema(parameter.schema) || parameter.description || '—' }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div v-if="operation.bodySchema" class="detail-block">
                    <h4>Corpo da requisição <span>application/json</span></h4>
                    <div v-if="operation.bodySchema.properties" class="table-scroll">
                      <table>
                        <thead><tr><th>Campo</th><th>Tipo</th><th>Obrigatório</th><th>Restrições</th></tr></thead>
                        <tbody>
                          <tr v-for="(schema, property) in operation.bodySchema.properties" :key="property">
                            <td><code>{{ property }}</code></td>
                            <td><code>{{ tipoSchema(schema) }}</code></td>
                            <td>{{ operation.bodySchema.required?.includes(property) ? 'Sim' : 'Não' }}</td>
                            <td>{{ detalhesSchema(schema) || '—' }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <pre v-else class="schema-json"><code>{{ JSON.stringify(operation.bodySchema, null, 2) }}</code></pre>
                  </div>

                  <div v-if="Object.keys(operation.responses).length" class="detail-block response-block">
                    <h4>Respostas documentadas</h4>
                    <div class="response-list">
                      <span v-for="(response, code) in operation.responses" :key="code" class="response-item">
                        <code :class="statusClass(String(code))">{{ code }}</code>{{ response.description || 'Resposta da API' }}
                      </span>
                    </div>
                  </div>

                  <div class="playground-action">
                    <button type="button" class="playground-button" @click.stop="alternarTester(operation)">
                      <i :class="testerAberto === operationKey(operation) ? 'fas fa-chevron-up' : 'fas fa-play'" aria-hidden="true"></i>
                      {{ testerAberto === operationKey(operation) ? 'Fechar testador' : 'Testar endpoint' }}
                    </button>
                  </div>
                  <ApiRequestTester
                    v-if="testerAberto === operationKey(operation)"
                    :key="operationKey(operation)"
                    :operation="operation"
                    :token="bearerToken"
                    @update:token="bearerToken = $event"
                    @close="testerAberto = ''"
                  />
                </div>
              </details>
            </section>
          </section>

          <footer class="readme-footer">
            <span>Especificação OpenAPI {{ spec.openapi || '' }}</span>
            <span>Luxxie · {{ spec.info.title || 'API' }} v{{ spec.info.version || '—' }}</span>
          </footer>
        </article>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ApiRequestTester from '@/components/ApiRequestTester.vue'

type ApiMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

interface OpenApiSchema {
  type?: string
  format?: string
  enum?: unknown[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  nullable?: boolean
  properties?: Record<string, OpenApiSchema>
  required?: string[]
  items?: OpenApiSchema
}

interface OpenApiParameter {
  name: string
  in: string
  required?: boolean
  description?: string
  schema?: OpenApiSchema
}

interface OpenApiResponse {
  description?: string
}

interface OpenApiOperation {
  summary?: string
  description?: string
  tags?: string[]
  security?: Array<Record<string, unknown>>
  parameters?: OpenApiParameter[]
  requestBody?: {
    content?: Record<string, { schema?: OpenApiSchema }>
  }
  responses?: Record<string, OpenApiResponse>
}

interface OpenApiDocument {
  openapi?: string
  info: { title?: string; description?: string; version?: string }
  paths: Record<string, Partial<Record<ApiMethod, OpenApiOperation>>>
}

interface DisplayOperation {
  method: ApiMethod
  path: string
  summary: string
  description?: string
  tags: string[]
  exigeAuth: boolean
  parameters: OpenApiParameter[]
  bodySchema?: OpenApiSchema
  responses: Record<string, OpenApiResponse>
}

const methods: ApiMethod[] = ['get', 'post', 'put', 'patch', 'delete']
const route = useRoute()
const tituloAnterior = document.title
const campoBusca = ref<HTMLInputElement | null>(null)
const spec = ref<OpenApiDocument | null>(null)
const carregando = ref(true)
const erroDocumentacao = ref('')
const statusApi = ref<'checking' | 'online' | 'offline'>('checking')
const busca = ref('')
const copiado = ref('')
const testerAberto = ref('')
const bearerToken = ref('')
let timerCopiado: ReturnType<typeof setTimeout> | null = null

const origin = window.location.origin
const apiBaseUrl = `${origin}/api`
const exemploHealth = `curl --request GET --url '${apiBaseUrl}/health' --header 'Accept: application/json'`
const labelStatusApi = computed(() => ({
  checking: 'Verificando API',
  online: 'API online',
  offline: 'API indisponível',
})[statusApi.value])

const operacoes = computed<DisplayOperation[]>(() => {
  if (!spec.value) return []
  return Object.entries(spec.value.paths).flatMap(([path, pathItem]) => methods.flatMap((method) => {
    const operation = pathItem[method]
    if (!operation) return []
    return [{
      method,
      path,
      summary: operation.summary || '',
      description: operation.description,
      tags: operation.tags?.length ? operation.tags : ['Outros'],
      exigeAuth: Boolean(operation.security?.some((requirement) => Object.keys(requirement).length > 0)),
      parameters: operation.parameters || [],
      bodySchema: operation.requestBody?.content?.['application/json']?.schema,
      responses: operation.responses || {},
    }]
  }))
})

const grupos = computed(() => {
  const byTag = new Map<string, DisplayOperation[]>()
  for (const operation of operacoes.value) {
    const tag = operation.tags[0] || 'Outros'
    const items = byTag.get(tag) || []
    items.push(operation)
    byTag.set(tag, items)
  }
  return [...byTag.entries()].map(([name, operations]) => ({ name, operations }))
})

const groupParam = computed(() => typeof route.params.group === 'string' ? route.params.group : '')
const grupoAtual = computed(() => grupos.value.find((group) => slugGrupo(group.name) === groupParam.value) || null)
const visaoGeral = computed(() => !groupParam.value)

const gruposFiltrados = computed(() => {
  const term = busca.value.trim().toLocaleLowerCase('pt-BR')
  if (!term) return grupos.value
  return grupos.value
    .map((group) => ({
      ...group,
      operations: group.operations.filter((operation) =>
        `${group.name} ${operation.method} ${operation.path} ${operation.summary}`.toLocaleLowerCase('pt-BR').includes(term),
      ),
    }))
    .filter((group) => group.operations.length > 0)
})

const operacoesDaPagina = computed(() => {
  if (!grupoAtual.value) return []
  const term = busca.value.trim().toLocaleLowerCase('pt-BR')
  return grupoAtual.value.operations.filter((operation) =>
    !term || `${grupoAtual.value?.name} ${operation.method} ${operation.path} ${operation.summary}`.toLocaleLowerCase('pt-BR').includes(term),
  )
})

const gruposPagina = computed(() => grupoAtual.value
  ? [{ ...grupoAtual.value, operations: operacoesDaPagina.value }]
  : [],
)

function slugGrupo(name: string): string {
  return `grupo-${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

function irPara(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function operationKey(operation: DisplayOperation): string {
  return `${operation.method}:${operation.path}`
}

function alternarTester(operation: DisplayOperation): void {
  const key = operationKey(operation)
  testerAberto.value = testerAberto.value === key ? '' : key
}

function onAtalhoBusca(event: KeyboardEvent): void {
  const target = event.target
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
  if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
  event.preventDefault()
  campoBusca.value?.focus()
}

function tipoSchema(schema?: OpenApiSchema): string {
  if (!schema) return '—'
  const type = schema.type || 'object'
  return schema.format ? `${type} (${schema.format})` : type
}

function detalhesSchema(schema?: OpenApiSchema): string {
  if (!schema) return ''
  const details: string[] = []
  if (schema.enum?.length) details.push(`valores: ${schema.enum.map(String).join(', ')}`)
  if (schema.minimum !== undefined) details.push(`mín. ${schema.minimum}`)
  if (schema.maximum !== undefined) details.push(`máx. ${schema.maximum}`)
  if (schema.minLength !== undefined) details.push(`mín. ${schema.minLength} caracteres`)
  if (schema.maxLength !== undefined) details.push(`máx. ${schema.maxLength} caracteres`)
  if (schema.nullable) details.push('aceita null')
  return details.join(' · ')
}

function statusClass(code: string): string {
  if (code.startsWith('2')) return 'status-success'
  if (code.startsWith('4')) return 'status-client-error'
  if (code.startsWith('5')) return 'status-server-error'
  return ''
}

async function copiar(text: string, key: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    copiado.value = key
    if (timerCopiado) clearTimeout(timerCopiado)
    timerCopiado = setTimeout(() => {
      copiado.value = ''
      timerCopiado = null
    }, 1800)
  } catch {
    copiado.value = ''
  }
}

async function carregarDocumentacao(): Promise<void> {
  carregando.value = true
  erroDocumentacao.value = ''
  try {
    const response = await fetch('/docs-json', { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`A especificação respondeu HTTP ${response.status}.`)
    const data = await response.json() as OpenApiDocument
    if (!data.info || !data.paths) throw new Error('A resposta não contém uma especificação OpenAPI válida.')
    spec.value = data
  } catch (error) {
    erroDocumentacao.value = error instanceof Error ? error.message : 'Verifique a conexão com a API.'
  } finally {
    carregando.value = false
  }
}

async function verificarSaude(): Promise<void> {
  statusApi.value = 'checking'
  try {
    const response = await fetch('/api/health', { headers: { Accept: 'application/json' } })
    statusApi.value = response.ok ? 'online' : 'offline'
  } catch {
    statusApi.value = 'offline'
  }
}

onMounted(() => {
  document.title = `${grupoAtual.value?.name || 'Luxxie API'} | Documentação`
  window.addEventListener('keydown', onAtalhoBusca)
  void carregarDocumentacao()
  void verificarSaude()
})

watch(() => route.params.group, () => {
  testerAberto.value = ''
  document.title = `${grupoAtual.value?.name || 'Luxxie API'} | Documentação`
  document.querySelector('.api-screen')?.scrollTo({ top: 0, behavior: 'smooth' })
})

onBeforeUnmount(() => {
  document.title = tituloAnterior
  window.removeEventListener('keydown', onAtalhoBusca)
  if (timerCopiado) clearTimeout(timerCopiado)
})
</script>

<style scoped>
.api-screen { height: 100%; overflow-y: auto; background: #f6f8fb; color: var(--text-dark); }
.api-toolbar { position: sticky; top: 0; z-index: 5; display: flex; min-height: 64px; align-items: center; justify-content: space-between; gap: 20px; padding: 0 clamp(18px, 4vw, 52px); border-bottom: 1px solid var(--border); background: rgba(255,255,255,.94); backdrop-filter: blur(14px); }
.toolbar-back, .toolbar-links, .toolbar-links a { display: inline-flex; align-items: center; }
.toolbar-back { gap: 9px; color: var(--text-mid); font-size: 13px; font-weight: 700; text-decoration: none; }
.toolbar-back:hover, .toolbar-links a:hover { color: var(--primary); }
.toolbar-links { gap: 20px; }
.toolbar-links a { gap: 7px; color: var(--text-mid); font-size: 12px; font-weight: 700; text-decoration: none; }
.api-layout { display: grid; grid-template-columns: 220px minmax(0, 920px); justify-content: center; align-items: start; gap: 28px; max-width: 1260px; margin: 0 auto; padding: 32px 28px 60px; }
.api-sidebar { position: sticky; top: 88px; padding: 4px 0; }
.sidebar-brand { display: flex; align-items: center; gap: 10px; margin: 0 0 22px 8px; font-family: var(--font-display); font-size: 16px; font-weight: 800; }
.sidebar-brand small { display: block; margin-top: 1px; color: var(--text-light); font-family: var(--font-sans); font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.brand-icon { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 11px; background: var(--primary); color: white; box-shadow: 0 5px 14px rgba(0,87,255,.22); }
.search-field { display: flex; height: 39px; align-items: center; gap: 8px; padding: 0 10px; border: 1px solid var(--border); border-radius: 9px; background: white; color: var(--text-light); }
.search-field:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(0,87,255,.08); }
.search-field input { width: 100%; min-width: 0; border: 0; outline: 0; color: var(--text-dark); background: transparent; font: 500 11px var(--font-sans); }
.search-field input::placeholder { color: #9aa2b1; }
.search-field kbd { padding: 2px 5px; border: 1px solid var(--border); border-radius: 4px; background: #fafbfc; font: 10px var(--font-mono); }
.sidebar-label { margin: 28px 0 9px 9px; color: #8b95a5; font-size: 9px; font-weight: 800; letter-spacing: .12em; }
.endpoints-label { margin-top: 25px; }
.sidebar-nav { display: flex; flex-direction: column; gap: 3px; }
.nav-link { display: flex; width: 100%; min-height: 34px; align-items: center; gap: 9px; padding: 0 9px; border: 0; border-radius: 7px; background: transparent; color: var(--text-mid); text-align: left; text-decoration: none; font: 600 11px var(--font-sans); cursor: pointer; }
.nav-link:hover { background: white; color: var(--primary); }
.nav-link-active { background: white; color: var(--primary); box-shadow: 0 1px 4px rgba(27,44,72,.05); }
.nav-link-active .nav-dot { background: var(--primary); }
.nav-link > i { width: 13px; color: #8e98a8; font-size: 11px; }
.nav-dot { width: 6px; height: 6px; flex: 0 0 6px; border-radius: 50%; background: #aeb7c6; }
.nav-count { margin-left: auto; color: #9ba5b3; font: 10px var(--font-mono); }
.sidebar-empty { padding: 7px 9px; color: #919baa; font-size: 10px; }
.sidebar-footer { display: flex; align-items: center; gap: 8px; margin: 32px 4px 0; padding: 12px 8px 0; border-top: 1px solid var(--border); color: var(--text-mid); font-size: 10px; font-weight: 700; }
.sidebar-footer button { margin-left: auto; padding: 4px; border: 0; background: transparent; color: var(--text-light); cursor: pointer; }
.sidebar-footer button:hover { color: var(--primary); }
.health-dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: #a3acb9; }
.health-online { background: #16a36a; box-shadow: 0 0 0 3px rgba(22,163,106,.12); }
.health-offline { background: #e35050; box-shadow: 0 0 0 3px rgba(227,80,80,.1); }
.readme-content { min-width: 0; }
.readme-paper { overflow: hidden; padding: clamp(24px, 5vw, 52px); border: 1px solid #e5e9f0; border-radius: 14px; background: #fff; box-shadow: 0 8px 28px rgba(24,38,66,.045); }
.doc-kicker { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: var(--primary); font-size: 9px; font-weight: 800; letter-spacing: .13em; }
.readme-paper h1 { margin: 0 0 10px; font-size: clamp(30px, 4vw, 42px); font-weight: 800; letter-spacing: -.045em; line-height: 1.1; }
.doc-lead { max-width: 650px; color: var(--text-mid); font-size: 14px; line-height: 1.7; }
.doc-badges { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 18px; }
.doc-badges > span { display: inline-flex; align-items: center; gap: 7px; min-height: 25px; padding: 0 9px; border: 1px solid var(--border); border-radius: 6px; color: #536074; font: 700 10px var(--font-mono); }
.doc-badges .version-badge { border-color: #d9e4ff; background: #f2f6ff; color: #245bd6; }
.doc-badges .service-online { border-color: #ccebdd; background: #f0fbf5; color: #187d53; }
.doc-badges .service-offline { border-color: #f5d2d2; background: #fff6f6; color: #bb3c3c; }
.readme-paper hr { height: 1px; margin: 30px 0; border: 0; background: #e8ebf0; }
.doc-section { scroll-margin-top: 84px; }
.doc-section h2 { margin: 0 0 12px; font-size: 21px; letter-spacing: -.025em; }
.doc-section > p { margin: 0 0 16px; color: var(--text-mid); font-size: 12px; line-height: 1.7; }
.quick-facts { display: grid; grid-template-columns: minmax(0, 1.7fr) repeat(2, minmax(100px, .65fr)); gap: 10px; margin: 20px 0 10px; }
.fact-card { min-width: 0; padding: 13px 14px; border: 1px solid #e8ebf1; border-radius: 9px; background: #fbfcfe; }
.fact-label { display: block; margin-bottom: 9px; color: #8b95a5; font-size: 8px; font-weight: 800; letter-spacing: .12em; }
.fact-value { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 5px; }
.fact-value code { overflow: hidden; color: #34425a; font: 11px var(--font-mono); text-overflow: ellipsis; white-space: nowrap; }
.fact-value button { flex: 0 0 auto; padding: 4px; border: 0; background: transparent; color: #7f8ba0; cursor: pointer; }
.fact-value button:hover { color: var(--primary); }
.fact-number { color: #26354c; font: 700 19px var(--font-mono); }
.muted-note { color: #8490a0 !important; font-size: 10px !important; }
.code-block { overflow: hidden; margin: 18px 0; border: 1px solid #202a39; border-radius: 9px; background: #111827; }
.code-header { display: flex; height: 37px; align-items: center; justify-content: space-between; padding: 0 13px; border-bottom: 1px solid rgba(255,255,255,.09); color: #a8b3c4; font-size: 10px; }
.code-header span, .code-header button { display: inline-flex; align-items: center; gap: 7px; }
.code-header button { padding: 5px 7px; border: 0; border-radius: 5px; background: transparent; color: #c6d0df; font: 600 10px var(--font-sans); cursor: pointer; }
.code-header button:hover { background: rgba(255,255,255,.09); color: white; }
.code-block pre, .schema-json { overflow-x: auto; margin: 0; padding: 17px; color: #d9e2ef; font: 11px/1.8 var(--font-mono); tab-size: 2; }
.code-block code { color: inherit; }
.callout { display: flex; gap: 11px; margin-top: 17px; padding: 13px 14px; border-left: 3px solid var(--primary); border-radius: 0 8px 8px 0; background: #f3f7ff; color: #46556d; }
.callout > i { padding-top: 2px; color: var(--primary); }
.callout p { font-size: 11px; line-height: 1.65; }
.callout strong { margin-right: 5px; color: #243652; }
.callout code { padding: 2px 4px; border-radius: 4px; background: rgba(0,87,255,.08); color: #2256c5; font: 10px var(--font-mono); }
.section-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.section-title-row p { margin: -5px 0 17px; color: var(--text-mid); font-size: 11px; }
.total-chip { margin-top: 5px; padding: 5px 8px; border: 1px solid var(--border); border-radius: 6px; color: #6e7a8d; font: 10px var(--font-mono); white-space: nowrap; }
.category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 16px; }
.category-card { display: flex; min-width: 0; min-height: 69px; align-items: center; gap: 11px; padding: 12px; border: 1px solid #e6eaf0; border-radius: 8px; background: #fff; color: var(--text-dark); text-decoration: none; transition: border-color .15s, box-shadow .15s, transform .15s; }
.category-card:hover { transform: translateY(-1px); border-color: #cbd8ef; box-shadow: 0 5px 14px rgba(25,40,68,.06); }
.category-icon { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border-radius: 8px; background: #eff4ff; color: var(--primary); font-size: 12px; }
.category-copy { display: grid; min-width: 0; gap: 4px; }
.category-copy strong { color: #334158; font-size: 11px; }
.category-copy small { color: #8792a2; font-size: 9px; }
.category-arrow { margin-left: auto; color: #9aa4b3; font-size: 10px; }
.page-breadcrumb { display: flex; align-items: center; gap: 8px; margin: 0 0 14px; color: #8893a3; font-size: 10px; }
.page-breadcrumb a, .route-not-found a { color: var(--primary); font-weight: 700; text-decoration: none; }
.page-breadcrumb a:hover, .route-not-found a:hover { text-decoration: underline; }
.endpoint-group { margin: 24px 0 0; scroll-margin-top: 82px; }
.group-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
.group-heading h3 { font-size: 14px; }
.group-heading > span { color: #8d97a6; font: 9px var(--font-mono); }
.endpoint-card { margin: 7px 0; overflow: hidden; border: 1px solid #e6eaf0; border-radius: 8px; background: white; }
.endpoint-card[open] { border-color: #d5deed; box-shadow: 0 3px 12px rgba(25,40,68,.035); }
.endpoint-summary { display: grid; grid-template-columns: 56px minmax(160px, .9fr) minmax(130px, 1fr) auto; align-items: center; gap: 10px; min-height: 49px; padding: 8px 11px; list-style: none; cursor: pointer; }
.endpoint-summary::-webkit-details-marker { display: none; }
.method-badge { display: inline-flex; width: 48px; min-height: 22px; align-items: center; justify-content: center; border-radius: 5px; font: 800 9px var(--font-mono); }
.method-get { background: #e8f4ff; color: #1474bb; }
.method-post { background: #e9f8ef; color: #16824d; }
.method-put, .method-patch { background: #fff3dd; color: #a86700; }
.method-delete { background: #fff0f0; color: #c43c3c; }
.endpoint-path { overflow: hidden; color: #293850; font: 11px var(--font-mono); text-overflow: ellipsis; white-space: nowrap; }
.endpoint-name { overflow: hidden; color: #647086; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.auth-badge { justify-self: end; padding: 4px 6px; border-radius: 5px; font: 700 8px var(--font-mono); white-space: nowrap; }
.auth-required { background: #f1edff; color: #6e4db5; }
.auth-public { background: #f2f4f7; color: #707c8e; }
.endpoint-details { padding: 14px; border-top: 1px solid #edf0f4; background: #fcfdff; }
.operation-description { margin: 0 0 13px; color: var(--text-mid); font-size: 11px; line-height: 1.6; }
.detail-block { margin-top: 14px; }
.detail-block h4 { margin-bottom: 8px; color: #3d4a5f; font-size: 10px; font-weight: 800; }
.detail-block h4 span { margin-left: 6px; color: #8c96a5; font: 9px var(--font-mono); }
.table-scroll { overflow-x: auto; border: 1px solid #e8ebf0; border-radius: 7px; }
table { width: 100%; border-collapse: collapse; font-size: 10px; text-align: left; }
th, td { padding: 8px 9px; border-bottom: 1px solid #edf0f4; vertical-align: top; }
th { background: #f6f8fb; color: #778397; font-size: 8px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
td { color: #59677d; }
td code { color: #344563; font: 10px var(--font-mono); }
tbody tr:last-child td { border-bottom: 0; }
.schema-json { max-height: 240px; border: 1px solid #252f40; border-radius: 7px; background: #111827; font-size: 10px; }
.response-list { display: flex; flex-wrap: wrap; gap: 7px; }
.response-item { display: inline-flex; align-items: center; gap: 6px; padding: 6px 8px; border: 1px solid #e7eaf0; border-radius: 6px; color: #68758a; font-size: 9px; }
.response-item code { font: 700 9px var(--font-mono); }
.playground-action { display: flex; justify-content: flex-end; margin-top: 14px; }
.playground-button { display: inline-flex; min-height: 32px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid #cfdcf1; border-radius: 6px; background: #f1f6ff; color: #285bc0; font: 700 10px var(--font-sans); cursor: pointer; }
.playground-button:hover { border-color: #a9c1e8; background: #e7efff; }
.status-success { color: #16824d; }
.status-client-error { color: #b57712; }
.status-server-error { color: #c43c3c; }
.no-results { padding: 24px; border: 1px dashed #d7dde7; border-radius: 8px; color: #7e899a; font-size: 12px; text-align: center; }
.no-results button { margin-left: 5px; border: 0; background: transparent; color: var(--primary); font: 700 11px var(--font-sans); cursor: pointer; }
.readme-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 32px; padding-top: 14px; border-top: 1px solid #e8ebf0; color: #8b95a5; font-size: 9px; }
.state-card { display: flex; align-items: center; gap: 12px; padding: 24px; border: 1px solid var(--border); border-radius: 12px; background: white; color: var(--text-mid); font-size: 13px; }
.state-card > i { color: var(--primary); }
.error-card { align-items: flex-start; border-color: #f0cccc; background: #fffafa; color: #9e4545; }
.error-card > i { color: #c43c3c; }
.error-card strong { font-size: 13px; }
.error-card p { margin-top: 5px; font-size: 11px; }
.retry-button { margin-top: 12px; padding: 7px 10px; border: 1px solid #efcaca; border-radius: 6px; background: white; color: #a33c3c; font: 700 10px var(--font-sans); cursor: pointer; }
.retry-button:hover { background: #fff1f1; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; clip-path: inset(50%); }

@media (max-width: 900px) {
  .api-layout { grid-template-columns: 190px minmax(0, 1fr); gap: 18px; padding: 20px 16px 40px; }
  .endpoint-summary { grid-template-columns: 56px minmax(140px, .9fr) minmax(100px, 1fr) auto; gap: 7px; }
}

@media (max-width: 680px) {
  .api-toolbar { min-height: 56px; padding: 0 14px; }
  .toolbar-links { gap: 12px; }
  .toolbar-links a { font-size: 10px; }
  .toolbar-links a:first-child { font-size: 0; }
  .toolbar-links a:first-child i { font-size: 11px; }
  .api-layout { display: block; padding: 14px 10px 28px; }
  .api-sidebar { position: static; margin-bottom: 14px; padding: 3px; }
  .sidebar-brand { margin: 0 0 12px 4px; }
  .sidebar-label { margin: 12px 0 6px 5px; }
  .endpoints-label { display: none; }
  .sidebar-nav { display: flex; flex-direction: row; overflow-x: auto; padding-bottom: 4px; }
  .nav-link { flex: 0 0 auto; min-height: 31px; padding: 0 8px; border: 1px solid #e6eaf0; background: white; }
  .nav-count { display: none; }
  .sidebar-footer { display: none; }
  .readme-paper { padding: 22px 16px; border-radius: 10px; }
  .quick-facts { grid-template-columns: 1fr 1fr; }
  .fact-card:first-child { grid-column: 1 / -1; }
  .category-grid { grid-template-columns: 1fr; }
  .endpoint-summary { grid-template-columns: 52px minmax(0, 1fr) auto; gap: 7px; }
  .endpoint-name { grid-column: 2 / 3; grid-row: 2; }
  .auth-badge { grid-column: 3; grid-row: 1 / 3; }
  .endpoint-path { font-size: 10px; }
  .section-title-row { align-items: center; }
  .section-title-row p { margin-bottom: 14px; }
  .readme-footer { flex-direction: column; }
}

@media (max-width: 390px) {
  .toolbar-back span { display: none; }
  .toolbar-links { gap: 8px; }
  .doc-badges { gap: 5px; }
  .doc-badges > span { padding: 0 7px; font-size: 9px; }
  .endpoint-summary { grid-template-columns: 48px minmax(0,1fr); }
  .auth-badge { grid-column: 2; grid-row: 2; justify-self: start; }
  .endpoint-name { grid-column: 2; grid-row: 3; }
}
</style>
