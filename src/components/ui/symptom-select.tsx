import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STANDARD_SYMPTOMS } from '@/lib/symptoms';

interface SymptomSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  excludeSymptoms?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function SymptomSelect({ 
  value, 
  onValueChange, 
  excludeSymptoms = [], 
  placeholder = "Select symptom",
  disabled = false 
}: SymptomSelectProps) {
  const availableSymptoms = STANDARD_SYMPTOMS.filter(
    symptom => !excludeSymptoms.includes(symptom) || symptom === value
  );

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-background border shadow-lg z-50">
        <SelectItem value="none">None</SelectItem>
        {availableSymptoms.map((symptom) => (
          <SelectItem key={symptom} value={symptom}>
            {symptom}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
