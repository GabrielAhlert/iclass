const variants = {
  pendente:   'bg-gray-100 text-gray-700',
  entregue:   'bg-blue-100 text-blue-700',
  avaliada:   'bg-green-100 text-green-700',
  atrasada:   'bg-red-100 text-red-700',
  aluno:      'bg-purple-100 text-purple-700',
  professor:  'bg-orange-100 text-orange-700',
  admin:      'bg-gray-800 text-white',
  fib_easy:   'bg-green-100 text-green-800',
  fib_medium: 'bg-yellow-100 text-yellow-800',
  fib_hard:   'bg-orange-100 text-orange-800',
  fib_xhard:  'bg-red-100 text-red-800',
}

export default function Badge({ label, variant = 'pendente' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.pendente}`}>
      {label}
    </span>
  )
}

export function FibBadge({ weight }) {
  const variant = weight <= 2 ? 'fib_easy' : weight <= 5 ? 'fib_medium' : weight <= 13 ? 'fib_hard' : 'fib_xhard'
  return <Badge label={`Peso ${weight}`} variant={variant} />
}

export function StatusBadge({ status }) {
  const labels = { pendente: 'Pendente', entregue: 'Entregue', avaliada: 'Avaliada', atrasada: 'Atrasada' }
  return <Badge label={labels[status] || status} variant={status} />
}

export function RoleBadge({ tipo }) {
  const labels = { aluno: 'Aluno', professor: 'Professor', admin: 'Admin' }
  return <Badge label={labels[tipo] || tipo} variant={tipo} />
}
