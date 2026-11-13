<script setup lang="ts">
// Thin typed wrapper around Squirkle text inputs, so pages get a plain
// string v-model and a single place to tune field styling.
const model = defineModel<string>({ default: '' })
withDefaults(defineProps<{
  label?: string
  placeholder?: string
  hint?: string
  inputType?: string
  inputmode?: 'text' | 'url' | 'email' | 'numeric' | 'search' | 'tel' | 'decimal'
  multiline?: boolean
  rows?: number
  counter?: number | boolean
  disabled?: boolean
  required?: boolean
  hideDetails?: boolean
  autocomplete?: string
  autocapitalize?: string
}>(), { inputType: 'text', rows: 3 })
defineEmits<{ enter: [] }>()
</script>

<template>
  <SqTextarea
    v-if="multiline"
    v-model="model" :label="label" :placeholder="placeholder" :hint="hint" :persistent-hint="!!hint"
    :rows="rows" auto-grow :counter="counter" :disabled="disabled" :hide-details="hideDetails && !counter && !hint"
  />
  <SqTextField
    v-else
    v-model="model" :label="label" :placeholder="placeholder" :hint="hint" :persistent-hint="!!hint"
    :type="inputType" :inputmode="inputmode" :counter="counter" :disabled="disabled" :required="required"
    :hide-details="hideDetails && !counter && !hint" :autocomplete="autocomplete" :autocapitalize="autocapitalize"
    @keydown:enter="$emit('enter')"
  />
</template>
