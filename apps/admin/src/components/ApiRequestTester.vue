<template>
  <section class="tester" aria-label="Testar endpoint da API">
    <div class="tester-heading">
      <div>
        <span class="tester-kicker"><i class="fas fa-flask" aria-hidden="true"></i> API PLAYGROUND</span>
        <h4>Enviar requisição</h4>
      </div>
      <button class="close-button" type="button" aria-label="Fechar testador" @click="$emit('close')">
        <i class="fas fa-xmark" aria-hidden="true"></i>
      </button>
    </div>

    <div v-if="methodMutates" class="safety-note" role="note">
      <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
      <span>Esta chamada executa a rota real e pode gravar ou excluir dados. Use uma conta e dados de teste.</span>
    </div>

    <form class="request-form" @submit.prevent="enviar">
      <div v-if="parameters.length" class="fields-section">
        <div class="fields-title">Parâmetros</div>
        <div class="parameter-grid">
          <div v-for="parameter in parameters" :key="parameterKey(parameter)" class="parameter-field">
            <label :for="inputId(parameter)">
              <span>{{ parameter.name }}</span>
              <span class="field-meta">{{ parameter.in }}{{ parameter.required ? ' · obrigatório' : '' }}</span>
            </label>
            <select
              v-if="parameter.schema?.enum?.length"
              :id="inputId(parameter)"
              v-model="values[parameterKey(parameter)]"
              :required="parameter.required"
            >
              <option value="">Selecione...</option>
              <option v-for="value in parameter.schema.enum" :key="String(value)" :value="String(value)">
                {{ value }}
              </option>
            </select>
            <input
              v-else
              :id="inputId(parameter)"
              v-model="values[parameterKey(parameter)]"
              :type="inputType(parameter)"
              :step="parameter.schema?.type === 'integer' ? '1' : parameter.schema?.type === 'number' ? 'any' : undefined"
              :min="parameter.schema?.minimum"
              :max="parameter.schema?.maximum"
              :required="parameter.required"
              :placeholder="parameter.schema?.type === 'number' || parameter.schema?.type === 'integer' ? '0' : 'Informe o valor'"
              autocomplete="off"
            />
            <small v-if="parameter.description">{{ parameter.description }}</small>
          </div>
        </div>
      </div>

      <label v-if="operation.exigeAuth" class="token-field">
        <span class="fields-title">Token Bearer <small>usado só nesta sessão em memória</small></span>
        <span class="token-input-row">
          <input
            v-model="tokenModel"
            :type="mostrarToken ? 'text' : 'password'"
            autocomplete="off"
            spellcheck="false"
            placeholder="Cole o token de acesso"
          />
          <button type="button" :aria-label="mostrarToken ? 'Ocultar token' : 'Mostrar token'" @click="mostrarToken = !mostrarToken">
            <i :class="mostrarToken ? 'fas fa-eye-slash' : 'fas fa-eye'" aria-hidden="true"></i>
          </button>
          <button type="button" aria-label="Limpar token da memória" title="Limpar token" @click="tokenModel = ''">
            <i class="fas fa-trash-can" aria-hidden="true"></i>
          </button>
        </span>
        <small>O token não é salvo no navegador. Respostas de login têm o token ocultado na prévia.</small>
      </label>

      <section v-if="operation.bodySchema" class="body-fields-section" aria-label="Campos do corpo JSON">
        <div class="body-fields-heading">
          <div>
            <span class="fields-title">Corpo da requisição</span>
            <small>application/json</small>
          </div>
          <span class="field-key"><b>*</b> obrigatório</span>
        </div>
        <p class="body-fields-hint">Campos marcados como opcionais podem ficar vazios. Valores opcionais vazios não serão enviados.</p>
        <div class="body-property-grid">
          <div v-for="field in bodyFields" :key="field.name" class="body-property" :class="{ 'body-property-wide': isLargeField(field) }">
            <label :for="bodyInputId(field.name)">
              <span>{{ field.name }}<b v-if="field.required" class="required-mark">*</b></span>
              <span class="requiredness" :class="field.required ? 'is-required' : 'is-optional'">
                {{ field.required ? 'Obrigatório' : 'Opcional' }}
              </span>
            </label>

            <label v-if="field.schema.nullable" class="nullable-control">
              <input type="checkbox" :checked="isNull(field.name)" @change="onNullChange(field.name, $event)" />
              Enviar como null
            </label>

            <select
              v-if="field.schema.enum?.length"
              :id="bodyInputId(field.name)"
              v-model="bodyValues[field.name]"
              :required="field.required && !isNull(field.name)"
              :disabled="isNull(field.name)"
            >
              <option value="">Selecione...</option>
              <option v-for="option in field.schema.enum" :key="String(option)" :value="String(option)">{{ option }}</option>
            </select>
            <select
              v-else-if="field.schema.type === 'boolean'"
              :id="bodyInputId(field.name)"
              v-model="bodyValues[field.name]"
              :required="field.required && !isNull(field.name)"
              :disabled="isNull(field.name)"
            >
              <option value="">Selecione...</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
            <textarea
              v-else-if="field.schema.type === 'array' || field.schema.type === 'object' || isLargeField(field)"
              :id="bodyInputId(field.name)"
              v-model="bodyValues[field.name]"
              :required="field.required && !isNull(field.name)"
              :disabled="isNull(field.name)"
              :placeholder="field.schema.type === 'array' ? '[]' : field.schema.type === 'object' ? '{}' : 'Digite o valor'"
              rows="3"
              spellcheck="false"
            ></textarea>
            <input
              v-else
              :id="bodyInputId(field.name)"
              v-model="bodyValues[field.name]"
              :type="bodyInputType(field)"
              :step="field.schema.type === 'integer' ? '1' : field.schema.type === 'number' ? 'any' : undefined"
              :min="field.schema.minimum"
              :max="field.schema.maximum"
              :maxlength="field.schema.maxLength"
              :required="field.required && !isNull(field.name)"
              :disabled="isNull(field.name)"
              :placeholder="field.schema.type === 'number' || field.schema.type === 'integer' ? '0' : 'Informe o valor'"
              autocomplete="off"
            />
            <small v-if="field.schema.minimum !== undefined || field.schema.maximum !== undefined || field.schema.minLength !== undefined || field.schema.maxLength !== undefined" class="field-constraints">
              <span v-if="field.schema.minimum !== undefined">Mín. {{ field.schema.minimum }}</span>
              <span v-if="field.schema.maximum !== undefined">Máx. {{ field.schema.maximum }}</span>
              <span v-if="field.schema.minLength !== undefined">Mín. {{ field.schema.minLength }} caracteres</span>
              <span v-if="field.schema.maxLength !== undefined">Máx. {{ field.schema.maxLength }} caracteres</span>
            </small>
          </div>
        </div>
      </section>

      <div class="request-preview">
        <span>REQUISIÇÃO</span>
        <code><b :class="`method-${operation.method}`">{{ operation.method.toUpperCase() }}</b> {{ urlPreview }}</code>
      </div>

      <div class="form-actions">
        <button class="send-button" type="submit" :disabled="enviando">
          <i :class="enviando ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'" aria-hidden="true"></i>
          {{ enviando ? 'Enviando...' : 'Enviar requisição' }}
        </button>
        <span class="no-persist">Sem salvar token ou histórico</span>
      </div>
    </form>

    <section v-if="resultado" class="result-card" aria-live="polite">
      <header class="result-heading" :class="resultado.ok ? 'result-ok' : 'result-fail'">
        <div>
          <span>RESPOSTA</span>
          <strong>{{ resultado.status === null ? 'Não enviada' : `${resultado.status} ${resultado.statusText}` }}</strong>
        </div>
        <span>{{ resultado.durationMs }} ms</span>
      </header>
      <pre><code>{{ resultado.body }}</code></pre>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { buildApiRequestBody, buildApiRequestUrl, sanitizeApiResponse } from '@/utils/api-request'

