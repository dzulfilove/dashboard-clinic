import React, { SelectHTMLAttributes, useMemo } from 'react';
import Select from 'react-select';

interface SearchableSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ children, onChange, value, className, disabled, placeholder, required, name, ...props }) => {
  const options = useMemo(() => {
    const opts: { value: string, label: string }[] = [];
    React.Children.forEach(children, child => {
      if (React.isValidElement(child) && child.type === 'option') {
        opts.push({
          value: child.props.value as string,
          label: child.props.children as string
        });
      }
    });
    return opts;
  }, [children]);

  const selectedOption = options.find(opt => String(opt.value) === String(value)) || null;

  return (
    <Select
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuPosition="fixed"
      value={selectedOption}
      onChange={(selected: any) => {
        if (onChange) {
           const syntheticEvent = { target: { value: selected?.value || '', name: name || '' } } as any;
           onChange(syntheticEvent);
        }
      }}
      options={options}
      isDisabled={disabled}
      placeholder={placeholder || "Pilih..."}
      className={className}
      name={name}
      styles={{
        control: (base, state) => ({
          ...base,
          minHeight: '38px',
          borderRadius: '0.5rem',
          borderColor: state.isFocused ? '#5eead4' : '#e2e8f0', // teal-300 / slate-200
          boxShadow: state.isFocused ? '0 0 0 2px rgba(20, 184, 166, 0.1)' : 'none',
          backgroundColor: disabled ? '#f8fafc' : '#ffffff',
          fontSize: '0.75rem', // text-xs
        }),
        option: (base, state) => ({
          ...base,
          fontSize: '0.75rem',
          backgroundColor: state.isSelected ? '#0d9488' : state.isFocused ? '#f0fdfa' : '#ffffff', // teal-600 / teal-50
          color: state.isSelected ? '#ffffff' : '#1e293b', // slate-800
          cursor: 'pointer'
        }),
        menu: (base) => ({
          ...base,
          zIndex: 9999, // Ensure dropdown is above modals
          fontSize: '0.75rem',
        }),
        menuPortal: (base) => ({
          ...base,
          zIndex: 9999,
        })
      }}
    />
  );
};
