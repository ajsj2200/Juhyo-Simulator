import InputGroup from './InputGroup';

const PersonCard = ({ person, setPerson, color, showRetirement = false }) => (
  <div className={`p-6 rounded-lg border-2 ${color} bg-white`}>
    <input
      type="text"
      value={person.name}
      onChange={(e) => setPerson({ ...person, name: e.target.value })}
      className="text-xl font-bold mb-4 w-full px-2 py-1 border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none"
    />

    <InputGroup
      label="초기 자산"
      value={person.initial}
      onChange={(v) => setPerson({ ...person, initial: v })}
      min={0}
      max={100000}
      step={100}
      unit="만원"
    />

    <InputGroup
      label="월 투자액"
      value={person.monthly}
      onChange={(v) => setPerson({ ...person, monthly: v })}
      min={0}
      max={1000}
      step={10}
      unit="만원"
    />

    <InputGroup
      label="투자액 증가율"
      value={person.monthlyGrowthRate}
      onChange={(v) => setPerson({ ...person, monthlyGrowthRate: v })}
      min={0}
      max={10}
      step={0.1}
      unit="%/년"
    />

    <InputGroup
      label="연 수익률"
      value={person.rate}
      onChange={(v) => setPerson({ ...person, rate: v })}
      min={0}
      max={30}
      step={0.5}
      unit="%"
    />

    <InputGroup
      label="연봉"
      value={person.salary}
      onChange={(v) => setPerson({ ...person, salary: v })}
      min={0}
      max={50000}
      step={100}
      unit="만원"
    />

    {showRetirement && (
      <InputGroup
        label="은퇴 시점"
        value={person.retireYear}
        onChange={(v) => setPerson({ ...person, retireYear: v })}
        min={1}
        max={40}
        step={1}
        unit="년 후"
      />
    )}

    <div className="mt-4 p-3 bg-gray-50 rounded">
      <div className="text-sm text-gray-600">저축률</div>
      <div className="text-2xl font-bold text-blue-600">
        {person.salary > 0 ? ((person.monthly / (person.salary / 12)) * 100).toFixed(1) : 0}%
      </div>
    </div>
  </div>
);

export default PersonCard;
