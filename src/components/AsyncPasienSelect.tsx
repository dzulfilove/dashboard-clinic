import React, { useState } from 'react';
import AsyncCreatableSelect from 'react-select/async-creatable';
import api from '../services/api.js';

interface PasienOption {
  value: string;
  label: string;
  isNew?: boolean;
  pasien?: any;
}

interface AsyncPasienSelectProps {
  value: PasienOption | null;
  onChange: (option: PasienOption | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const AsyncPasienSelect: React.FC<AsyncPasienSelectProps> = ({ value, onChange, disabled, placeholder, className, required }) => {
  const loadOptions = async (inputValue: string) => {
    if (!inputValue) {
      return [];
    }
    
    try {
      const response = await api.get('/pasien', { params: { q: inputValue } });
      const data = response.data;
      
      return data.map((p: any) => ({
        value: String(p.no_rm),
        label: `${p.no_rm} - ${p.nama}`,
        pasien: p
      }));
    } catch (error) {
      console.error('Error fetching patient data:', error);
      return [];
    }
  };

  return (
    <AsyncCreatableSelect
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuPosition="fixed"
      cacheOptions
      defaultOptions={false}
      loadOptions={loadOptions}
      value={value}
      onChange={onChange}
      isDisabled={disabled}
      placeholder={placeholder || "Ketik Nama atau No RM..."}
      className={className}
      required={required}
      formatCreateLabel={(inputValue) => `Pasien Baru / RM: "${inputValue}"`}
      noOptionsMessage={({ inputValue }) => inputValue ? "Tidak ditemukan" : "Ketik untuk mencari..."}
      styles={{
        control: (base, state) => ({
          ...base,
          minHeight: '38px',
          borderRadius: '0.75rem',
          borderColor: state.isFocused ? '#5eead4' : '#f1f5f9',
          boxShadow: state.isFocused ? '0 0 0 4px rgba(20, 184, 166, 0.05)' : 'none',
          backgroundColor: disabled ? '#f8fafc' : '#ffffff',
          fontSize: '0.75rem',
        }),
        option: (base, state) => ({
          ...base,
          fontSize: '0.75rem',
          backgroundColor: state.isSelected ? '#0d9488' : state.isFocused ? '#f0fdfa' : '#ffffff',
          color: state.isSelected ? '#ffffff' : '#1e293b',
          cursor: 'pointer'
        }),
        menu: (base) => ({
          ...base,
          zIndex: 9999,
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