interface JsonSchema {
  type?: string
  format?: string
  enum?: unknown[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  nullable?: boolean
}

interface RequestParameter {
  name: string
  in: string
  required?: boolean
  description?: string
  schema?: JsonSchema
}

interface ApiOperation {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
  path: string
  summary: string
  exigeAuth: boolean
  parameters: RequestParameter[]
  bodySchema?: JsonSchema
}

interface BodyField {
  name: string
  schema: JsonSchema
  required: boolean
}

interface RequestResult {
  status: number | null
  statusText: string
  ok: boolean
  durationMs: number
  body: string
}

const props = defineProps<{ operation: ApiOperation; token: string }>()
const emit = defineEmits<{
  close: []
  'update:token': [value: string]
}>()

const values = reactive<Record<string, string>>({})
const bodyValues = reactive<Record<string, string>>({})
const nullFields = ref<string[]>([])
const mostrarToken = ref(false)
const enviando = ref(false)
const resultado = ref<RequestResult | null>(null)
const methodMutates = computed(() => props.operation.method !== 'get')
const parameters = computed(() => props.operation.parameters.filter((parameter) => parameter.in === 'path' || parameter.in === 'query'))
const bodyFields = computed<BodyField[]>(() => {
  const schema = props.operation.bodySchema
  if (!schema?.properties) return []
  return Object.entries(schema.properties).map(([name, fieldSchema]) => ({
    name,
    schema: fieldSchema,
    required: schema.required?.includes(name) ?? false,
  }))
})
const tokenModel = computed({
  get: () => props.token,
  set: (value: string) => emit('update:token', value),
})
let activeController: AbortController | null = null

for (const parameter of parameters.value) values[parameterKey(parameter)] = ''
for (const field of bodyFields.value) bodyValues[field.name] = ''

const urlPreview = computed(() => {
  try {
    return buildApiRequestUrl(window.location.origin, props.operation.path, parameters.value, values)
  } catch {
    return `${window.location.origin}${props.operation.path}`
  }
})

function parameterKey(parameter: RequestParameter): string {
  return `${parameter.in}:${parameter.name}`
}

function inputId(parameter: RequestParameter): string {
  return `api-param-${parameter.in}-${parameter.name}`
}

function inputType(parameter: RequestParameter): string {
  return parameter.schema?.type === 'number' || parameter.schema?.type === 'integer' ? 'number' : 'text'
}

function bodyInputId(name: string): string {
  return `body-field-${name}`
}

function bodyInputType(field: BodyField): string {
  if (field.schema.type === 'number' || field.schema.type === 'integer') return 'number'
  if (field.schema.format === 'email') return 'email'
  if (field.schema.format === 'uri' || field.schema.format === 'url') return 'url'
  if (/^(senha|password)$/i.test(field.name)) return 'password'
  return 'text'
}

function isLargeField(field: BodyField): boolean {
  return field.schema.type === 'array' || field.schema.type === 'object'
    || (field.schema.type === 'string' && (field.schema.maxLength ?? 0) > 1000)
}

function isNull(name: string): boolean {
  return nullFields.value.includes(name)
}

function setNull(name: string, enabled: boolean): void {
  nullFields.value = enabled
    ? [...new Set([...nullFields.value, name])]
    : nullFields.value.filter((fieldName) => fieldName !== name)
  if (enabled) bodyValues[name] = ''
}

function onNullChange(name: string, event: Event): void {
  setNull(name, (event.target as HTMLInputElement).checked)
}

function parseResponseBody(text: string): { display: string; raw: unknown } {
  if (!text) return { display: '(sem corpo)', raw: null }
  try {
    const raw = JSON.parse(text) as unknown
    return { display: JSON.stringify(sanitizeApiResponse(raw), null, 2), raw }
  } catch {
    return { display: text.slice(0, 30_000), raw: null }
  }
}

async function enviar(): Promise<void> {
  if (enviando.value) return
  resultado.value = null

  let url: string
  let requestBody: string | undefined
  try {
    url = buildApiRequestUrl(window.location.origin, props.operation.path, parameters.value, values)
    if (props.operation.exigeAuth && !props.token.trim()) throw new Error('Informe um token Bearer antes de testar esta rota.')
    if (props.operation.bodySchema) {
      requestBody = JSON.stringify(buildApiRequestBody(props.operation.bodySchema, bodyValues, nullFields.value))
    }
  } catch (error) {
    resultado.value = {
      status: null,
      statusText: '',
      ok: false,
      durationMs: 0,
      body: error instanceof Error ? error.message : 'Revise os campos da requisição.',
    }
    return
  }

  if (props.operation.method === 'delete' && !window.confirm(`Enviar DELETE para ${url}? Esta ação pode excluir dados permanentemente.`)) return

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (props.operation.exigeAuth) headers.Authorization = `Bearer ${props.token.trim()}`
  if (requestBody !== undefined) headers['Content-Type'] = 'application/json'

  const controller = new AbortController()
  activeController = controller
  const startedAt = performance.now()
  enviando.value = true

  try {
    const response = await fetch(url, {
      method: props.operation.method.toUpperCase(),
      headers,
      body: requestBody,
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    })
    const text = await response.text()
    const responseBody = parseResponseBody(text)

    if (response.ok && responseBody.raw && typeof responseBody.raw === 'object' && !Array.isArray(responseBody.raw)) {
      const accessToken = (responseBody.raw as Record<string, unknown>).accessToken
      if (typeof accessToken === 'string' && accessToken.length > 0) emit('update:token', accessToken)
    }
    if (response.ok && props.operation.path === '/api/auth/logout') emit('update:token', '')

    resultado.value = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      durationMs: Math.round(performance.now() - startedAt),
      body: responseBody.display,
    }
  } catch (error) {
    resultado.value = {
      status: null,
      statusText: '',
      ok: false,
      durationMs: Math.round(performance.now() - startedAt),
      body: error instanceof Error ? error.message : 'Falha ao chamar a API.',
    }
  } finally {
    if (activeController === controller) activeController = null
    enviando.value = false
  }
}

