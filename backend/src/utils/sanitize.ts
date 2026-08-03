import { FilterXSS } from 'xss';

// Política estricta: No se permite ninguna etiqueta HTML.
// Útil para nombres, títulos, descripciones y mensajes de texto libre.
const strictXss = new FilterXSS({
  whiteList: {}, // Lista blanca vacía: elimina todas las etiquetas
  stripIgnoreTag: true, // Elimina el contenido de etiquetas no permitidas si es peligroso, o la etiqueta en sí
  stripIgnoreTagBody: ['script', 'style'], // Elimina completamente scripts y estilos
});

/**
 * Sanitiza una cadena de texto eliminando cualquier etiqueta HTML o script.
 * Si el valor no es un string (ej. null, undefined), lo devuelve intacto.
 * 
 * @param input Cadena de texto a sanitizar.
 * @returns Cadena sanitizada.
 */
export function sanitizeText(input: any): any {
  if (typeof input === 'string') {
    return strictXss.process(input);
  }
  return input;
}
