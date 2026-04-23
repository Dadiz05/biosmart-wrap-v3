import PHGauge from "./PHGauge";

type BioSmartScanResultProps = {
  currentPH: number;
  onScanNext?: () => void;
  onGoHome?: () => void;
  qrId?: string | null;
  onViewDetails?: (qrId: string) => void;
};

export default function BioSmartScanResult({ currentPH, onScanNext, onGoHome, qrId, onViewDetails }: BioSmartScanResultProps) {
  return <PHGauge currentPH={currentPH} onScanNext={onScanNext} onGoHome={onGoHome} qrId={qrId} onViewDetails={onViewDetails} />;
}