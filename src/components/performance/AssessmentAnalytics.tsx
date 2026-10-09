import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search,
  Printer,
  Edit,
  Trash2,
  TrendingUp,
  BarChart3,
  Calendar,
  User,
  Activity,
  Award,
  Loader2,
  Clock,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { PerformanceAssessmentPayload, PerformanceProtocol } from './performanceTypes';
import { AssessmentReportModal } from '@/components/performance/AssessmentReportModal';

interface Props {
  onEditAssessment?: (assessmentId: string) => void;
}

export default function AssessmentAnalytics({ onEditAssessment }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAssessmentForModal, setSelectedAssessmentForModal] = useState<any | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch Protocols
  const { data: protocols = [] } = useQuery<PerformanceProtocol[]>({
    queryKey: ['performance-protocols'],
    queryFn: () => apiFetch('/performance/protocols')
  });

  // Fetch Assessments
  const { data: assessments = [], isLoading: assessmentsLoading } = useQuery<any[]>({
    queryKey: ['performance-assessments', selectedSport, selectedStatus],
    queryFn: () => apiFetch(`/performance/assessments?sport=${selectedSport}&status=${selectedStatus}&limit=100`)
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/performance/assessments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-assessments'] });
      toast({ title: 'Assessment Deleted', description: 'Record removed successfully.' });
      setDeleteConfirmId(null);
    },
    onError: (err: any) => {
      toast({ title: 'Delete Failed', description: err.message, variant: 'destructive' });
      setDeleteConfirmId(null);
    }
  });

  // Filtered List
  const filteredAssessments = useMemo(() => {
    return assessments.filter((a: any) => {
      const q = searchQuery.toLowerCase();
      const matchName = (a.athlete_name || '').toLowerCase().includes(q);
      const matchUhid = (a.athlete_uhid || '').toLowerCase().includes(q);
      const matchSport = (a.sport_name || a.athlete_sport || '').toLowerCase().includes(q);
      const matchBatch = (a.batch_or_squad || '').toLowerCase().includes(q);
      return matchName || matchUhid || matchSport || matchBatch;
    });
  }, [assessments, searchQuery]);

  // Aggregate Longitudinal Trend Data
  const trendData = useMemo(() => {
    return assessments
      .filter((a: any) => a.assessment_date)
      .slice(0, 15)
      .reverse()
      .map((a: any) => ({
        date: String(a.assessment_date).split('T')[0],
        athlete: a.athlete_name,
        fms: a.fms_data?.total_score || 0,
        jump: parseFloat(a.power_speed_data?.vertical_jump) || 0,
        vo2: parseFloat(a.aerobic_data?.vo2_max_calculated) || 0
      }));
  }, [assessments]);

  const handleOpenReport = async (assessmentId: string) => {
    try {
      const full = await apiFetch(`/performance/assessments/${assessmentId}`);
      setSelectedAssessmentForModal(full);
      setReportModalOpen(true);
    } catch (e: any) {
      toast({ title: 'Failed to load report', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ─────────────────────────────────────────────────────────────
          1. ANALYTICS HERO & TREND CHARTS
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Recorded Tests</span>
            <p className="text-3xl font-black text-slate-900 mt-1">{assessments.length}</p>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> All Validated Batteries
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Finalized Assessments</span>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {assessments.filter((a: any) => a.status === 'completed').length}
            </p>
            <span className="text-[10px] text-slate-500 font-bold mt-1">Locked Clinical Diagnostics</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">In-Progress Drafts</span>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {assessments.filter((a: any) => a.status === 'draft').length}
            </p>
            <span className="text-[10px] text-amber-600 font-bold mt-1">Editable in Station Grid</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Longitudinal Progression Chart */}
      {trendData.length > 0 && (
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Longitudinal Cohort Performance Progression
            </CardTitle>
            <CardDescription>Recent assessment timeline across FMS scores, jump power, and aerobic capacity.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="fms" stroke="#6366f1" strokeWidth={2.5} name="FMS Total" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="jump" stroke="#10b981" strokeWidth={2.5} name="CMJ Jump (cm)" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="vo2" stroke="#f59e0b" strokeWidth={2.5} name="VO2 Max (mL/kg/min)" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. HISTORICAL ASSESSMENTS TABLE WITH FILTERS
          ───────────────────────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        <div className="p-4 sm:p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/60">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Historical Assessment Logs</h3>
            <p className="text-xs text-slate-500">View, print diagnostic sheets, or edit test records.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 min-w-[180px] md:w-56 lg:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search athlete or squad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white h-10 pl-9 text-xs border-slate-300 w-full"
              />
            </div>

            <Select value={selectedSport} onValueChange={(val) => setSelectedSport(val)}>
              <SelectTrigger className="bg-white h-10 text-xs font-semibold w-full sm:w-36 md:w-36 lg:w-40 border-slate-300">
                <SelectValue placeholder="Sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                <SelectItem value="Badminton">Badminton</SelectItem>
                <SelectItem value="Tennis">Tennis</SelectItem>
                <SelectItem value="Padel">Padel</SelectItem>
                <SelectItem value="Cricket">Cricket</SelectItem>
                <SelectItem value="Football">Football</SelectItem>
                <SelectItem value="Equestrian/Fencing">Equestrian/Fencing</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val)}>
              <SelectTrigger className="bg-white h-10 text-xs font-semibold w-full sm:w-28 md:w-28 lg:w-32 border-slate-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-black text-xs uppercase text-slate-700 whitespace-nowrap">Athlete Name</TableHead>
                <TableHead className="font-black text-xs uppercase text-slate-700 whitespace-nowrap">Testing Date</TableHead>
                <TableHead className="font-black text-xs uppercase text-slate-700 whitespace-nowrap">Sport Protocol</TableHead>
                <TableHead className="font-black text-xs uppercase text-slate-700 whitespace-nowrap">Squad / Batch</TableHead>
                <TableHead className="font-black text-xs uppercase text-slate-700 whitespace-nowrap">Lead Assessor</TableHead>
                <TableHead className="font-black text-xs uppercase text-slate-700 text-center whitespace-nowrap">Status</TableHead>
                <TableHead className="font-black text-xs uppercase text-slate-700 text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {assessmentsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-xs text-slate-500 mt-2 font-bold">Loading historical assessments...</p>
                  </TableCell>
                </TableRow>
              ) : filteredAssessments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <Activity className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-700 mt-2">No assessments recorded.</p>
                    <p className="text-xs text-slate-400">Launch an assessment from the Individual Form or Group Testing Grid.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssessments.map((a: any) => (
                  <TableRow key={a.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                    <TableCell className="font-bold text-xs text-slate-900 whitespace-nowrap">
                      <div>{a.athlete_name}</div>
                      <span className="text-[10px] text-slate-400 font-normal">UHID: {a.athlete_uhid}</span>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600 whitespace-nowrap">
                      {String(a.assessment_date || '').split('T')[0]}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      <Badge variant="outline" className="font-bold text-[10px]">
                        {a.sport_name || a.athlete_sport || 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600 whitespace-nowrap">
                      {a.batch_or_squad || '—'}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600 whitespace-nowrap">
                      {a.assessor_name || 'Staff Specialist'}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-black uppercase ${
                          a.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenReport(a.id)}
                          className="h-8 px-2.5 text-xs font-bold gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" /> Sheet
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditAssessment && onEditAssessment(a.id)}
                          className="h-8 w-8 p-0"
                          title="Edit Assessment"
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(a.id)}
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete Assessment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Printable Report Modal */}
      {selectedAssessmentForModal && (
        <AssessmentReportModal
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
          assessment={selectedAssessmentForModal}
        />
      )}

      {/* Confirmation Dialog for Deletion */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-black uppercase">Confirm Assessment Removal</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete this performance assessment record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CheckCircle2(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>;
}
