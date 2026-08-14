import React, { SelectHTMLAttributes, useMemo } from 'react';
import Select from 'react-select';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SearchableSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  options?: SelectOption[];
  optionsList?: SelectOption[];
  value?: string | number | null;
  onChange?: (e: any) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  isClearable?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  children,
  onChange,
  value,
  className,
  disabled,
  placeholder,
  required,
  name,
  options: directOptions,
  optionsList,
  isClearable = false,
  ...props
}) => {
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const customStyles = useMemo(() => ({
    control: (base: any, state: any) => ({
      ...base,
      minHeight: '38px',
      borderRadius: '0.75rem', // rounded-xl
      borderColor: state.isFocused ? '#0d9488' : isDarkMode ? '#334155' : '#e2e8f0', // teal-600 / slate-700 / slate-200
      boxShadow: state.isFocused ? '0 0 0 2px rgba(13, 148, 136, 0.2)' : 'none',
      backgroundColor: state.isDisabled 
        ? (isDarkMode ? '#0f172a' : '#f8fafc') 
        : (isDarkMode ? 'rgba(15, 23, 42, 0.6)' : '#ffffff'),
      fontSize: '0.8125rem', // text-xs / text-sm
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      '&:hover': {
        borderColor: state.isFocused ? '#0d9488' : isDarkMode ? '#475569' : '#cbd5e1',
      }
    }),
    singleValue: (base: any) => ({
      ...base,
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      fontSize: '0.8125rem',
      fontWeight: '500',
    }),
    input: (base: any) => ({
      ...base,
      color: isDarkMode ? '#f8fafc' : '#0f172a',
      fontSize: '0.8125rem',
    }),
    placeholder: (base: any) => ({
      ...base,
      color: isDarkMode ? '#94a3b8' : '#94a3b8',
      fontSize: '0.8125rem',
    }),
    menu: (base: any) => ({
      ...base,
      zIndex: 99999, // Ensure dropdown is always on top
      fontSize: '0.8125rem',
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
    }),
    menuList: (base: any) => ({
      ...base,
      padding: '4px',
      maxHeight: '240px',
    }),
    option: (base: any, state: any) => ({
      ...base,
      fontSize: '0.8125rem',
      borderRadius: '0.5rem',
      margin: '2px 0',
      padding: '8px 12px',
      backgroundColor: state.isSelected 
        ? '#0d9488' 
        : state.isFocused 
          ? (isDarkMode ? '#334155' : '#f0fdfa') 
          : 'transparent',
      color: state.isSelected 
        ? '#ffffff' 
        : (isDarkMode ? '#f1f5f9' : '#1e293b'),
      cursor: 'pointer',
      '&:active': {
        backgroundColor: '#0f766e',
      }
    }),
    menuPortal: (base: any) => ({
      ...base,
      zIndex: 99999,
    })
  }), [isDarkMode]);

  const options: SelectOption[] = useMemo(() => {
    if (directOptions && Array.isArray(directOptions)) return directOptions;
    if (optionsList && Array.isArray(optionsList)) return optionsList;
    const opts: SelectOption[] = [];
    React.Children.forEach(children, child => {
      if (React.isValidElement(child) && child.type === 'option') {
        opts.push({
          value: child.props.value !== undefined ? child.props.value : child.props.children,
          label: child.props.children as string
        });
      }
    });
    return opts;
  }, [children, directOptions, optionsList]);

  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    return options.find(opt => String(opt.value) === String(value)) || null;
  }, [options, value]);

  const handleChange = (selected: any) => {
    if (!onChange) return;
    const selectedVal = selected?.value !== undefined ? selected.value : (selected ?? '');
    
    // Create synthetic event that behaves as both an Event (e.target.value) and can be coerced to string/number
    const syntheticEvent: any = {
      target: { value: selectedVal, name: name || '' },
      currentTarget: { value: selectedVal, name: name || '' },
      value: selectedVal,
      label: selected?.label || '',
      valueOf: () => selectedVal,
      toString: () => String(selectedVal),
      preventDefault: () => {},
      stopPropagation: () => {}
    };

    onChange(syntheticEvent);
  };

  return (
    <Select
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuPosition="fixed"
      value={selectedOption}
      onChange={handleChange}
      options={options}
      isDisabled={disabled}
      isClearable={isClearable}
      placeholder={placeholder || "Pilih..."}
      className={className}
      name={name}
      styles={customStyles}
      noOptionsMessage={() => "Tidak ada data pilihan"}
    />
  );
};

