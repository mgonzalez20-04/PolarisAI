/**
 * Sistema de caché en memoria para el servidor
 * Reduce queries repetitivas a la base de datos para datos que no cambian frecuentemente
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>();

  /**
   * Obtiene un valor del caché si existe y no ha expirado
   * @param key - La clave del caché
   * @returns El valor cacheado o null si no existe/expiró
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      // El item expiró, eliminarlo
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Guarda un valor en el caché
   * @param key - La clave del caché
   * @param data - Los datos a cachear
   * @param ttl - Tiempo de vida en milisegundos (default: 1 minuto)
   */
  set<T>(key: string, data: T, ttl: number = 60000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Invalida todas las claves que coincidan con un patrón
   * @param pattern - Patrón de búsqueda (ej: "tags:", "folders:")
   */
  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Elimina una clave específica del caché
   * @param key - La clave a eliminar
   */
  delete(key: string) {
    this.cache.delete(key);
  }

  /**
   * Limpia todo el caché
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Obtiene el tamaño actual del caché
   */
  size(): number {
    return this.cache.size;
  }
}

// Exportar una instancia singleton
export const cache = new SimpleCache();
