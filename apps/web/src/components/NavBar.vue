<template>
  <nav class="nav-bar">
    <button
      class="nav-btn"
      :class="{ active: filtroAtivo === 'Aluguel' }"
      @click="$emit('filtrar', 'Aluguel')"
    >
      <i class="fas fa-key"></i>
      <span>Alugar</span>
    </button>

    <button
      class="nav-btn"
      :class="{ active: filtroAtivo === 'Venda' }"
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
  background: white;
  border-radius: 100px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.18);
  display: flex;
  justify-content: space-between;
  padding: 5px;
  z-index: 9000;
}

.nav-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 0;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  color: #6B7280;
  cursor: pointer;
  transition: 0.25s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.nav-btn i { font-size: 16px; }

.nav-btn.active {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 12px rgba(0,87,255,0.35);
}

@media (min-width: 768px) {
  .nav-bar { top: 20px; bottom: auto; }
}
</style>
