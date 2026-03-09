import { useDiseasePrediction } from '@/hooks/useDiseasePrediction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Brain, Loader2 } from 'lucide-react';

interface DecisionSupportPanelProps {
  ticketId: string;
}

export function DecisionSupportPanel({ ticketId }: DecisionSupportPanelProps) {
  const { predictions, loading, error } = useDiseasePrediction(ticketId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Analyzing symptoms...
      </div>
    );
  }

  if (error || predictions.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-sm">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          Decision Support — Suggested Diagnoses
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        <div className="space-y-1.5">
          {predictions.map((p, i) => (
            <div key={p.disease_id} className="flex items-center justify-between py-1.5 px-2 rounded bg-background/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                <span className="text-sm font-medium">{p.disease_name}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Score: {p.score}
              </Badge>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-warning flex-shrink-0" />
          <p>These suggestions are automatically generated to assist diagnosis. Final diagnosis must be confirmed by the veterinarian.</p>
        </div>
      </CardContent>
    </Card>
  );
}
