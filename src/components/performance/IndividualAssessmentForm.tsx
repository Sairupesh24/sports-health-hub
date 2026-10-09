import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronRight,
  Flame,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  User,
  Zap,
  Activity,
  Printer
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip
} from 'recharts';

import {
  PerformanceProtocol,
  AthleteDemographic,
  PerformanceAssessmentPayload,
  BiomotorTier,
  BiomotorRatings
} from './performanceTypes';
import {
  calculateFMS,
  calculateYBT,
  calculateSayersPower,
  calculateDropJumpRSI,
  calculateRAST,
  calculateYoYoVO2Max,
  transformBiomotorToRadar,
  BIOMOTOR_LEVEL_COLORS,
  BIOMOTOR_LEVEL_MAP
} from './calculationEngine';
import { AssessmentReportModal } from '@/components/performance/AssessmentReportModal';

interface Props {
  initialAthleteId?: string;
  initialProtocolSlug?: string;
  assessmentId?: string;
  onSuccess?: () => void;
}

export default function IndividualAssessmentForm({
  initialAthleteId,
  initialProtocolSlug,
  assessmentId,
  onSuccess
}: Props) {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search & Selection state
  const [athleteSearch, setAthleteSearch] = useState('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(initialAthleteId || '');
  const [selectedProtocolSlug, setSelectedProtocolSlug] = useState<string>(initialProtocolSlug || 'badminton-assessment');
  const [assessmentDate, setAssessmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [batchSquad, setBatchSquad] = useState<string>('');
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Form payload states
  const [needsAnalysis, setNeedsAnalysis] = useState<any>({
    sport_training_age: '',
    strength_training_age: '',
    other_sports: '',
    role: '',
    dominant_foot: 'Right',
    dominant_hand: 'Right',
    playing_hand: 'Right',
    position: '',
    discipline: ''
  });

  const [anthropometrics, setAnthropometrics] = useState<any>({
    standing_height: '',
    sitting_height: '',
    weight: '',
    skeletal_muscle_mass: '',
    body_fat_pct: '',
    desired_fat_pct: '',
    arm_span: '',
    lower_limb_length_r: '',
    lower_limb_length_l: '',
    upper_limb_length_r: '',
    upper_limb_length_l: ''
  });

  const [fmsData, setFmsData] = useState<any>({
    ohs: { final: 3 },
    hurdle_step: { right: 3, left: 3, clearing: false },
    inline_lunge: { right: 3, left: 3, clearing: false },
    shoulder_mobility: { right: 3, left: 3, clearing: false },
    aslr: { right: 3, left: 3, clearing: false },
    trunk_pushup: { right: 3, left: 3, clearing: false },
    rotary_stability: { right: 3, left: 3, clearing: false },
    ankle_dorsiflexion_r: '',
    ankle_dorsiflexion_l: '',
    observations: ''
  });

  const [stabilityData, setStabilityData] = useState<any>({
    ybt_lq_anterior_r: '',
    ybt_lq_anterior_l: '',
    ybt_lq_pm_r: '',
    ybt_lq_pm_l: '',
    ybt_lq_pl_r: '',
    ybt_lq_pl_l: '',
    ybt_uq_medial_r: '',
    ybt_uq_medial_l: '',
    ybt_uq_sl_r: '',
    ybt_uq_sl_l: '',
    ybt_uq_il_r: '',
    ybt_uq_il_l: '',
    bess_firm_double: 0,
    bess_firm_single: 0,
    bess_firm_tandem: 0,
    bess_foam_double: 0,
    bess_foam_single: 0,
    bess_foam_tandem: 0
  });

  const [powerSpeedData, setPowerSpeedData] = useState<any>({
    vertical_jump: '',
    broad_jump: '',
    drop_jump_height: '',
    drop_jump_contact_time: '',
    mb_throw_overhead: '',
    mb_throw_rotational_r: '',
    mb_throw_rotational_l: '',
    mb_throw_half_kneeling: '',
    mb_throw_watts: '',
    handgrip_r_trial1: '',
    handgrip_r_trial2: '',
    handgrip_l_trial1: '',
    handgrip_l_trial2: '',
    sprint_5m: '',
    sprint_10m: '',
    sprint_20m: '',
    sprint_30m: '',
    sprint_40m: ''
  });

  const [agilityData, setAgilityData] = useState<any>({
    semo_time: '',
    t_agility_time: '',
    y_agility_time: '',
    run_a_3_without_bat: '',
    run_a_3_with_bat: '',
    observations: ''
  });

  const [enduranceData, setEnduranceData] = useState<any>({
    chin_up_hold_sec: '',
    pull_ups_count: '',
    modified_pullup_count: '',
    push_ups_count: '',
    sl_calf_raise_r: '',
    sl_calf_raise_l: '',
    trunk_apl_sec: '',
    trunk_lsl_sec: '',
    trunk_rsl_sec: '',
    trunk_ppl_sec: '',
    trunk_sorenson_sec: '',
    trunk_wall_sit_sec: ''
  });

  const [anaerobicData, setAnaerobicData] = useState<any>({
    test_type: 'mrsat',
    mrsat_stage_completed: 7,
    rast_sprints: [
      { sprint: 1, time_sec: '' },
      { sprint: 2, time_sec: '' },
      { sprint: 3, time_sec: '' },
      { sprint: 4, time_sec: '' },
      { sprint: 5, time_sec: '' },
      { sprint: 6, time_sec: '' }
    ]
  });

  const [aerobicData, setAerobicData] = useState<any>({
    test_variant: 'Yo-Yo IR1',
    resting_hr: '',
    max_hr: '',
    recovery_hr_1min: '',
    distance_meters: '',
    level_shuttle: ''
  });

  const [biomotorRatings, setBiomotorRatings] = useState<BiomotorRatings>({
    Balance: 'Good',
    Flexibility: 'Average',
    Power: 'Good',
    Speed: 'Good',
    Agility: 'Good',
    Strength: 'Average',
    Anaerobic: 'Average',
    Aerobic: 'Good'
  });

  const [correctivePlan, setCorrectivePlan] = useState('');
  const [planOfAction, setPlanOfAction] = useState('');
  const [overallImpression, setOverallImpression] = useState('');

  // 1. Fetch Protocols
  const { data: protocols = [] } = useQuery<PerformanceProtocol[]>({
    queryKey: ['performance-protocols'],
    queryFn: () => apiFetch('/performance/protocols')
  });

  const activeProtocol = useMemo(() => {
    return protocols.find(p => p.slug === selectedProtocolSlug || p.id === selectedProtocolSlug) || protocols[0];
  }, [protocols, selectedProtocolSlug]);

  // 2. Fetch Athletes Search List
  const { data: athletes = [], isLoading: athletesLoading } = useQuery<AthleteDemographic[]>({
    queryKey: ['performance-athletes-search', athleteSearch],
    queryFn: () => apiFetch(`/performance/athletes?q=${encodeURIComponent(athleteSearch)}&limit=30`)
  });

  // 3. Fetch Selected Athlete Full Demographics & Injuries
  const { data: selectedAthlete, isLoading: athleteLoading } = useQuery<AthleteDemographic>({
    queryKey: ['performance-athlete-profile', selectedAthleteId],
    queryFn: () => apiFetch(`/performance/athletes/${selectedAthleteId}`),
    enabled: !!selectedAthleteId
  });

  // 4. Auto-select protocol matching athlete's sport when athlete changes
  useEffect(() => {
    if (selectedAthlete?.sport && !assessmentId) {
      const sportLower = selectedAthlete.sport.toLowerCase();
      const matched = protocols.find(p => p.sport_name.toLowerCase().includes(sportLower) || sportLower.includes(p.sport_name.toLowerCase()));
      if (matched) {
        setSelectedProtocolSlug(matched.slug);
      }
    }
  }, [selectedAthlete, protocols, assessmentId]);

  // 5. Fetch Client Groups created by Sports Scientists in Manage Groups
  const { data: clientGroups = [] } = useQuery<any[]>({
    queryKey: ['client-groups-all'],
    queryFn: () => apiFetch('/clients/groups/all')
  });

  // Auto-populate Squad / Batch if selected athlete belongs to a client group
  useEffect(() => {
    if (selectedAthleteId && clientGroups.length > 0 && !batchSquad && !assessmentId) {
      const matchGroup = clientGroups.find((g: any) =>
        (g.client_group_members || []).some((m: any) => m.client_id === selectedAthleteId)
      );
      if (matchGroup) {
        setBatchSquad(matchGroup.name);
      }
    }
  }, [selectedAthleteId, clientGroups, assessmentId]);

  // 5. If assessmentId provided, load existing assessment
  const { data: existingAssessment } = useQuery<PerformanceAssessmentPayload>({
    queryKey: ['performance-assessment-edit', assessmentId],
    queryFn: () => apiFetch(`/performance/assessments/${assessmentId}`),
    enabled: !!assessmentId
  });

  useEffect(() => {
    if (existingAssessment) {
      setSelectedAthleteId(existingAssessment.athlete_id);
      if (existingAssessment.protocol_id) {
        const found = protocols.find(p => p.id === existingAssessment.protocol_id);
        if (found) setSelectedProtocolSlug(found.slug);
      }
      setAssessmentDate(String(existingAssessment.assessment_date || '').split('T')[0]);
      setBatchSquad(existingAssessment.batch_or_squad || '');
      if (existingAssessment.needs_analysis) setNeedsAnalysis(existingAssessment.needs_analysis);
      if (existingAssessment.anthropometrics) setAnthropometrics(existingAssessment.anthropometrics);
      if (existingAssessment.fms_data) setFmsData(existingAssessment.fms_data);
      if (existingAssessment.stability_data) setStabilityData(existingAssessment.stability_data);
      if (existingAssessment.power_speed_data) setPowerSpeedData(existingAssessment.power_speed_data);
      if (existingAssessment.agility_data) setAgilityData(existingAssessment.agility_data);
      if (existingAssessment.endurance_data) setEnduranceData(existingAssessment.endurance_data);
      if (existingAssessment.anaerobic_data) setAnaerobicData(existingAssessment.anaerobic_data);
      if (existingAssessment.aerobic_data) setAerobicData(existingAssessment.aerobic_data);
      if (existingAssessment.biomotor_ratings) setBiomotorRatings(existingAssessment.biomotor_ratings);
      setCorrectivePlan(existingAssessment.corrective_plan || '');
      setPlanOfAction(existingAssessment.plan_of_action || '');
      setOverallImpression(existingAssessment.overall_impression || '');
    }
  }, [existingAssessment, protocols]);

  // ─────────────────────────────────────────────────────────
  // REAL-TIME CLIENT-SIDE CALCULATIONS
  // ─────────────────────────────────────────────────────────

  // FMS calculation
  const fmsResult = useMemo(() => calculateFMS(fmsData), [fmsData]);

  // YBT calculation
  const ybtResult = useMemo(() => {
    const lLegR = parseFloat(anthropometrics.lower_limb_length_r) || 0;
    const lLegL = parseFloat(anthropometrics.lower_limb_length_l) || 0;
    const uArmR = parseFloat(anthropometrics.upper_limb_length_r) || 0;
    const uArmL = parseFloat(anthropometrics.upper_limb_length_l) || 0;
    return calculateYBT(stabilityData, lLegR, lLegL, uArmR, uArmL);
  }, [stabilityData, anthropometrics]);

  // Sayers Power
  const sayersPower = useMemo(() => {
    const vj = parseFloat(powerSpeedData.vertical_jump) || 0;
    const wt = parseFloat(anthropometrics.weight) || 0;
    return calculateSayersPower(vj, wt);
  }, [powerSpeedData.vertical_jump, anthropometrics.weight]);

  // Drop Jump RSI
  const dropJumpRSI = useMemo(() => {
    const ht = parseFloat(powerSpeedData.drop_jump_height) || 0;
    const ct = parseFloat(powerSpeedData.drop_jump_contact_time) || 0;
    return calculateDropJumpRSI(ht, ct);
  }, [powerSpeedData.drop_jump_height, powerSpeedData.drop_jump_contact_time]);

  // RAST calculations
  const rastResult = useMemo(() => {
    const times = (anaerobicData.rast_sprints || []).map((s: any) => parseFloat(s.time_sec) || 0);
    const wt = parseFloat(anthropometrics.weight) || 0;
    return calculateRAST(times, wt);
  }, [anaerobicData.rast_sprints, anthropometrics.weight]);

  // Yo-Yo VO2 Max
  const yoyoVO2Max = useMemo(() => {
    const dist = parseFloat(aerobicData.distance_meters) || 0;
    return calculateYoYoVO2Max(dist, aerobicData.test_variant);
  }, [aerobicData.distance_meters, aerobicData.test_variant]);

  // Radar chart data
  const radarData = useMemo(() => {
    const dims = activeProtocol?.sections_config?.biomotor_ratings?.dimensions || [
      'Balance', 'Flexibility', 'Power', 'Speed', 'Agility', 'Strength', 'Anaerobic', 'Aerobic'
    ];
    return transformBiomotorToRadar(biomotorRatings, dims);
  }, [biomotorRatings, activeProtocol]);

  // ─────────────────────────────────────────────────────────
  // MUTATIONS (SAVE & FINALIZE)
  // ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (status: 'draft' | 'completed') => {
      if (!selectedAthleteId) throw new Error('Please select an athlete first.');

      const payload: PerformanceAssessmentPayload = {
        athlete_id: selectedAthleteId,
        protocol_id: activeProtocol?.id,
        assessment_date: assessmentDate,
        batch_or_squad: batchSquad,
        needs_analysis: needsAnalysis,
        anthropometrics: anthropometrics,
        fms_data: {
          ...fmsData,
          total_score: fmsResult.total
        },
        stability_data: {
          ...stabilityData,
          ybt_lq_diff_anterior: ybtResult.lower.diffAnt,
          ybt_lq_diff_pm: ybtResult.lower.diffPm,
          ybt_lq_diff_pl: ybtResult.lower.diffPl,
          ybt_lq_composite_r: ybtResult.lower.compR,
          ybt_lq_composite_l: ybtResult.lower.compL,
          ybt_uq_diff_medial: ybtResult.upper.diffMed,
          ybt_uq_composite_r: ybtResult.upper.compR,
          ybt_uq_composite_l: ybtResult.upper.compL
        },
        power_speed_data: {
          ...powerSpeedData,
          vertical_jump_power_watts: sayersPower,
          drop_jump_rsi: dropJumpRSI
        },
        agility_data: agilityData,
        endurance_data: enduranceData,
        anaerobic_data: {
          ...anaerobicData,
          rast_peak_power: rastResult.peakPower,
          rast_min_power: rastResult.minPower,
          rast_avg_power: rastResult.avgPower,
          rast_fatigue_index: rastResult.fatigueIndex
        },
        aerobic_data: {
          ...aerobicData,
          vo2_max_calculated: yoyoVO2Max
        },
        biomotor_ratings: biomotorRatings,
        corrective_plan: correctivePlan,
        plan_of_action: planOfAction,
        overall_impression: overallImpression,
        status: status
      };

      if (assessmentId) {
        return await apiFetch(`/performance/assessments/${assessmentId}`, {
          method: 'PUT',
          body: payload
        });
      } else {
        return await apiFetch(`/performance/assessments`, {
          method: 'POST',
          body: payload
        });
      }
    },
    onSuccess: (data, status) => {
      queryClient.invalidateQueries({ queryKey: ['performance-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['performance-athlete-profile'] });
      toast({
        title: status === 'completed' ? 'Assessment Finalized!' : 'Draft Saved',
        description: `Assessment for ${selectedAthlete?.full_name || 'athlete'} has been recorded.`,
      });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast({
        title: 'Save Failed',
        description: err.message || 'Unable to record assessment.',
        variant: 'destructive'
      });
    }
  });

  // Helper for FMS buttons
  const renderFMSScoreButtons = (
    currentScore: number | undefined,
    onChange: (val: number) => void
  ) => {
    return (
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(score => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`w-8 h-8 rounded-lg font-black text-xs transition-all ${
              currentScore === score
                ? 'bg-slate-900 text-white shadow-sm scale-105'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
    );
  };

  const assessorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Logged-in Specialist';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ─────────────────────────────────────────────────────────────
          1. DEMOGRAPHIC & PROTOCOL SELECTOR HEADER
          ───────────────────────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-2xl">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="border-primary/40 bg-primary/20 text-emerald-300 font-black uppercase text-[10px] tracking-widest px-2.5 py-0.5">
                  Mode 1: Individual Diagnostic
                </Badge>
                <Badge variant="secondary" className="bg-white/10 text-white text-[10px] font-bold">
                  {activeProtocol?.sport_name || 'Multi-Sport'}
                </Badge>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight font-display">
                Athlete Diagnostic & Performance Assessment
              </h2>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportModalOpen(true)}
                disabled={!selectedAthleteId}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold text-xs gap-2 whitespace-nowrap"
              >
                <Printer className="w-4 h-4" /> Preview / Print Report
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => saveMutation.mutate('draft')}
                disabled={saveMutation.isPending || !selectedAthleteId}
                className="bg-white/20 hover:bg-white/30 text-white border-0 font-bold text-xs gap-1.5 whitespace-nowrap"
              >
                {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Draft
              </Button>
              <Button
                size="sm"
                onClick={() => saveMutation.mutate('completed')}
                disabled={saveMutation.isPending || !selectedAthleteId}
                className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider text-xs px-4 sm:px-5 shadow-lg shadow-primary/30 gap-1.5 whitespace-nowrap"
              >
                {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Finalize Assessment
              </Button>
            </div>
          </div>
        </div>

        {/* Selection Bar */}
        <div className="p-4 sm:p-6 bg-slate-50/70 border-b border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          {/* Athlete Selector */}
          <div className="sm:col-span-1 lg:col-span-4 space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Select Athlete / Client</Label>
            <div className="relative">
              <Select
                value={selectedAthleteId}
                onValueChange={(val) => {
                  setSelectedAthleteId(val);
                }}
              >
                <SelectTrigger className="bg-white h-11 font-bold text-sm border-slate-300">
                  <SelectValue placeholder="Choose athlete..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Type to filter athletes..."
                      value={athleteSearch}
                      onChange={(e) => setAthleteSearch(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  {athletes.map((ath) => (
                    <SelectItem key={ath.id} value={ath.id} className="font-medium text-xs py-2">
                      <div className="flex items-center justify-between w-full gap-4">
                        <span className="font-bold text-slate-900">{ath.full_name}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">UHID: {ath.uhid}</Badge>
                          {ath.sport && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{ath.sport}</Badge>}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sport Protocol Selector */}
          <div className="sm:col-span-1 lg:col-span-3 space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Testing Battery / Protocol</Label>
            <Select
              value={selectedProtocolSlug}
              onValueChange={(slug) => setSelectedProtocolSlug(slug)}
            >
              <SelectTrigger className="bg-white h-11 font-bold text-sm border-slate-300">
                <SelectValue placeholder="Select sport protocol" />
              </SelectTrigger>
              <SelectContent>
                {protocols.map((p) => (
                  <SelectItem key={p.slug} value={p.slug} className="font-semibold text-xs">
                    {p.template_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assessment Date */}
          <div className="sm:col-span-1 lg:col-span-2 space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Date of Testing</Label>
            <Input
              type="date"
              value={assessmentDate}
              onChange={(e) => setAssessmentDate(e.target.value)}
              className="bg-white h-11 font-semibold text-sm border-slate-300"
            />
          </div>

          {/* Squad / Batch */}
          <div className="sm:col-span-1 lg:col-span-3 space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Squad / Batch</Label>
            <Input
              list="perf-squad-client-groups"
              placeholder="e.g. Gen-Pop"
              value={batchSquad}
              onChange={(e) => setBatchSquad(e.target.value)}
              className="bg-white h-11 text-xs border-slate-300 font-semibold"
            />
            <datalist id="perf-squad-client-groups">
              {clientGroups.map((g: any) => (
                <option key={g.id || g.name} value={g.name}>
                  {g.name} ({g.client_group_members?.length || 0} athletes)
                </option>
              ))}
            </datalist>
          </div>
        </div>

        {/* Auto-Populated Demographic Banner */}
        {selectedAthlete && (
          <div className="p-4 sm:p-6 bg-white border-b border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-7 lg:col-span-4 flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-primary/20 shadow-sm bg-slate-100">
                <AvatarFallback className="font-black text-lg bg-primary/10 text-primary">
                  {selectedAthlete.first_name?.[0]}{selectedAthlete.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 leading-tight">{selectedAthlete.full_name}</h3>
                  <Badge variant="outline" className="text-[10px] font-bold px-2 py-0">
                    {selectedAthlete.gender || 'Athlete'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>UHID: <strong className="text-slate-800">{selectedAthlete.uhid}</strong></span>
                  <span>•</span>
                  <span>Age: <strong className="text-slate-800">{selectedAthlete.age || '—'} yrs</strong></span>
                  <span>•</span>
                  <span>Sport: <strong className="text-primary font-bold">{selectedAthlete.sport || 'General'}</strong></span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Mobile: {selectedAthlete.mobile_no || 'N/A'} | DOB: {selectedAthlete.dob ? String(selectedAthlete.dob).split('T')[0] : 'N/A'}
                </div>
              </div>
            </div>

            {/* Assessor details */}
            <div className="md:col-span-5 lg:col-span-3 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6 space-y-1 text-xs">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">Lead Assessor</span>
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" /> {assessorName}
              </p>
              <p className="text-[11px] text-slate-500">ISHPO Certified Performance Specialist</p>
            </div>

            {/* Injury History Populated from injuries table */}
            <div className="md:col-span-12 lg:col-span-5 border-t md:border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  Clinical & Injury History
                </span>
                {selectedAthlete.injuries && selectedAthlete.injuries.length > 0 ? (
                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold uppercase">
                    {selectedAthlete.injuries.length} Recorded
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[9px] font-bold">
                    Clear / No Injuries
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                {selectedAthlete.injuries && selectedAthlete.injuries.length > 0 ? (
                  selectedAthlete.injuries.map((inj, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] bg-rose-50 border border-rose-200 text-rose-800 rounded-md px-2 py-0.5 font-medium flex items-center gap-1"
                      title={inj.notes || ''}
                    >
                      <span>{inj.diagnosis} ({inj.region} {inj.side ? `· ${inj.side}` : ''})</span>
                      <span className="text-[9px] uppercase font-bold text-rose-500">[{inj.status}]</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No past or active musculoskeletal injuries logged in repository.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          2. ASSESSMENT SECTIONS (TABS & DYNAMIC FIELDS)
          ───────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="anthropometrics" className="w-full space-y-6">
        <TabsList className="w-full bg-white border border-slate-200 p-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 h-auto min-h-fit shadow-xs">
          {/* Row 1: Physical & Movement Screening */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
            <TabsTrigger value="needs" className="rounded-xl px-3.5 sm:px-4 py-2 font-black uppercase text-[10px] sm:text-[11px] tracking-wider transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Needs Analysis
            </TabsTrigger>
            <TabsTrigger value="anthropometrics" className="rounded-xl px-3.5 sm:px-4 py-2 font-black uppercase text-[10px] sm:text-[11px] tracking-wider transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Anthropometrics
            </TabsTrigger>
            <TabsTrigger value="fms" className="rounded-xl px-3.5 sm:px-4 py-2 font-black uppercase text-[10px] sm:text-[11px] tracking-wider transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5">
              FMS Screen
              <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold text-white ${fmsResult.total <= 14 ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                {fmsResult.total}
              </span>
            </TabsTrigger>
            <TabsTrigger value="stability" className="rounded-xl px-3.5 sm:px-4 py-2 font-black uppercase text-[10px] sm:text-[11px] tracking-wider transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Stability & YBT
            </TabsTrigger>
            <TabsTrigger value="power_speed" className="rounded-xl px-3.5 sm:px-4 py-2 font-black uppercase text-[10px] sm:text-[11px] tracking-wider transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Power & Speed
            </TabsTrigger>
            <TabsTrigger value="agility" className="rounded-xl px-3.5 sm:px-4 py-2 font-black uppercase text-[10px] sm:text-[11px] tracking-wider transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Agility & Footwork
            </TabsTrigger>
          </div>

          {/* Row 2: Capacity, Energy Systems, Synthesis & Action Plan */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
            <TabsTrigger value="endurance" className="rounded-xl px-3.5 sm:px-4 py-2 font-black uppercase text-[10px] sm:text-[11px] tracking-wider transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Endurance & Trunk
            </TabsTrigger>
            <TabsTrigger value="anaerobic" className="rounded-xl px-3.5 sm:px-4 py-2 font-black uppercase text-[10px] sm:text-[11px] tracking-wider transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Anaerobic ({activeProtocol?.sport_name === 'Badminton' ? 'MRSAT' : 'RAST'})
            </TabsTrigger>
            <TabsTrigger value="aerobic" className="rounded-xl px-3.5 sm:px-4 py-2 font-black uppercase text-[10px] sm:text-[11px] tracking-wider transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Aerobic (Yo-Yo)
            </TabsTrigger>
            <TabsTrigger value="biomotor" className="rounded-xl px-3.5 sm:px-4 py-2 font-black uppercase text-[10px] sm:text-[11px] tracking-wider transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm">
              Bio-Motor Radar
            </TabsTrigger>
            <TabsTrigger value="action_plan" className="rounded-xl px-3.5 sm:px-4 py-2 font-black uppercase text-[10px] sm:text-[11px] tracking-wider transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Action Plan
            </TabsTrigger>
          </div>
        </TabsList>

        {/* ── TAB: NEEDS ANALYSIS ── */}
        <TabsContent value="needs" className="space-y-6">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> Athlete Training Age & Sport Profile
              </CardTitle>
              <CardDescription>Baseline athletic history and role specific variables for {activeProtocol?.sport_name}.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Sport Training Age (Years)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5"
                  value={needsAnalysis.sport_training_age}
                  onChange={(e) => setNeedsAnalysis({ ...needsAnalysis, sport_training_age: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Strength Training Age (Years)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 2"
                  value={needsAnalysis.strength_training_age}
                  onChange={(e) => setNeedsAnalysis({ ...needsAnalysis, strength_training_age: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Other Sports Exposure</Label>
                <Input
                  placeholder="e.g. Swimming, Track, Football"
                  value={needsAnalysis.other_sports}
                  onChange={(e) => setNeedsAnalysis({ ...needsAnalysis, other_sports: e.target.value })}
                />
              </div>

              {/* Cricket Role Needs Analysis */}
              {activeProtocol?.sport_name === 'Cricket' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Cricket Playing Role</Label>
                    <Select
                      value={needsAnalysis.role}
                      onValueChange={(val) => setNeedsAnalysis({ ...needsAnalysis, role: val })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Batsman">Batsman</SelectItem>
                        <SelectItem value="Fast Bowler">Fast / Pace Bowler</SelectItem>
                        <SelectItem value="Spin Bowler">Spin Bowler</SelectItem>
                        <SelectItem value="Wicketkeeper">Wicketkeeper</SelectItem>
                        <SelectItem value="All-Rounder">All-Rounder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Bowling Arm</Label>
                    <Select
                      value={needsAnalysis.bowling_arm}
                      onValueChange={(val) => setNeedsAnalysis({ ...needsAnalysis, bowling_arm: val })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Arm" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Right Arm Fast">Right Arm Fast</SelectItem>
                        <SelectItem value="Left Arm Fast">Left Arm Fast</SelectItem>
                        <SelectItem value="Right Arm Spin">Right Arm Spin</SelectItem>
                        <SelectItem value="Left Arm Spin">Left Arm Spin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Batting Stance</Label>
                    <Select
                      value={needsAnalysis.batting_stance}
                      onValueChange={(val) => setNeedsAnalysis({ ...needsAnalysis, batting_stance: val })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Stance" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Right Hand Bat">Right Hand Bat</SelectItem>
                        <SelectItem value="Left Hand Bat">Left Hand Bat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Football Position & Dominant Foot */}
              {activeProtocol?.sport_name === 'Football' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Playing Position</Label>
                    <Select
                      value={needsAnalysis.position}
                      onValueChange={(val) => setNeedsAnalysis({ ...needsAnalysis, position: val })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Position" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                        <SelectItem value="Central Defender">Central Defender</SelectItem>
                        <SelectItem value="Fullback / Wingback">Fullback / Wingback</SelectItem>
                        <SelectItem value="Central Midfielder">Central Midfielder</SelectItem>
                        <SelectItem value="Winger">Winger</SelectItem>
                        <SelectItem value="Striker">Striker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Dominant Foot</Label>
                    <Select
                      value={needsAnalysis.dominant_foot}
                      onValueChange={(val) => setNeedsAnalysis({ ...needsAnalysis, dominant_foot: val })}
                    >
                      <SelectTrigger><SelectValue placeholder="Dominant foot" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Right">Right Foot</SelectItem>
                        <SelectItem value="Left">Left Foot</SelectItem>
                        <SelectItem value="Both (Ambidextrous)">Both (Ambidextrous)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Racket Sports (Badminton / Tennis / Padel) */}
              {['Badminton', 'Tennis', 'Padel'].includes(activeProtocol?.sport_name || '') && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Playing Hand</Label>
                  <Select
                    value={needsAnalysis.playing_hand}
                    onValueChange={(val) => setNeedsAnalysis({ ...needsAnalysis, playing_hand: val })}
                  >
                    <SelectTrigger><SelectValue placeholder="Dominant hand" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Right">Right Hand</SelectItem>
                      <SelectItem value="Left">Left Hand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: ANTHROPOMETRICS ── */}
        <TabsContent value="anthropometrics" className="space-y-6">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" /> Anthropometric & Body Composition Profile
              </CardTitle>
              <CardDescription>Essential physical dimensions used for composite normalizations and power calculations.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Standing Height (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 178.5"
                  value={anthropometrics.standing_height}
                  onChange={(e) => setAnthropometrics({ ...anthropometrics, standing_height: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Sitting Height (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 92.0"
                  value={anthropometrics.sitting_height}
                  onChange={(e) => setAnthropometrics({ ...anthropometrics, sitting_height: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Body Weight (kg) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 72.4"
                  value={anthropometrics.weight}
                  onChange={(e) => setAnthropometrics({ ...anthropometrics, weight: e.target.value })}
                  className="border-primary/50"
                />
                <span className="text-[10px] text-slate-400">Required for RAST & Sayers power calculation</span>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Body Fat (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 13.5"
                  value={anthropometrics.body_fat_pct}
                  onChange={(e) => setAnthropometrics({ ...anthropometrics, body_fat_pct: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Skeletal Muscle Mass (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 34.2"
                  value={anthropometrics.skeletal_muscle_mass}
                  onChange={(e) => setAnthropometrics({ ...anthropometrics, skeletal_muscle_mass: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Arm Span (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 182.0"
                  value={anthropometrics.arm_span}
                  onChange={(e) => setAnthropometrics({ ...anthropometrics, arm_span: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Lower Limb Length R (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="ASIS to Medial Mall"
                  value={anthropometrics.lower_limb_length_r}
                  onChange={(e) => setAnthropometrics({ ...anthropometrics, lower_limb_length_r: e.target.value })}
                />
                <span className="text-[10px] text-slate-400">Used for YBT Lower % normalization</span>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Lower Limb Length L (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="ASIS to Medial Mall"
                  value={anthropometrics.lower_limb_length_l}
                  onChange={(e) => setAnthropometrics({ ...anthropometrics, lower_limb_length_l: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Upper Limb Length R (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="C7 to Dactylion"
                  value={anthropometrics.upper_limb_length_r}
                  onChange={(e) => setAnthropometrics({ ...anthropometrics, upper_limb_length_r: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Upper Limb Length L (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="C7 to Dactylion"
                  value={anthropometrics.upper_limb_length_l}
                  onChange={(e) => setAnthropometrics({ ...anthropometrics, upper_limb_length_l: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: FMS MOVEMENT SCREEN ── */}
        <TabsContent value="fms" className="space-y-6">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="border-b bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Functional Movement Screen (FMS) Battery
                </CardTitle>
                <CardDescription>7 fundamental movement patterns with pain clearing fail-safes (Total out of 21).</CardDescription>
              </div>

              {/* Live FMS Total Badge */}
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-xl text-center border font-black shadow-sm ${
                  fmsResult.total <= 14
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                }`}>
                  <span className="text-[10px] uppercase tracking-wider block">FMS Score</span>
                  <span className="text-2xl font-black">{fmsResult.total} / 21</span>
                </div>
                {fmsResult.riskFlag && (
                  <Badge variant="destructive" className="animate-pulse gap-1 text-[10px] py-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> High Risk (Score ≤ 14)
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="border rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                {/* 1. Deep Overhead Squat */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">1. Deep Overhead Squat (OHS)</h4>
                    <p className="text-xs text-slate-500">Bilateral symmetrical hip, knee and ankle mobility with thoracic extension</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {renderFMSScoreButtons(fmsData.ohs?.final, (val) => setFmsData({ ...fmsData, ohs: { final: val } }))}
                    <Badge variant="secondary" className="w-12 justify-center font-bold">{fmsResult.scores.ohs}</Badge>
                  </div>
                </div>

                {/* 2. Hurdle Step */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">2. Hurdle Step</h4>
                    <p className="text-xs text-slate-500">Bilateral single-leg stance stability and stride mechanics</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">R:</span>
                      {renderFMSScoreButtons(fmsData.hurdle_step?.right, (val) => setFmsData({
                        ...fmsData,
                        hurdle_step: { ...fmsData.hurdle_step, right: val }
                      }))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">L:</span>
                      {renderFMSScoreButtons(fmsData.hurdle_step?.left, (val) => setFmsData({
                        ...fmsData,
                        hurdle_step: { ...fmsData.hurdle_step, left: val }
                      }))}
                    </div>
                    <Badge variant="secondary" className="w-12 justify-center font-bold">{fmsResult.scores.hurdle_step}</Badge>
                  </div>
                </div>

                {/* 3. In-Line Lunge */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">3. In-Line Lunge</h4>
                    <p className="text-xs text-slate-500">Spine stabilization during deceleration and lateral displacement</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">R:</span>
                      {renderFMSScoreButtons(fmsData.inline_lunge?.right, (val) => setFmsData({
                        ...fmsData,
                        inline_lunge: { ...fmsData.inline_lunge, right: val }
                      }))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">L:</span>
                      {renderFMSScoreButtons(fmsData.inline_lunge?.left, (val) => setFmsData({
                        ...fmsData,
                        inline_lunge: { ...fmsData.inline_lunge, left: val }
                      }))}
                    </div>
                    <Badge variant="secondary" className="w-12 justify-center font-bold">{fmsResult.scores.inline_lunge}</Badge>
                  </div>
                </div>

                {/* 4. Shoulder Mobility + Impingement Clearing */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">4. Shoulder Mobility</h4>
                    <p className="text-xs text-slate-500">Bilateral shoulder range of motion, scapular posture and thoracic extension</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFmsData({
                          ...fmsData,
                          shoulder_mobility: { ...fmsData.shoulder_mobility, clearing: !fmsData.shoulder_mobility?.clearing }
                        })}
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border transition-all ${
                          fmsData.shoulder_mobility?.clearing
                            ? 'bg-rose-500 text-white border-rose-600'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {fmsData.shoulder_mobility?.clearing ? '⚠ Pain on Clearing Test (Zeroed)' : 'Impingement Clear: Negative'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">R:</span>
                      {renderFMSScoreButtons(fmsData.shoulder_mobility?.right, (val) => setFmsData({
                        ...fmsData,
                        shoulder_mobility: { ...fmsData.shoulder_mobility, right: val }
                      }))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">L:</span>
                      {renderFMSScoreButtons(fmsData.shoulder_mobility?.left, (val) => setFmsData({
                        ...fmsData,
                        shoulder_mobility: { ...fmsData.shoulder_mobility, left: val }
                      }))}
                    </div>
                    <Badge variant="secondary" className="w-12 justify-center font-bold">{fmsResult.scores.shoulder_mobility}</Badge>
                  </div>
                </div>

                {/* 5. Active Straight Leg Raise */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">5. Active Straight Leg Raise (ASLR)</h4>
                    <p className="text-xs text-slate-500">Hamstring flexibility with contralateral hip extension and pelvic core control</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">R:</span>
                      {renderFMSScoreButtons(fmsData.aslr?.right, (val) => setFmsData({
                        ...fmsData,
                        aslr: { ...fmsData.aslr, right: val }
                      }))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">L:</span>
                      {renderFMSScoreButtons(fmsData.aslr?.left, (val) => setFmsData({
                        ...fmsData,
                        aslr: { ...fmsData.aslr, left: val }
                      }))}
                    </div>
                    <Badge variant="secondary" className="w-12 justify-center font-bold">{fmsResult.scores.aslr}</Badge>
                  </div>
                </div>

                {/* 6. Trunk Stability Push-Up + Extension Clearing */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">6. Trunk Stability Push-Up</h4>
                    <p className="text-xs text-slate-500">Sagittal core trunk stabilization during upper body closed-chain press</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFmsData({
                          ...fmsData,
                          trunk_pushup: { ...fmsData.trunk_pushup, clearing: !fmsData.trunk_pushup?.clearing }
                        })}
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border transition-all ${
                          fmsData.trunk_pushup?.clearing
                            ? 'bg-rose-500 text-white border-rose-600'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {fmsData.trunk_pushup?.clearing ? '⚠ Extension Pain (Zeroed)' : 'Spine Extension Clear: Negative'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {renderFMSScoreButtons(fmsData.trunk_pushup?.right, (val) => setFmsData({
                      ...fmsData,
                      trunk_pushup: { ...fmsData.trunk_pushup, right: val, left: val }
                    }))}
                    <Badge variant="secondary" className="w-12 justify-center font-bold">{fmsResult.scores.trunk_pushup}</Badge>
                  </div>
                </div>

                {/* 7. Rotary Stability + Flexion Clearing */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">7. Rotary Stability</h4>
                    <p className="text-xs text-slate-500">Multi-planar trunk stability during combined asymmetric upper and lower extremity motion</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFmsData({
                          ...fmsData,
                          rotary_stability: { ...fmsData.rotary_stability, clearing: !fmsData.rotary_stability?.clearing }
                        })}
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border transition-all ${
                          fmsData.rotary_stability?.clearing
                            ? 'bg-rose-500 text-white border-rose-600'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {fmsData.rotary_stability?.clearing ? '⚠ Flexion Pain (Zeroed)' : 'Spine Flexion Clear: Negative'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">R:</span>
                      {renderFMSScoreButtons(fmsData.rotary_stability?.right, (val) => setFmsData({
                        ...fmsData,
                        rotary_stability: { ...fmsData.rotary_stability, right: val }
                      }))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">L:</span>
                      {renderFMSScoreButtons(fmsData.rotary_stability?.left, (val) => setFmsData({
                        ...fmsData,
                        rotary_stability: { ...fmsData.rotary_stability, left: val }
                      }))}
                    </div>
                    <Badge variant="secondary" className="w-12 justify-center font-bold">{fmsResult.scores.rotary_stability}</Badge>
                  </div>
                </div>
              </div>

              {/* Ankle Dorsiflexion (Weight-bearing lunge test) */}
              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Ankle Dorsiflexion R (cm / deg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 12.5"
                    value={fmsData.ankle_dorsiflexion_r}
                    onChange={(e) => setFmsData({ ...fmsData, ankle_dorsiflexion_r: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Ankle Dorsiflexion L (cm / deg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 11.0"
                    value={fmsData.ankle_dorsiflexion_l}
                    onChange={(e) => setFmsData({ ...fmsData, ankle_dorsiflexion_l: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: STABILITY & YBT ── */}
        <TabsContent value="stability" className="space-y-6">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Y-Balance Dynamic Stability & Balance Screen
              </CardTitle>
              <CardDescription>
                Lower Quadrant (LQ-YBT) and Upper Quadrant (UQ-YBT) dynamic reaches with automated reach asymmetry and composite percentages.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Lower YBT */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">Lower Quadrant YBT (cm)</h4>
                  {ybtResult.lower.antAsymmetryRisk && (
                    <Badge variant="destructive" className="text-[10px] font-bold">
                      ⚠ Anterior Asymmetry &gt; 4cm ({ybtResult.lower.diffAnt} cm) - Injury Risk Elevated
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-500">Anterior Right</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={stabilityData.ybt_lq_anterior_r}
                      onChange={(e) => setStabilityData({ ...stabilityData, ybt_lq_anterior_r: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-500">Anterior Left</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={stabilityData.ybt_lq_anterior_l}
                      onChange={(e) => setStabilityData({ ...stabilityData, ybt_lq_anterior_l: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-500">PosteroMedial R</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={stabilityData.ybt_lq_pm_r}
                      onChange={(e) => setStabilityData({ ...stabilityData, ybt_lq_pm_r: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-500">PosteroMedial L</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={stabilityData.ybt_lq_pm_l}
                      onChange={(e) => setStabilityData({ ...stabilityData, ybt_lq_pm_l: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-500">PosteroLateral R</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={stabilityData.ybt_lq_pl_r}
                      onChange={(e) => setStabilityData({ ...stabilityData, ybt_lq_pl_r: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-500">PosteroLateral L</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={stabilityData.ybt_lq_pl_l}
                      onChange={(e) => setStabilityData({ ...stabilityData, ybt_lq_pl_l: e.target.value })}
                    />
                  </div>
                </div>

                {/* Live LQ-YBT Results */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500">Ant Diff (cm)</span>
                    <p className={`text-base font-black ${ybtResult.lower.antAsymmetryRisk ? 'text-rose-600' : 'text-slate-900'}`}>
                      {ybtResult.lower.diffAnt} cm
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500">PM Diff (cm)</span>
                    <p className="text-base font-black text-slate-900">{ybtResult.lower.diffPm} cm</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500">LQ Composite R</span>
                    <p className="text-base font-black text-primary">{ybtResult.lower.compR || '—'} %</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500">LQ Composite L</span>
                    <p className="text-base font-black text-primary">{ybtResult.lower.compL || '—'} %</p>
                  </div>
                </div>
              </div>

              {/* Upper YBT (if not disabled) */}
              {activeProtocol?.sections_config?.stability?.ybt_upper !== false && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">Upper Quadrant YBT (cm)</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500">Medial Reach R</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={stabilityData.ybt_uq_medial_r}
                        onChange={(e) => setStabilityData({ ...stabilityData, ybt_uq_medial_r: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500">Medial Reach L</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={stabilityData.ybt_uq_medial_l}
                        onChange={(e) => setStabilityData({ ...stabilityData, ybt_uq_medial_l: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500">SuperoLateral R</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={stabilityData.ybt_uq_sl_r}
                        onChange={(e) => setStabilityData({ ...stabilityData, ybt_uq_sl_r: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500">SuperoLateral L</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={stabilityData.ybt_uq_sl_l}
                        onChange={(e) => setStabilityData({ ...stabilityData, ybt_uq_sl_l: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500">InferoLateral R</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={stabilityData.ybt_uq_il_r}
                        onChange={(e) => setStabilityData({ ...stabilityData, ybt_uq_il_r: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500">InferoLateral L</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={stabilityData.ybt_uq_il_l}
                        onChange={(e) => setStabilityData({ ...stabilityData, ybt_uq_il_l: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Live UQ-YBT Results */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500">Medial Diff (cm)</span>
                      <p className="text-base font-black text-slate-900">{ybtResult.upper.diffMed} cm</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500">UQ Composite R</span>
                      <p className="text-base font-black text-primary">{ybtResult.upper.compR || '—'} %</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500">UQ Composite L</span>
                      <p className="text-base font-black text-primary">{ybtResult.upper.compL || '—'} %</p>
                    </div>
                  </div>
                </div>
              )}

              {/* BESS Balance (Equestrian / Fencing & Generic) */}
              {activeProtocol?.sections_config?.stability?.bess_balance && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">BESS Balance Test (Error Scores)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500">Firm Double Leg</Label>
                      <Input
                        type="number"
                        value={stabilityData.bess_firm_double}
                        onChange={(e) => setStabilityData({ ...stabilityData, bess_firm_double: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500">Firm Single Leg</Label>
                      <Input
                        type="number"
                        value={stabilityData.bess_firm_single}
                        onChange={(e) => setStabilityData({ ...stabilityData, bess_firm_single: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500">Firm Tandem</Label>
                      <Input
                        type="number"
                        value={stabilityData.bess_firm_tandem}
                        onChange={(e) => setStabilityData({ ...stabilityData, bess_firm_tandem: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500">Foam Double Leg</Label>
                      <Input
                        type="number"
                        value={stabilityData.bess_foam_double}
                        onChange={(e) => setStabilityData({ ...stabilityData, bess_foam_double: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500">Foam Single Leg</Label>
                      <Input
                        type="number"
                        value={stabilityData.bess_foam_single}
                        onChange={(e) => setStabilityData({ ...stabilityData, bess_foam_single: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-500">Foam Tandem</Label>
                      <Input
                        type="number"
                        value={stabilityData.bess_foam_tandem}
                        onChange={(e) => setStabilityData({ ...stabilityData, bess_foam_tandem: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: POWER & SPEED ── */}
        <TabsContent value="power_speed" className="space-y-6">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" /> Neuromuscular Power, Jump Diagnostics & Sprint Splits
              </CardTitle>
              <CardDescription>Vertical Jump with Sayers power calculations, Drop Jump RSI, and linear acceleration gates.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Vertical Jump / CMJ (cm)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 52.5"
                    value={powerSpeedData.vertical_jump}
                    onChange={(e) => setPowerSpeedData({ ...powerSpeedData, vertical_jump: e.target.value })}
                  />
                  {sayersPower > 0 && (
                    <div className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
                      Sayers Peak Power: <strong>{sayersPower} W</strong>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Standing Broad Jump (cm)</Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder="e.g. 235"
                    value={powerSpeedData.broad_jump}
                    onChange={(e) => setPowerSpeedData({ ...powerSpeedData, broad_jump: e.target.value })}
                  />
                </div>

                {/* Drop Jump RSI (Football Senior) */}
                {activeProtocol?.slug === 'football-senior' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Drop Jump Height (cm)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 38.0"
                        value={powerSpeedData.drop_jump_height}
                        onChange={(e) => setPowerSpeedData({ ...powerSpeedData, drop_jump_height: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Ground Contact Time (ms)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 195"
                        value={powerSpeedData.drop_jump_contact_time}
                        onChange={(e) => setPowerSpeedData({ ...powerSpeedData, drop_jump_contact_time: e.target.value })}
                      />
                      {dropJumpRSI > 0 && (
                        <div className="text-[11px] text-primary font-bold bg-primary/10 px-2 py-1 rounded">
                          Reactive Strength Index (RSI): <strong>{dropJumpRSI}</strong>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Medicine Ball Throws based on sport */}
                {activeProtocol?.sections_config?.power_speed?.mb_throw_type === 'kneeling_oh' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Kneeling OH Med Ball Throw (m)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 7.8"
                      value={powerSpeedData.mb_throw_overhead}
                      onChange={(e) => setPowerSpeedData({ ...powerSpeedData, mb_throw_overhead: e.target.value })}
                    />
                  </div>
                )}

                {activeProtocol?.sections_config?.power_speed?.mb_throw_type === 'kneeling_rotational_rl' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Kneeling Rotational MB Throw R (m)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 8.2"
                        value={powerSpeedData.mb_throw_rotational_r}
                        onChange={(e) => setPowerSpeedData({ ...powerSpeedData, mb_throw_rotational_r: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Kneeling Rotational MB Throw L (m)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 7.9"
                        value={powerSpeedData.mb_throw_rotational_l}
                        onChange={(e) => setPowerSpeedData({ ...powerSpeedData, mb_throw_rotational_l: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {activeProtocol?.sections_config?.power_speed?.mb_throw_type === 'half_kneeling_mb' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Half Kneeling MB Chest Throw (m)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 6.5"
                      value={powerSpeedData.mb_throw_half_kneeling}
                      onChange={(e) => setPowerSpeedData({ ...powerSpeedData, mb_throw_half_kneeling: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Sprint Splits */}
              <div className="pt-4 border-t space-y-3">
                <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">Sprint Splits / Timing Gates (Seconds)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  {activeProtocol?.sections_config?.power_speed?.sprint_splits?.includes('5m') && (
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-500">5m Split (s)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 1.05"
                        value={powerSpeedData.sprint_5m}
                        onChange={(e) => setPowerSpeedData({ ...powerSpeedData, sprint_5m: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">10m Split (s)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1.74"
                      value={powerSpeedData.sprint_10m}
                      onChange={(e) => setPowerSpeedData({ ...powerSpeedData, sprint_10m: e.target.value })}
                    />
                  </div>
                  {activeProtocol?.sections_config?.power_speed?.sprint_splits?.includes('20m') && (
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-500">20m Split (s)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 3.02"
                        value={powerSpeedData.sprint_20m}
                        onChange={(e) => setPowerSpeedData({ ...powerSpeedData, sprint_20m: e.target.value })}
                      />
                    </div>
                  )}
                  {activeProtocol?.sections_config?.power_speed?.sprint_splits?.includes('30m') && (
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-500">30m Split (s)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 4.15"
                        value={powerSpeedData.sprint_30m}
                        onChange={(e) => setPowerSpeedData({ ...powerSpeedData, sprint_30m: e.target.value })}
                      />
                    </div>
                  )}
                  {activeProtocol?.sections_config?.power_speed?.sprint_splits?.includes('40m') && (
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-500">40m Split (s)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 5.12"
                        value={powerSpeedData.sprint_40m}
                        onChange={(e) => setPowerSpeedData({ ...powerSpeedData, sprint_40m: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Hand Grip (CHAMPS Equestrian & Fencing) */}
              {activeProtocol?.sections_config?.power_speed?.handgrip_rl_trials && (
                <div className="pt-4 border-t space-y-3">
                  <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">Hand Grip Dynamometry (kg)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-500">Grip Right Trial 1</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={powerSpeedData.handgrip_r_trial1}
                        onChange={(e) => setPowerSpeedData({ ...powerSpeedData, handgrip_r_trial1: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-500">Grip Right Trial 2</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={powerSpeedData.handgrip_r_trial2}
                        onChange={(e) => setPowerSpeedData({ ...powerSpeedData, handgrip_r_trial2: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-500">Grip Left Trial 1</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={powerSpeedData.handgrip_l_trial1}
                        onChange={(e) => setPowerSpeedData({ ...powerSpeedData, handgrip_l_trial1: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-500">Grip Left Trial 2</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={powerSpeedData.handgrip_l_trial2}
                        onChange={(e) => setPowerSpeedData({ ...powerSpeedData, handgrip_l_trial2: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: AGILITY & FOOTWORK ── */}
        <TabsContent value="agility" className="space-y-6">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Change of Direction & Sport-Specific Agility
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {['Badminton', 'Tennis', 'Padel'].includes(activeProtocol?.sport_name || '') && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Semo Agility Test Time (s)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 11.45"
                    value={agilityData.semo_time}
                    onChange={(e) => setAgilityData({ ...agilityData, semo_time: e.target.value })}
                  />
                  <span className="text-[10px] text-slate-400">Standard racquet court forward/backward/diagonal transition</span>
                </div>
              )}

              {activeProtocol?.sport_name === 'Football' && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">T-Agility Test (s)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 9.85"
                    value={agilityData.t_agility_time}
                    onChange={(e) => setAgilityData({ ...agilityData, t_agility_time: e.target.value })}
                  />
                </div>
              )}

              {activeProtocol?.sport_name === 'Cricket' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Run a 3 (Without Bat) (s)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 9.15"
                      value={agilityData.run_a_3_without_bat}
                      onChange={(e) => setAgilityData({ ...agilityData, run_a_3_without_bat: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Run a 3 (With Bat) (s)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 9.58"
                      value={agilityData.run_a_3_with_bat}
                      onChange={(e) => setAgilityData({ ...agilityData, run_a_3_with_bat: e.target.value })}
                    />
                  </div>
                </>
              )}

              {activeProtocol?.slug === 'equestrian-fencing' && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Y-Agility Test Time (s)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 4.82"
                    value={agilityData.y_agility_time}
                    onChange={(e) => setAgilityData({ ...agilityData, y_agility_time: e.target.value })}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: ENDURANCE & TRUNK LINES ── */}
        <TabsContent value="endurance" className="space-y-6">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" /> Trunk Endurance Lines & Muscular Capacity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Trunk Lines */}
              <div className="space-y-3">
                <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">McGill Trunk Endurance Plumb Lines (Seconds)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">APL (Anterior Plank)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 95"
                      value={enduranceData.trunk_apl_sec}
                      onChange={(e) => setEnduranceData({ ...enduranceData, trunk_apl_sec: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">LSL (Left Side Bridge)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 68"
                      value={enduranceData.trunk_lsl_sec}
                      onChange={(e) => setEnduranceData({ ...enduranceData, trunk_lsl_sec: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">RSL (Right Side Bridge)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 71"
                      value={enduranceData.trunk_rsl_sec}
                      onChange={(e) => setEnduranceData({ ...enduranceData, trunk_rsl_sec: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">PPL (Posterior Extension)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 110"
                      value={enduranceData.trunk_ppl_sec}
                      onChange={(e) => setEnduranceData({ ...enduranceData, trunk_ppl_sec: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">Sorenson Test (s)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 120"
                      value={enduranceData.trunk_sorenson_sec}
                      onChange={(e) => setEnduranceData({ ...enduranceData, trunk_sorenson_sec: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Push ups / Pull ups */}
              <div className="pt-4 border-t grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Push-Ups (Max Reps)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 35"
                    value={enduranceData.push_ups_count}
                    onChange={(e) => setEnduranceData({ ...enduranceData, push_ups_count: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Pull-Ups (Max Reps)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 12"
                    value={enduranceData.pull_ups_count}
                    onChange={(e) => setEnduranceData({ ...enduranceData, pull_ups_count: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Single Leg Calf Raise R (Reps)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 32"
                    value={enduranceData.sl_calf_raise_r}
                    onChange={(e) => setEnduranceData({ ...enduranceData, sl_calf_raise_r: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Single Leg Calf Raise L (Reps)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 30"
                    value={enduranceData.sl_calf_raise_l}
                    onChange={(e) => setEnduranceData({ ...enduranceData, sl_calf_raise_l: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: ANAEROBIC (MRSAT OR RAST) ── */}
        <TabsContent value="anaerobic" className="space-y-6">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600" />
                {activeProtocol?.sport_name === 'Badminton' ? 'MRSAT 10-Interval Test' : 'RAST 6-Interval Sprint Battery'}
              </CardTitle>
              <CardDescription>
                {activeProtocol?.sport_name === 'Badminton'
                  ? 'Multistage Racket-Sport Shuttle Run progressive interval load.'
                  : 'Running-based Anaerobic Sprint Test with automated power and fatigue index calculations.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {activeProtocol?.sport_name === 'Badminton' ? (
                <div className="space-y-4">
                  <div className="max-w-xs space-y-2">
                    <Label className="text-xs font-bold text-slate-700">MRSAT Stage Completed (Max 10)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={anaerobicData.mrsat_stage_completed}
                      onChange={(e) => setAnaerobicData({ ...anaerobicData, mrsat_stage_completed: e.target.value })}
                      className="text-lg font-black"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Stage completion rates establish anaerobic glycolytic tolerance and court movement stamina.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {anaerobicData.rast_sprints?.map((sp: any, idx: number) => (
                      <div key={idx} className="space-y-1.5 p-3 rounded-xl bg-slate-50 border">
                        <Label className="text-xs font-black uppercase text-slate-700">Sprint {idx + 1} (s)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 5.4"
                          value={sp.time_sec}
                          onChange={(e) => {
                            const updated = [...anaerobicData.rast_sprints];
                            updated[idx].time_sec = e.target.value;
                            setAnaerobicData({ ...anaerobicData, rast_sprints: updated });
                          }}
                        />
                        {rastResult.sprintPowers[idx] > 0 && (
                          <div className="text-[10px] font-bold text-purple-700 mt-1">
                            {rastResult.sprintPowers[idx]} W
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* RAST Calculated Output Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-purple-50/60 border border-purple-200">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-purple-700">Peak Power</span>
                      <p className="text-xl font-black text-purple-950">{rastResult.peakPower} W</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-purple-700">Minimum Power</span>
                      <p className="text-xl font-black text-purple-950">{rastResult.minPower} W</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-purple-700">Average Power</span>
                      <p className="text-xl font-black text-purple-950">{rastResult.avgPower} W</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-purple-700">Fatigue Index</span>
                      <p className="text-xl font-black text-purple-950">{rastResult.fatigueIndex} W/s</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: AEROBIC (YO-YO) ── */}
        <TabsContent value="aerobic" className="space-y-6">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Yo-Yo Intermittent Recovery & VO2 Max Engine
              </CardTitle>
              <CardDescription>Automated VO2 Max estimation via Bangsbo formula based on distance covered.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Yo-Yo Test Variant</Label>
                <Select
                  value={aerobicData.test_variant}
                  onValueChange={(val) => setAerobicData({ ...aerobicData, test_variant: val })}
                >
                  <SelectTrigger><SelectValue placeholder="Variant" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yo-Yo IR1">Yo-Yo IR-1 (Standard)</SelectItem>
                    <SelectItem value="Yo-Yo IR2">Yo-Yo IR-2 (Elite)</SelectItem>
                    <SelectItem value="Children Yo-Yo IR1">Children Yo-Yo IR1</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Total Distance Covered (m) *</Label>
                <Input
                  type="number"
                  step="20"
                  placeholder="e.g. 1760"
                  value={aerobicData.distance_meters}
                  onChange={(e) => setAerobicData({ ...aerobicData, distance_meters: e.target.value })}
                  className="border-primary/50 text-lg font-black"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Level & Shuttle</Label>
                <Input
                  placeholder="e.g. 17.4"
                  value={aerobicData.level_shuttle}
                  onChange={(e) => setAerobicData({ ...aerobicData, level_shuttle: e.target.value })}
                />
              </div>

              {/* Calculated VO2 Max Output Card */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Calculated VO2 Max</span>
                <p className="text-2xl font-black text-emerald-950">
                  {yoyoVO2Max > 0 ? `${yoyoVO2Max} mL/kg/min` : '—'}
                </p>
                <span className="text-[10px] text-emerald-600 mt-0.5">Bangsbo Intermittent Recovery Formula</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: BIO-MOTOR RADAR SUMMARY ── */}
        <TabsContent value="biomotor" className="space-y-6">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> Bio-Motor Capabilities Spider Radar Profile
              </CardTitle>
              <CardDescription>
                Interactive 5-tier pill selectors with live SVG spider chart rendering the athlete's motor polygon against normative benchmarks.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Pill Selectors */}
              <div className="md:col-span-7 space-y-3 sm:space-y-4">
                {Object.keys(biomotorRatings).map((ability) => {
                  const currentTier = biomotorRatings[ability] || 'Average';
                  return (
                    <div key={ability} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 border gap-2">
                      <span className="font-bold text-sm text-slate-800">{ability}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(['Poor', 'Average', 'Good', 'Excellent', 'Elite'] as BiomotorTier[]).map((tier) => (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => setBiomotorRatings({ ...biomotorRatings, [ability]: tier })}
                            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                              currentTier === tier
                                ? `${BIOMOTOR_LEVEL_COLORS[tier]} border shadow-sm scale-105`
                                : 'bg-white hover:bg-slate-200 text-slate-600'
                            }`}
                          >
                            {tier}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Spider Radar Chart */}
              <div className="md:col-span-5 h-[340px] md:h-[400px] flex items-center justify-center bg-slate-900 rounded-2xl p-4 shadow-xl">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="quality" stroke="#94a3b8" tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 700 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#475569" />
                    <Radar
                      name="Benchmark"
                      dataKey="benchmark"
                      stroke="#64748b"
                      fill="#64748b"
                      fillOpacity={0.2}
                      strokeDasharray="3 3"
                    />
                    <Radar
                      name="Athlete"
                      dataKey="score"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.5}
                    />
                    <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '11px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: CLINICAL ACTION PLAN ── */}
        <TabsContent value="action_plan" className="space-y-6">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Specialist Impressions & Prescription
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Overall Diagnostic Impression</Label>
                <Textarea
                  placeholder="Summarize key findings, kinetic imbalances, and dominant performance markers..."
                  rows={3}
                  value={overallImpression}
                  onChange={(e) => setOverallImpression(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Corrective Exercise Prescription</Label>
                <Textarea
                  placeholder="e.g. Ankle dorsiflexion mob drills, hip mobility, asymmetric trunk line bracing..."
                  rows={3}
                  value={correctivePlan}
                  onChange={(e) => setCorrectivePlan(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">S&C Plan of Action & Retesting Timeline</Label>
                <Textarea
                  placeholder="Mesocycle focus, aerobic shuttle progression, next testing window..."
                  rows={3}
                  value={planOfAction}
                  onChange={(e) => setPlanOfAction(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Modal */}
      {selectedAthlete && (
        <AssessmentReportModal
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
          assessment={{
            athlete_id: selectedAthleteId,
            athlete_name: selectedAthlete.full_name,
            athlete_uhid: selectedAthlete.uhid,
            athlete_dob: selectedAthlete.dob,
            athlete_age: selectedAthlete.age,
            athlete_gender: selectedAthlete.gender,
            athlete_sport: selectedAthlete.sport,
            sport_name: activeProtocol?.sport_name,
            template_name: activeProtocol?.template_name,
            assessor_name: assessorName,
            assessment_date: assessmentDate,
            batch_or_squad: batchSquad,
            needs_analysis: needsAnalysis,
            anthropometrics: anthropometrics,
            fms_data: { ...fmsData, total_score: fmsResult.total },
            stability_data: {
              ...stabilityData,
              ybt_lq_diff_anterior: ybtResult.lower.diffAnt,
              ybt_lq_composite_r: ybtResult.lower.compR,
              ybt_lq_composite_l: ybtResult.lower.compL
            },
            power_speed_data: {
              ...powerSpeedData,
              vertical_jump_power_watts: sayersPower,
              drop_jump_rsi: dropJumpRSI
            },
            agility_data: agilityData,
            endurance_data: enduranceData,
            anaerobic_data: {
              ...anaerobicData,
              rast_peak_power: rastResult.peakPower,
              rast_fatigue_index: rastResult.fatigueIndex
            },
            aerobic_data: {
              ...aerobicData,
              vo2_max_calculated: yoyoVO2Max
            },
            biomotor_ratings: biomotorRatings,
            overall_impression: overallImpression,
            corrective_plan: correctivePlan,
            plan_of_action: planOfAction,
            status: 'completed'
          }}
        />
      )}
    </div>
  );
}
