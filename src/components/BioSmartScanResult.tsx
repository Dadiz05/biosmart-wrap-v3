import PHGauge from "./PHGauge";

type BioSmartScanResultProps = {
  currentPH: number;
  onScanNext?: () => void;
  onGoHome?: () => void;
};

export default function BioSmartScanResult({ currentPH, onScanNext, onGoHome }: BioSmartScanResultProps) {
  return <PHGauge currentPH={currentPH} onScanNext={onScanNext} onGoHome={onGoHome} />;
}