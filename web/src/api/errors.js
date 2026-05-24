export function parseApiError(err, fallback = 'Erro inesperado') {
  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join('; ')
  if (typeof detail === 'string') return detail
  return fallback
}
