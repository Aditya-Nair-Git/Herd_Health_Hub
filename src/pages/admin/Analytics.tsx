import { useEffect, useState, Component, type ReactNode } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Loader2, Syringe, ClipboardCheck, Pill, Stethoscope, AlertTriangle, RefreshCw } from 'lucide-react';

class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error('Chart render error:', error); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <AlertTriangle className="w-6 h-6 mb-2" />
          <p className="text-sm">Chart failed to render</p>
        </div>
      );
    }
    return this.props.children;
  }
}

type TicketRow = { status: string; priority: string };
type AnimalRow = { animal_status: string | null };
type TreatmentRow = { vet_id: string };
type ProfileRow = { user_id: string; full_name: string };
type VaccinationRow = { vaccination_status: string };
type TreatmentDetailRow = { follow_up_required: boolean | null; follow_up_date: string | null; course_completion_status: string | null; prescribed_medication: string | null; final_diagnosis: string | null };

const STATUS_LABELS: Record<string, string> = {
  created: 'Created',
  assigned: 'Assigned',
  waiting_for_slot: 'Waiting',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PRIORITY_COLORS: Record<string, string> = {
  normal: 'hsl(var(--chart-1))',
  urgent: 'hsl(var(--chart-2))',
  emergency: 'hsl(var(--chart-3))',
};

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'hsl(142 71% 45%)',
  under_treatment: 'hsl(38 92% 50%)',
  critical: 'hsl(0 84% 60%)',
  recovering: 'hsl(199 89% 48%)',
  vaccination_due: 'hsl(262 83% 58%)',
  deceased: 'hsl(0 0% 45%)',
};

