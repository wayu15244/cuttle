import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useSelectCards } from '@/composables/useSelectCards';

describe('useSelectCards', () => {
  it('toggles a card on and off', () => {
    const { selectedIds, isSelected, selectCard } = useSelectCards(2);

    selectCard('AC');
    expect(selectedIds.value).toEqual([ 'AC' ]);
    expect(isSelected('AC')).toBe(true);

    selectCard('AC');
    expect(selectedIds.value).toEqual([]);
    expect(isSelected('AC')).toBe(false);
  });

  it('drops the oldest selection when selecting past the count', () => {
    const { selectedIds, selectCard } = useSelectCards(2);

    selectCard('AC');
    selectCard('2C');
    selectCard('3C');

    expect(selectedIds.value).toEqual([ '2C', '3C' ]);
  });

  it('is ready only when exactly count cards are selected', () => {
    const { ready, selectCard } = useSelectCards(2);

    expect(ready.value).toBe(false);
    selectCard('AC');
    expect(ready.value).toBe(false);
    selectCard('2C');
    expect(ready.value).toBe(true);
    selectCard('2C');
    expect(ready.value).toBe(false);
  });

  it('follows a reactive count', () => {
    const count = ref(1);
    const { selectedIds, ready, selectCard } = useSelectCards(count);

    selectCard('AC');
    expect(ready.value).toBe(true);

    count.value = 2;
    expect(ready.value).toBe(false);
    selectCard('2C');
    expect(selectedIds.value).toEqual([ 'AC', '2C' ]);
    expect(ready.value).toBe(true);
  });

  it('accepts a getter for the count', () => {
    const handSize = ref(9);
    const { ready, selectCard } = useSelectCards(() => handSize.value - 8);

    selectCard('AC');
    expect(ready.value).toBe(true);
  });

  it('clears the selection', () => {
    const { selectedIds, ready, selectCard, clear } = useSelectCards(1);

    selectCard('AC');
    clear();

    expect(selectedIds.value).toEqual([]);
    expect(ready.value).toBe(false);
  });
});
