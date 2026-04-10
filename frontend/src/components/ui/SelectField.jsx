import React from 'react';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '44px',
    borderRadius: 'calc(var(--radius-md) - 2px)',
    borderWidth: '2px',
    borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
    backgroundColor: 'var(--color-background)',
    boxShadow: 'none',
    transition: 'all 0.15s ease',
    '&:hover': {
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-primary) / 0.5',
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 12px',
  }),
  input: (provided) => ({
    ...provided,
    color: 'var(--color-foreground)',
    fontSize: '14px',
    fontFamily: 'inherit',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'var(--color-muted-foreground)',
    fontSize: '14px',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--color-foreground)',
    fontSize: '14px',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'var(--color-popover)',
    border: '2px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    padding: '4px',
    zIndex: 1000,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? 'var(--color-primary)' 
      : state.isFocused 
        ? 'var(--color-accent)' 
        : 'transparent',
    color: state.isSelected 
      ? 'var(--color-primary-foreground)' 
      : 'var(--color-foreground)',
    fontSize: '13px',
    fontWeight: state.isSelected ? '600' : '400',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'var(--color-accent)',
    },
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: 'var(--color-muted-foreground)',
    paddingRight: '8px',
    '&:hover': { color: 'var(--color-foreground)' },
  }),
  clearIndicator: (provided) => ({
    ...provided,
    color: 'var(--color-muted-foreground)',
    '&:hover': { color: 'var(--color-destructive)' },
  }),
};

export default function SelectField({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder, 
  isCreatable = true,
  isLoading = false,
  error = '' 
}) {
  const SelectComponent = isCreatable ? CreatableSelect : Select;

  const selectedOption = typeof value === 'string' 
    ? options.find(opt => opt.value === value) || (value ? { value, label: value } : null)
    : value;

  const handleChange = (newValue) => {
    if (onChange) {
      onChange(newValue ? newValue.value : '');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{label}</label>}
      <SelectComponent
        isClearable
        isLoading={isLoading}
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder || '선택하거나 직접 입력...'}
        styles={customStyles}
        formatCreateLabel={(inputValue) => `직접 입력: "${inputValue}"`}
        noOptionsMessage={() => "검색 결과가 없습니다."}
      />
      {error && (
        <div className="px-2 py-1 text-[11px] font-medium text-destructive animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}
    </div>
  );
}
