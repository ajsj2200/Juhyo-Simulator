import { useState, useEffect } from 'react';

const InputGroup = ({ label, value, onChange, unit }) => {
  const [inputValue, setInputValue] = useState(String(value));

  // 외부 value가 바뀌면 동기화
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    // 아무 문자나 일단 허용 (타이핑 중)
    setInputValue(raw);

    // 유효한 숫자면 바로 반영
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    // 포커스 잃을 때 숫자로 정리
    const num = parseFloat(inputValue);
    if (isNaN(num)) {
      setInputValue(String(value));
    } else {
      onChange(num);
      setInputValue(String(num));
    }
  };

  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-blue-400"
        />
        <span className="text-sm text-gray-600 w-12 dark:text-slate-400">{unit}</span>
      </div>
    </div>
  );
};

export default InputGroup;
