import React from 'react';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    padding: '2px 4px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontFamily: "'Noto Sans KR', sans-serif",
    color: 'var(--ink)',
    outline: 'none',
    transition: 'border .15s',
    background: 'white',
    boxShadow: 'none',
    '&:hover': {
      borderColor: state.isFocused ? 'var(--sky)' : 'var(--border)',
    },
    borderColor: state.isFocused ? 'var(--sky)' : 'var(--border)',
  }),
  option: (provided, state) => ({
    ...provided,
    fontSize: '13px',
    fontFamily: "'Noto Sans KR', sans-serif",
    backgroundColor: state.isSelected ? 'var(--sky)' : state.isFocused ? 'var(--sky-light)' : 'white',
    color: state.isSelected ? 'white' : 'var(--ink)',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'var(--sky)',
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'var(--ink-mute)',
    fontSize: '13px',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--ink)',
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: 'var(--radius-sm)',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--border)',
    zIndex: 100,
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

  // value가 단순 문자열일 경우 { value, label } 객체로 변환
  const selectedOption = typeof value === 'string' 
    ? options.find(opt => opt.value === value) || (value ? { value, label: value } : null)
    : value;

  const handleChange = (newValue) => {
    if (onChange) {
      // 부모 컴포넌트에는 가급적 단순 value(string)만 전달하도록 처리
      onChange(newValue ? newValue.value : '');
    }
  };

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
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
      {error && <div className="login-error" style={{ display: 'block', marginTop: '4px', fontSize: '11px' }}>{error}</div>}
    </div>
  );
}