const HEALTH_LABELS: Record<string, string> = {
  healthy: 'Healthy',
  under_treatment: 'Under Treatment',
  critical: 'Critical',
  recovering: 'Recovering',
  vaccination_due: 'Vaccination Due',
  deceased: 'Deceased',
};

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<{ status: string; normal: number; urgent: number; emergency: number }[]>([]);
  const [healthData, setHealthData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [workloadData, setWorkloadData] = useState<{ name: string; treatments: number }[]>([]);
  const [kpis, setKpis] = useState({ vaccinationCoverage: 0, followUpCompletion: 0, ongoingMeds: 0, uniqueDiagnoses: 0 });

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [ticketsRes, animalsRes, treatmentsRes, profilesRes, vaccinationsRes, treatmentDetailsRes] = await Promise.all([
        supabase.from('tickets').select('status, priority').eq('is_active', true),
        supabase.from('animals').select('animal_status').eq('is_active', true),
        supabase.from('treatment_records').select('vet_id'),
        supabase.from('profiles').select('user_id, full_name').eq('role', 'vet'),
        supabase.from('vaccination_history').select('vaccination_status'),
        supabase.from('treatment_records').select('follow_up_required, follow_up_date, course_completion_status, prescribed_medication, final_diagnosis'),
      ]);

      const queries = { tickets: ticketsRes, animals: animalsRes, treatments: treatmentsRes, profiles: profilesRes, vaccinations: vaccinationsRes, treatmentDetails: treatmentDetailsRes };
      const errors: string[] = [];
      for (const [name, res] of Object.entries(queries)) {
        if (res.error) {
          console.error(`Analytics query "${name}" failed:`, res.error);
          errors.push(`${name}: ${res.error.message}`);
        }
      }
      if (errors.length > 0) {
        setError(`Some data failed to load: ${errors.join('; ')}`);
      }

      const tickets = (ticketsRes.data ?? []) as TicketRow[];
      const statusMap: Record<string, Record<string, number>> = {};
      for (const t of tickets) {
        if (!statusMap[t.status]) statusMap[t.status] = { normal: 0, urgent: 0, emergency: 0 };
        statusMap[t.status][t.priority] = (statusMap[t.status][t.priority] || 0) + 1;
      }
      setTicketData(
        Object.keys(STATUS_LABELS).filter(s => statusMap[s]).map(s => ({
          status: STATUS_LABELS[s],
          ...statusMap[s],
          normal: statusMap[s].normal || 0,
          urgent: statusMap[s].urgent || 0,
          emergency: statusMap[s].emergency || 0,
        }))
      );

      const animals = (animalsRes.data ?? []) as AnimalRow[];
      const healthMap: Record<string, number> = {};
      for (const a of animals) {
        const s = a.animal_status || 'healthy';
        healthMap[s] = (healthMap[s] || 0) + 1;
      }
      setHealthData(
        Object.entries(healthMap).map(([k, v]) => ({
          name: HEALTH_LABELS[k] || k,
          value: v,
          color: HEALTH_COLORS[k] || 'hsl(var(--muted))',
        }))
      );

      const treatments = (treatmentsRes.data ?? []) as TreatmentRow[];
      const profiles = (profilesRes.data ?? []) as ProfileRow[];
      const nameMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
      const vetCount: Record<string, number> = {};
      for (const t of treatments) {
        vetCount[t.vet_id] = (vetCount[t.vet_id] || 0) + 1;
      }
      setWorkloadData(
        Object.entries(vetCount)
          .sort((a, b) => b[1] - a[1])
          .map(([id, count]) => ({ name: nameMap[id] || id.slice(0, 8), treatments: count }))
      );

      const vaccinations = (vaccinationsRes.data ?? []) as VaccinationRow[];
      const completedVax = vaccinations.filter(v => v.vaccination_status === 'completed').length;
      const vaccinationCoverage = vaccinations.length ? Math.round((completedVax / vaccinations.length) * 100) : 0;

      const details = (treatmentDetailsRes.data ?? []) as TreatmentDetailRow[];
      const needFollowUp = details.filter(d => d.follow_up_required);
      const doneFollowUp = needFollowUp.filter(d => d.course_completion_status === 'completed');
      const followUpCompletion = needFollowUp.length ? Math.round((doneFollowUp.length / needFollowUp.length) * 100) : 0;
      const ongoingMeds = details.filter(d => d.course_completion_status === 'ongoing' && d.prescribed_medication).length;
      const uniqueDiagnoses = new Set(details.map(d => d.final_diagnosis).filter(Boolean)).size;

      setKpis({ vaccinationCoverage, followUpCompletion, ongoingMeds, uniqueDiagnoses });
    } catch (err) {
      console.error('Analytics fetchAll crashed:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  const ticketChartConfig = {
    normal: { label: 'Normal', color: PRIORITY_COLORS.normal },
    urgent: { label: 'Urgent', color: PRIORITY_COLORS.urgent },
    emergency: { label: 'Emergency', color: PRIORITY_COLORS.emergency },
  };

  const workloadChartConfig = {
    treatments: { label: 'Treatments', color: 'hsl(var(--primary))' },
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold text-foreground">Analytics</h1>

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="w-4 h-4 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Vaccination Coverage" value={`${kpis.vaccinationCoverage}%`} icon={<Syringe className="w-5 h-5" />} />
          <StatCard title="Follow-up Completion" value={`${kpis.followUpCompletion}%`} icon={<ClipboardCheck className="w-5 h-5" />} />
          <StatCard title="Ongoing Medications" value={kpis.ongoingMeds} icon={<Pill className="w-5 h-5" />} />
          <StatCard title="Unique Diagnoses" value={kpis.uniqueDiagnoses} icon={<Stethoscope className="w-5 h-5" />} />
        </div>

        {/* Ticket Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ticket Stats by Status & Priority</CardTitle>
          </CardHeader>
          <CardContent>
            {ticketData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No ticket data available</p>
            ) : (
              <ChartErrorBoundary>
                <ChartContainer config={ticketChartConfig} className="h-[300px] w-full">
                  <BarChart data={ticketData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="status" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="normal" fill="var(--color-normal)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="urgent" fill="var(--color-urgent)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="emergency" fill="var(--color-emergency)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </ChartErrorBoundary>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Animal Health Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Animal Health Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {healthData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No animal data available</p>
              ) : (
                <ChartErrorBoundary>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={healthData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {healthData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartErrorBoundary>
              )}
            </CardContent>
          </Card>

          {/* Vet Workload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vet Workload</CardTitle>
            </CardHeader>
            <CardContent>
              {workloadData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No treatment data available</p>
              ) : (
                <ChartErrorBoundary>
                  <ChartContainer config={workloadChartConfig} className="h-[300px] w-full">
                    <BarChart data={workloadData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} className="fill-muted-foreground" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="treatments" fill="var(--color-treatments)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                </ChartErrorBoundary>
              )}
            </CardContent>
          </Card>
        </div>
    </DashboardLayout>
  );
}
