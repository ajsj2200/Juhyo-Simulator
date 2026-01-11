import { useSimulator } from '../../contexts/SimulatorContext';
import { PersonCard, PresetButtons } from '../index';

const ComparisonView = () => {
  const {
    other,
    setOther,
    otherUseCompound,
    setOtherUseCompound,
    applyPreset,
  } = useSimulator();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-heading-1 mb-2">비교 대상</h1>
        <p className="text-body">다른 투자 전략과 비교해보세요.</p>
      </div>

      {/* Preset Buttons */}
      <PresetButtons
        onApplyPreset={applyPreset}
        useCompound={otherUseCompound}
        onToggleCompound={setOtherUseCompound}
      />

      {/* Comparison Person Card */}
      <PersonCard
        person={other}
        setPerson={setOther}
        color="border-red-500"
      />
    </div>
  );
};

export default ComparisonView;
