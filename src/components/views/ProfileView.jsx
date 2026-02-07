import { useSimulator } from '../../contexts/SimulatorContext';
import { PersonCard } from '../index';
import Card from '../ui/Card';
import InputGroup from '../InputGroup';

const ProfileView = () => {
  const { you, setYou, years, setYears } = useSimulator();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2 dark:text-slate-100">내 정보</h1>
        <p className="text-body dark:text-slate-300">투자 시뮬레이션을 위한 개인 정보를 입력하세요.</p>
      </div>

      {/* Investment Period */}
      <Card variant="blue">
        <h3 className="text-heading-3 mb-4 dark:text-slate-100">투자 기간</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-200">
              투자 기간: <span className="text-blue-600 font-bold">{years}년</span>
            </label>
            <input
              type="range"
              min="1"
              max="70"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:bg-slate-700"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1 dark:text-slate-400">
              <span>1년</span>
              <span>35년</span>
              <span>70년</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Person Card */}
      <PersonCard
        person={you}
        setPerson={setYou}
        color="border-blue-500"
        showRetirement
      />
    </div>
  );
};

export default ProfileView;