onBeforeUnmount(() => activeController?.abort())
</script>

<style scoped>
.tester { margin-top: 15px; padding: 16px; border: 1px solid #dce5f4; border-radius: 9px; background: #f7f9fd; }
.tester-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 13px; }
.tester-kicker { display: inline-flex; align-items: center; gap: 6px; color: var(--primary); font-size: 8px; font-weight: 800; letter-spacing: .12em; }
.tester-heading h4 { margin: 5px 0 0; color: #27364d; font-size: 13px; }
.close-button { display: grid; width: 27px; height: 27px; place-items: center; border: 1px solid #dfe5ee; border-radius: 6px; background: white; color: #7d8796; cursor: pointer; }
.close-button:hover { border-color: #b9c8e0; color: var(--primary); }
.safety-note { display: flex; gap: 8px; align-items: flex-start; margin: 0 0 13px; padding: 9px 10px; border: 1px solid #f0dfbd; border-radius: 6px; background: #fffaf0; color: #87601c; font-size: 10px; line-height: 1.5; }
.safety-note i { margin-top: 1px; }
.request-form { display: grid; gap: 13px; }
.fields-section, .token-field, .body-fields-section { display: grid; gap: 8px; }
.fields-title { display: flex; align-items: baseline; gap: 8px; color: #47556b; font-size: 10px; font-weight: 800; }
.fields-title small { color: #8d98a8; font: 9px var(--font-mono); }
.body-fields-section { padding: 12px; border: 1px solid #e0e6ef; border-radius: 7px; background: #fff; }
.body-fields-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.body-fields-heading > div { display: flex; align-items: baseline; gap: 8px; }
.body-fields-heading > div > small { color: #8d98a8; font: 9px var(--font-mono); }
.field-key { color: #748197; font-size: 9px; white-space: nowrap; }
.field-key b, .required-mark { color: #cc4c4c; }
.body-fields-hint { margin: 0; color: #7d899a; font-size: 9px; line-height: 1.5; }
.body-property-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 11px; }
.body-property { display: grid; min-width: 0; align-content: start; gap: 5px; }
.body-property-wide { grid-column: 1 / -1; }
.body-property > label:first-child { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #46546a; font: 600 10px var(--font-mono); }
.required-mark { margin-left: 2px; font: 700 11px var(--font-sans); }
.requiredness { padding: 3px 5px; border-radius: 4px; font: 700 8px var(--font-sans); white-space: nowrap; }
.is-required { background: #fff1f1; color: #b44747; }
.is-optional { background: #f0f3f7; color: #758196; }
.nullable-control { display: flex; align-items: center; gap: 6px; color: #748197; font: 9px var(--font-sans); }
.nullable-control input { width: 13px; height: 13px; accent-color: var(--primary); }
.parameter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.parameter-field { display: grid; gap: 5px; min-width: 0; }
.parameter-field label { display: flex; justify-content: space-between; gap: 8px; color: #46546a; font: 600 10px var(--font-mono); }
.field-meta { color: #929baa; font: 9px var(--font-sans); }
.parameter-field input, .parameter-field select, .token-input-row input, .body-property input, .body-property select, .body-property textarea { width: 100%; min-width: 0; border: 1px solid #dbe1ea; border-radius: 6px; outline: none; background: white; color: #26354a; font: 11px var(--font-sans); }
.parameter-field input, .parameter-field select, .token-input-row input { height: 34px; padding: 0 9px; }
.body-property input, .body-property select { height: 34px; padding: 0 9px; }
.body-property textarea { min-height: 76px; padding: 9px; resize: vertical; font: 10px/1.6 var(--font-mono); tab-size: 2; }
.parameter-field input:focus, .parameter-field select:focus, .token-input-row input:focus, .body-property input:focus, .body-property select:focus, .body-property textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(0,87,255,.08); }
.parameter-field small, .token-field > small, .field-constraints { color: #8390a2; font-size: 9px; line-height: 1.5; }
.field-constraints { display: flex; flex-wrap: wrap; gap: 5px 10px; }
.body-property input:disabled, .body-property select:disabled, .body-property textarea:disabled { background: #f3f5f8; color: #939dab; }
.token-input-row { display: flex; gap: 6px; }
.token-input-row button { flex: 0 0 34px; height: 34px; border: 1px solid #dbe1ea; border-radius: 6px; background: white; color: #758198; cursor: pointer; }
.token-input-row button:hover { color: var(--primary); }
.request-preview { display: grid; gap: 6px; padding: 9px 10px; border: 1px solid #e0e5ec; border-radius: 6px; background: white; }
.request-preview > span { color: #929baa; font-size: 8px; font-weight: 800; letter-spacing: .1em; }
.request-preview code { overflow-wrap: anywhere; color: #3d4d65; font: 9px/1.5 var(--font-mono); }
.request-preview b { margin-right: 4px; font-weight: 800; }
.request-preview .method-get { color: #1474bb; }
.request-preview .method-post { color: #16824d; }
.request-preview .method-put, .request-preview .method-patch { color: #a86700; }
.request-preview .method-delete { color: #c43c3c; }
.form-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.send-button { display: inline-flex; min-height: 36px; align-items: center; gap: 8px; padding: 0 13px; border: 0; border-radius: 6px; background: var(--primary); color: white; font: 700 10px var(--font-sans); cursor: pointer; }
.send-button:hover:not(:disabled) { background: var(--primary-dark); }
.send-button:disabled { opacity: .65; cursor: wait; }
.no-persist { color: #929baa; font-size: 9px; }
.result-card { overflow: hidden; margin-top: 15px; border: 1px solid #dfe5ee; border-radius: 7px; background: #fff; }
.result-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-bottom: 1px solid #e8ecf2; }
.result-heading > div { display: grid; gap: 3px; }
.result-heading span { color: #8a95a5; font-size: 8px; font-weight: 800; letter-spacing: .1em; }
.result-heading strong { color: #546176; font: 700 10px var(--font-mono); }
.result-heading > span:last-child { font: 10px var(--font-mono); letter-spacing: 0; }
.result-ok strong { color: #16824d; }
.result-fail strong { color: #bb4a42; }
.result-card pre { overflow: auto; max-height: 340px; margin: 0; padding: 12px; background: #111827; color: #d9e2ef; font: 10px/1.6 var(--font-mono); white-space: pre-wrap; overflow-wrap: anywhere; }
@media (max-width: 560px) {
  .tester { padding: 12px; }
  .parameter-grid { grid-template-columns: 1fr; }
}
</style>
