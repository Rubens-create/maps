<template>
  <Teleport to="body">
    <Transition name="filters-modal">
      <div v-if="aberto" class="filters-overlay" @click.self="fechar">
        <section
          class="filters-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filters-title"
        >
          <header class="filters-header">
            <div>
              <p class="filters-eyebrow">BUSCA DE IMÓVEIS</p>
              <h2 id="filters-title">Filtros</h2>
            </div>
            <button class="filters-close" type="button" aria-label="Fechar filtros" @click="fechar">
              <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </header>

          <form class="filters-form" @submit.prevent="aplicar">
            <section class="filters-section" aria-labelledby="price-filter-title">
              <h3 id="price-filter-title">Preço</h3>
              <div class="filters-grid">
                <label class="filter-field" for="filter-price-min">
                  <span>Maior que</span>
                  <span class="filter-currency-input">
                    <span aria-hidden="true">R$</span>
                    <input
                      id="filter-price-min"
                      v-model="form.precoMaiorQue"
                      type="number"
                      min="0"
                      step="any"
                      inputmode="decimal"
                      placeholder="Valor mínimo"
                    />
                  </span>
                </label>

                <label class="filter-field" for="filter-price-max">
                  <span>Menor que</span>
                  <span class="filter-currency-input">
                    <span aria-hidden="true">R$</span>
                    <input
                      id="filter-price-max"
                      v-model="form.precoMenorQue"
                      type="number"
                      min="0.01"
                      step="any"
                      inputmode="decimal"
                      placeholder="Valor máximo"
                    />
                  </span>
                </label>
              </div>
            </section>

            <section class="filters-section" aria-labelledby="property-filter-title">
              <h3 id="property-filter-title">Características</h3>
              <div class="filters-grid">
                <div class="filter-field">
                  <label for="filter-bedrooms">Quartos</label>
                  <select id="filter-bedrooms" v-model="form.quartos" class="filter-input">
                    <option value="">Qualquer</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                  <input
                    v-if="form.quartos === 'personalizado'"
                    id="filter-bedrooms-custom"
                    v-model="form.quartosPersonalizado"
                    class="filter-input"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    inputmode="numeric"
                    placeholder="Quantidade personalizada"
                    aria-label="Quantidade personalizada de quartos"
                    required
                  />
                </div>

                <div class="filter-field">
                  <label for="filter-bathrooms">Banheiros</label>
                  <select id="filter-bathrooms" v-model="form.banheiros" class="filter-input">
                    <option value="">Qualquer</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                  <input
                    v-if="form.banheiros === 'personalizado'"
                    id="filter-bathrooms-custom"
                    v-model="form.banheirosPersonalizado"
                    class="filter-input"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    inputmode="numeric"
                    placeholder="Quantidade personalizada"
                    aria-label="Quantidade personalizada de banheiros"
                    required
                  />
                </div>

                <label class="filter-field" for="filter-area">
                  <span>Área mínima (m²)</span>
                  <input
                    id="filter-area"
                    v-model="form.areaMin"
                    class="filter-input"
                    type="number"
                    min="0.01"
                    step="any"
                    inputmode="decimal"
                    placeholder="Qualquer"
                  />
                </label>

                <label class="filter-field" for="filter-pets">
                  <span>Aceita pets</span>
                  <select id="filter-pets" v-model="form.aceitaPet" class="filter-input">
                    <option value="">Qualquer</option>
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </label>
              </div>
            </section>

            <p v-if="erro" class="filters-error" role="alert">
              <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
              {{ erro }}
            </p>

            <footer class="filters-footer">
              <button
                class="filters-clear"
                type="button"
                :disabled="!temFiltros"
                @click="limpar"
              >
                Limpar filtros
              </button>
              <div class="filters-actions">
                <button class="filters-cancel" type="button" @click="fechar">Cancelar</button>
                <button class="btn-primary filters-apply" type="submit">Aplicar filtros</button>
              </div>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { MapPropertyFilters } from '@luxxie/types'

const props = defineProps<{
  aberto: boolean
  modelValue: MapPropertyFilters
}>()

const emit = defineEmits<{
  fechar: []
  aplicar: [filtros: MapPropertyFilters]
}>()

const form = reactive({
  precoMaiorQue: '',
  precoMenorQue: '',
  quartos: '',
  quartosPersonalizado: '',
  banheiros: '',
  banheirosPersonalizado: '',
  areaMin: '',
  aceitaPet: '',
})
const erro = ref('')
const temFiltros = computed(() => Object.values(props.modelValue).some((value) => value !== undefined))

function preencherFormulario(): void {
  form.precoMaiorQue = props.modelValue.precoMaiorQue?.toString() ?? ''
  form.precoMenorQue = props.modelValue.precoMenorQue?.toString() ?? ''
  const quartos = props.modelValue.quartos
  form.quartos = quartos === undefined ? '' : quartos <= 5 ? String(quartos) : 'personalizado'
  form.quartosPersonalizado = quartos !== undefined && quartos > 5 ? String(quartos) : ''
  const banheiros = props.modelValue.banheiros
  form.banheiros = banheiros === undefined ? '' : banheiros <= 5 ? String(banheiros) : 'personalizado'
  form.banheirosPersonalizado = banheiros !== undefined && banheiros > 5 ? String(banheiros) : ''
  form.areaMin = props.modelValue.areaMin?.toString() ?? ''
  form.aceitaPet = props.modelValue.aceitaPet === undefined ? '' : String(props.modelValue.aceitaPet)
}

watch(() => props.aberto, (aberto) => {
  if (!aberto) return
  erro.value = ''
  preencherFormulario()
})

