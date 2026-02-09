import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  Syringe, 
  Stethoscope, 
  Pill, 
  Loader2,
  TrendingUp
} from 'lucide-react';

interface ReportData {
  commonDiseases: { diagnosis: string; count: number }[];
  vaccinationCoverage: { total: number; completed: number; scheduled: number; missed: number };
  followUpCompletion: { total: number; completed: number };
  vetWorkload: { vet_name: string; cases: number }[];
  medicationCompliance: { total: number; completed: number; ongoing: number; discontinued: number };
}

export function AdminReports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    // Fetch common diseases from treatment records
    const { data: treatments } = await supabase
      .from('treatment_records')
      .select('final_diagnosis')
      .not('final_diagnosis', 'is', null);

    const diseaseCounts: Record<string, number> = {};
    treatments?.forEach(t => {
      if (t.final_diagnosis) {
        diseaseCounts[t.final_diagnosis] = (diseaseCounts[t.final_diagnosis] || 0) + 1;
      }
    });
    const commonDiseases = Object.entries(diseaseCounts)
      .map(([diagnosis, count]) => ({ diagnosis, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Fetch vaccination coverage
    const { data: vaccinations } = await supabase
      .from('vaccination_history')
      .select('vaccination_status');

    const vaccinationCoverage = {
      total: vaccinations?.length || 0,
      completed: vaccinations?.filter(v => v.vaccination_status === 'completed').length || 0,
      scheduled: vaccinations?.filter(v => v.vaccination_status === 'scheduled').length || 0,
      missed: vaccinations?.filter(v => v.vaccination_status === 'missed').length || 0,
    };

    // Follow-up completion
    const { data: followUps } = await supabase
      .from('schedules')
      .select('status')
      .eq('appointment_type', 'follow_up');

    const followUpCompletion = {
      total: followUps?.length || 0,
      completed: followUps?.filter(f => f.status === 'completed').length || 0,
    };

    // Vet workload
    const { data: vetTreatments } = await supabase
      .from('treatment_records')
      .select('vet_id');

    const vetCounts: Record<string, number> = {};
    vetTreatments?.forEach(t => {
      vetCounts[t.vet_id] = (vetCounts[t.vet_id] || 0) + 1;
    });

    const vetIds = Object.keys(vetCounts);
    const vetWorkload: { vet_name: string; cases: number }[] = [];
    for (const vetId of vetIds) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', vetId)
        .single();
      vetWorkload.push({
        vet_name: profile?.full_name || 'Unknown',
        cases: vetCounts[vetId],
      });
    }
    vetWorkload.sort((a, b) => b.cases - a.cases);

    // Medication compliance
    const { data: meds } = await supabase
      .from('treatment_records')
      .select('course_completion_status')
      .not('prescribed_medication', 'is', null);

    const medicationCompliance = {
      total: meds?.length || 0,
      completed: meds?.filter(m => m.course_completion_status === 'completed').length || 0,
      ongoing: meds?.filter(m => m.course_completion_status === 'ongoing').length || 0,
      discontinued: meds?.filter(m => m.course_completion_status === 'discontinued').length || 0,
    };

    setData({
      commonDiseases,
      vaccinationCoverage,
      followUpCompletion,
      vetWorkload,
      medicationCompliance,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const vaccinationPct = data.vaccinationCoverage.total > 0 
    ? Math.round((data.vaccinationCoverage.completed / data.vaccinationCoverage.total) * 100) 
    : 0;
  const followUpPct = data.followUpCompletion.total > 0
    ? Math.round((data.followUpCompletion.completed / data.followUpCompletion.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Syringe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{vaccinationPct}%</p>
                <p className="text-xs text-muted-foreground">Vaccination Coverage</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{followUpPct}%</p>
                <p className="text-xs text-muted-foreground">Follow-up Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Pill className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.medicationCompliance.ongoing}</p>
                <p className="text-xs text-muted-foreground">Ongoing Medications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.commonDiseases.length}</p>
                <p className="text-xs text-muted-foreground">Unique Diagnoses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Common Diseases */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Most Common Diseases
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.commonDiseases.length === 0 ? (
              <p className="text-muted-foreground text-sm">No diagnosis data available</p>
            ) : (
              <div className="space-y-3">
                {data.commonDiseases.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{d.diagnosis}</span>
                    <Badge variant="outline">{d.count} cases</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vet Workload */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Vet Workload Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.vetWorkload.length === 0 ? (
              <p className="text-muted-foreground text-sm">No workload data available</p>
            ) : (
              <div className="space-y-3">
                {data.vetWorkload.map((v, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Stethoscope className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">Dr. {v.vet_name}</span>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      {v.cases} treatments
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vaccination Coverage Details */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Syringe className="w-5 h-5 text-primary" />
              Vaccination Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                <span className="text-sm">Completed</span>
                <Badge variant="outline" className="bg-success/20 text-success-foreground">{data.vaccinationCoverage.completed}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10">
                <span className="text-sm">Scheduled</span>
                <Badge variant="outline" className="bg-warning/20 text-warning-foreground">{data.vaccinationCoverage.scheduled}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                <span className="text-sm">Missed</span>
                <Badge variant="outline" className="bg-destructive/20 text-destructive">{data.vaccinationCoverage.missed}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medication Compliance */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              Medication Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                <span className="text-sm">Completed Courses</span>
                <Badge variant="outline" className="bg-success/20 text-success-foreground">{data.medicationCompliance.completed}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10">
                <span className="text-sm">Ongoing</span>
                <Badge variant="outline" className="bg-warning/20 text-warning-foreground">{data.medicationCompliance.ongoing}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                <span className="text-sm">Discontinued</span>
                <Badge variant="outline" className="bg-destructive/20 text-destructive">{data.medicationCompliance.discontinued}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
