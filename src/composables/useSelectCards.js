import { ref, computed, toValue } from 'vue';

/**
 * Tracks which cards a player has picked in a "choose N cards" dialog.
 * Selecting a card that is already selected deselects it; selecting more than
 * `count` cards drops the oldest selection.
 *
 * @param {number | import('vue').Ref<number> | (() => number)} count - how many cards to pick
 */
export function useSelectCards(count) {
  const selectedIds = ref([]);

  const ready = computed(() => selectedIds.value.length === toValue(count));

  function isSelected(cardId) {
    return selectedIds.value.includes(cardId);
  }

  function selectCard(cardId) {
    const idx = selectedIds.value.indexOf(cardId);
    if (idx !== -1) {
      selectedIds.value.splice(idx, 1);
    } else {
      selectedIds.value.push(cardId);
      if (selectedIds.value.length > toValue(count)) {
        selectedIds.value.splice(0, 1);
      }
    }
  }

  function clear() {
    selectedIds.value = [];
  }

  return { selectedIds, isSelected, ready, selectCard, clear };
}
