<template>
  <nav class="nav-bar">
    <span
      class="nav-indicator"
      :class="{
        'is-visible': filtroAtivo !== null,
        'is-venda': filtroAtivo === 'Venda',
      }"
      aria-hidden="true"
    ></span>

    <button
      class="nav-btn"
      :class="{ active: filtroAtivo === 'Aluguel' }"
      :aria-pressed="filtroAtivo === 'Aluguel'"
      @click="$emit('filtrar', 'Aluguel')"
    >
      <i class="fas fa-key"></i>
      <span>Alugar</span>
    </button>

    <button
      class="nav-btn"
      :class="{ active: filtroAtivo === 'Venda' }"
      :aria-pressed="filtroAtivo === 'Venda'"
      @click="$emit('filtrar', 'Venda')"
    >
      <i class="fas fa-home"></i>
      <span>Comprar</span>
    </button>

  </nav>
</template>

<script setup lang="ts">
import type { PropertyType } from '@luxxie/types'

defineProps<{ filtroAtivo: PropertyType | null }>()
defineEmits<{ filtrar: [tipo: PropertyType] }>()
</script>

<style scoped>
.nav-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 400px;
  isolation: isolate;
  background: white;
  border-radius: 100px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.18);
  display: flex;
  justify-content: space-between;
  padding: 5px;
  z-index: 9000;
}

.nav-indicator {
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: 5px;
  width: calc((100% - 10px) / 2);
  border-radius: 100px;
  background: var(--primary);
  box-shadow: 0 4px 12px rgba(0,87,255,0.35);
  opacity: 0;
  transform: translate3d(0, 0, 0);
  transition:
    transform 220ms cubic-bezier(.25, .8, .25, 1),
    opacity 180ms ease;
  pointer-events: none;
  z-index: 0;
}
.nav-indicator.is-visible { opacity: 1; }
.nav-indicator.is-venda { transform: translate3d(100%, 0, 0); }

.nav-btn {
  position: relative;
  z-index: 1;
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 0;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  color: #6B7280;
  cursor: pointer;
  transition: color 0.25s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.nav-btn i { font-size: 16px; }

.nav-btn.active {
  color: white;
}

@media (prefers-reduced-motion: reduce) {
  .nav-indicator {
    transition: transform 180ms cubic-bezier(.25, .8, .25, 1), opacity 160ms ease;
  }
  .nav-btn { transition: none; }
}

@media (min-width: 768px) {
  .nav-bar { top: 20px; bottom: auto; }
}
</style>
