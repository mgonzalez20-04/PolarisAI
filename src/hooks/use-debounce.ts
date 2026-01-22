import { useEffect, useState } from 'react';

/**
 * Hook para debouncing de valores
 * Retrasa la actualización del valor hasta que hayan pasado {delay}ms sin cambios
 *
 * @param value - El valor a debounce
 * @param delay - El delay en milisegundos (default: 300ms)
 * @returns El valor debounced
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set timeout to update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to clear timeout if value changes before delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
