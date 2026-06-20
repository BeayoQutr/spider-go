interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors outline-none
          ${error
            ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-200'
            : 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
          }
          placeholder:text-gray-300
          ${className}`
        }
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