function fechar(): void {
  emit('fechar')
}

function numeroOpcional(valor: string | number): number | undefined {
  if (typeof valor === 'string' && !valor.trim()) return undefined
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : undefined
}

function montarFiltros(): MapPropertyFilters {
  const filtros: MapPropertyFilters = {}
  const precoMaiorQue = numeroOpcional(form.precoMaiorQue)
  const precoMenorQue = numeroOpcional(form.precoMenorQue)
  const quartos = form.quartos === 'personalizado'
    ? numeroOpcional(form.quartosPersonalizado)
    : numeroOpcional(form.quartos)
  const banheiros = form.banheiros === 'personalizado'
    ? numeroOpcional(form.banheirosPersonalizado)
    : numeroOpcional(form.banheiros)
  const areaMin = numeroOpcional(form.areaMin)

  if (precoMaiorQue !== undefined) filtros.precoMaiorQue = precoMaiorQue
  if (precoMenorQue !== undefined) filtros.precoMenorQue = precoMenorQue
  if (quartos !== undefined) filtros.quartos = quartos
  if (banheiros !== undefined) filtros.banheiros = banheiros
  if (areaMin !== undefined) filtros.areaMin = areaMin
  if (form.aceitaPet !== '') filtros.aceitaPet = form.aceitaPet === 'true'

  return filtros
}

function aplicar(): void {
  erro.value = ''
  const filtros = montarFiltros()
  if (
    filtros.precoMaiorQue !== undefined
    && filtros.precoMenorQue !== undefined
    && filtros.precoMaiorQue >= filtros.precoMenorQue
  ) {
    erro.value = 'O valor de “Maior que” deve ser menor que o valor de “Menor que”.'
    return
  }
  emit('aplicar', filtros)
}

function limpar(): void {
  emit('aplicar', {})
}

function fecharComEscape(event: KeyboardEvent): void {
  if (props.aberto && event.key === 'Escape') fechar()
}

onMounted(() => document.addEventListener('keydown', fecharComEscape))
onBeforeUnmount(() => document.removeEventListener('keydown', fecharComEscape))
</script>

<style scoped>
.filters-overlay {
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

.filters-dialog {
  display: flex;
  width: min(100%, 520px);
  max-height: min(90vh, 720px);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 24px 64px rgba(17, 24, 39, 0.24);
}

.filters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--border);
}

.filters-eyebrow {
  margin-bottom: 4px;
  color: var(--primary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.filters-header h2 { color: var(--text-dark); font-size: 21px; font-weight: 700; }

.filters-close {
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

.filters-close:hover { background: var(--border); color: var(--text-dark); }

.filters-form { overflow-y: auto; padding: 8px 24px 22px; }
.filters-section { padding: 16px 0; }
.filters-section + .filters-section { border-top: 1px solid var(--border); }
.filters-section h3 { margin-bottom: 13px; color: var(--text-dark); font-size: 14px; font-weight: 700; }

.filters-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 12px;
}

.filter-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
  color: var(--text-mid);
  font-size: 12px;
  font-weight: 700;
}

.filter-input,
.filter-currency-input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: var(--text-dark);
  font: 500 13px var(--font-sans);
}

.filter-input { padding: 10px 12px; }
.filter-input::placeholder { color: var(--text-light); }
.filter-input:focus,
.filter-currency-input:focus-within {
  border-color: var(--primary);
  outline: 3px solid rgba(0, 87, 255, 0.12);
}

.filter-currency-input {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-left: 12px;
}

.filter-currency-input > span { color: var(--text-light); font-size: 12px; font-weight: 700; }
.filter-currency-input input {
  width: 100%;
  min-width: 0;
  height: 42px;
  padding: 8px 10px 8px 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-dark);
  font: 500 13px var(--font-sans);
}

.filters-error {
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

.filters-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.filters-actions { display: flex; align-items: center; gap: 9px; }
.filters-clear,
.filters-cancel {
  min-height: 42px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text-mid);
  font-size: 13px;
  font-weight: 700;
}

.filters-clear:hover:not(:disabled),
.filters-cancel:hover { background: var(--bg); color: var(--text-dark); }
.filters-clear:disabled { cursor: default; opacity: 0.45; }
.filters-apply { width: auto; min-height: 42px; padding: 10px 14px; font-size: 13px; }

.filters-close:focus-visible,
.filters-clear:focus-visible,
.filters-cancel:focus-visible,
.filters-apply:focus-visible {
  outline: 3px solid rgba(0, 87, 255, 0.28);
  outline-offset: 2px;
}

.filters-modal-enter-active,
.filters-modal-leave-active { transition: opacity 160ms ease; }
.filters-modal-enter-active .filters-dialog,
.filters-modal-leave-active .filters-dialog { transition: transform 160ms ease; }
.filters-modal-enter-from,
.filters-modal-leave-to { opacity: 0; }
.filters-modal-enter-from .filters-dialog,
.filters-modal-leave-to .filters-dialog { transform: translateY(8px) scale(0.98); }

@media (max-width: 420px) {
  .filters-header { padding: 18px 18px 15px; }
  .filters-form { padding: 5px 18px 18px; }
  .filters-footer { align-items: stretch; flex-direction: column; }
  .filters-actions { justify-content: flex-end; }
}

@media (prefers-reduced-motion: reduce) {
  .filters-modal-enter-active,
  .filters-modal-leave-active,
  .filters-modal-enter-active .filters-dialog,
  .filters-modal-leave-active .filters-dialog { transition: none; }
}
</style>
