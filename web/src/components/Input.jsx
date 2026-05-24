export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors
          ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors bg-white
          ${error ? 'border-red-400' : 'border-gray-300 focus:border-primary-500'} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors resize-none
          ${error ? 'border-red-400' : 'border-gray-300 focus:border-primary-500'} ${className}`}
        rows={3}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
