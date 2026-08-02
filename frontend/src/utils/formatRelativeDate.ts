// frontend/src/utils/formatRelativeDate.ts

export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';

  const date = new Date(dateStr);
  const now = new Date();
  
  if (isNaN(date.getTime())) return '—';

  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  // < 1 min
  if (diffSec < 60) {
    return 'Hace unos segundos';
  }

  // < 60 min
  if (diffMin < 60) {
    return `Hace ${diffMin} min`;
  }

  // < 24 horas (y mismo día o día siguiente que no cumpla 'Ayer')
  if (diffHours < 24) {
    // Verificar si es ayer por cambio de día calendario, no solo por 24 horas.
    const isYesterday = now.getDate() !== date.getDate() && diffHours > now.getHours();
    if (!isYesterday) {
      return `Hace ${diffHours} h`;
    }
  }

  // Ayer (lógica de calendario)
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear()) {
    return 'Ayer';
  }

  // < 7 días
  if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  }

  // Fechas más antiguas
  const formatter = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });

  return formatter.format(date).replace('.', ''); // e.g. "12 jul" or "12 jul 2025"
}
