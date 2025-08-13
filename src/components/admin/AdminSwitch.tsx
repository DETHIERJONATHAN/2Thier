export default function AdminSwitch({ checked, onChange, disabled }: { checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean }) {
  return (
    <button
      className={`w-10 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-green-500' : 'bg-gray-300'} relative ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => { if (!disabled) onChange(!checked); }}
      aria-pressed={checked}
      type="button"
      disabled={disabled}
    >
      <span
        className={`absolute left-0 top-0 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-4' : ''}`}
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
      />
    </button>
  );
}
