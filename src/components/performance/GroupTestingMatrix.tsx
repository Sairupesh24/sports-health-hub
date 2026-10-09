import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Grid,
  Layers,
  Save,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles,
  Users,
  Pencil,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ClientGroupsModal } from '@/components/admin/ClientGroupsModal';
import { PerformanceProtocol, AthleteDemographic } from './performanceTypes';
import { calculateYoYoVO2Max, calculateSayersPower, calculateDropJumpRSI } from './calculationEngine';

type StationPreset = 'all' | 'anthropometrics' | 'jump_power' | 'speed_agility' | 'fms' | 'aerobic';

interface CellState {
  status: 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
  errorMessage?: string;
}

interface MatrixAthleteRow {
  athlete: AthleteDemographic;
  assessmentId?: string;
  data: Record<string, any>; // category -> field -> value
}

export default function GroupTestingMatrix() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Header Filters
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [assessmentDate, setAssessmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedProtocolSlug, setSelectedProtocolSlug] = useState<string>('badminton-assessment');
  const [activeStation, setActiveStation] = useState<StationPreset>('jump_power');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Quick Add Athlete state
  const [quickAddAthleteId, setQuickAddAthleteId] = useState<string>('');
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState<boolean>(false);

  // Matrix Cell States: key = `${athleteId}:${category}:${field}` -> CellState
  const [cellStates, setCellStates] = useState<Record<string, CellState>>({});
  const [matrixData, setMatrixData] = useState<Record<string, Record<string, Record<string, any>>>>({});
  // Pending batch updates queue
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Array<{ athlete_id: string; category: string; field: string; value: any }>>([]);

  // Station Tabs Sideways Scroll State & Handlers
  const stationScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollStationLeft, setCanScrollStationLeft] = useState(false);
  const [canScrollStationRight, setCanScrollStationRight] = useState(false);

  const checkStationScroll = () => {
    if (stationScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = stationScrollRef.current;
      setCanScrollStationLeft(scrollLeft > 6);
      setCanScrollStationRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  useEffect(() => {
    checkStationScroll();
    const handleResize = () => checkStationScroll();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(checkStationScroll, 200);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  const handleStationScroll = (direction: 'left' | 'right') => {
    if (stationScrollRef.current) {
      stationScrollRef.current.scrollBy({
        left: direction === 'left' ? -220 : 220,
        behavior: 'smooth',
      });
      setTimeout(checkStationScroll, 350);
    }
  };

  const handleStationWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (stationScrollRef.current && stationScrollRef.current.scrollWidth > stationScrollRef.current.clientWidth) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        stationScrollRef.current.scrollLeft += e.deltaY;
        checkStationScroll();
      }
    }
  };

  // Fetch Protocols
  const { data: protocols = [] } = useQuery<PerformanceProtocol[]>({
    queryKey: ['performance-protocols'],
    queryFn: () => apiFetch('/performance/protocols')
  });

  const activeProtocol = useMemo(() => {
    return protocols.find(p => p.slug === selectedProtocolSlug || p.id === selectedProtocolSlug) || protocols[0];
  }, [protocols, selectedProtocolSlug]);

  // Fetch Client Groups created by Sports Scientists in Manage Groups
  const { data: clientGroups = [], refetch: refetchClientGroups } = useQuery<any[]>({
    queryKey: ['client-groups-all'],
    queryFn: () => apiFetch('/clients/groups/all')
  });

  // Automatically select the first sports scientist group when loaded if none selected
  useEffect(() => {
    if (!selectedBatch && clientGroups.length > 0) {
      setSelectedBatch(clientGroups[0].name);
    }
  }, [clientGroups, selectedBatch]);

  // Fetch all clients to resolve full member names
  const { data: allClientsForGroups = [] } = useQuery<any[]>({
    queryKey: ['all-clients-for-groups'],
    queryFn: () => apiFetch('/clients')
  });

  // Fetch All Athletes for quick-add combobox
  const { data: allAthletes = [] } = useQuery<AthleteDemographic[]>({
    queryKey: ['performance-all-athletes'],
    queryFn: () => apiFetch('/performance/athletes?limit=100')
  });

  // Active client group object if selectedBatch matches one
  const activeClientGroup = useMemo(() => {
    return clientGroups.find(
      (g: any) => g.name?.toLowerCase() === selectedBatch?.toLowerCase() || g.id === selectedBatch
    );
  }, [clientGroups, selectedBatch]);

  // Names of athletes in the active group
  const activeGroupMemberNames = useMemo(() => {
    if (!activeClientGroup) return [];
    const memberIds = new Set((activeClientGroup.client_group_members || []).map((m: any) => m.client_id));
    return allClientsForGroups
      .filter((c: any) => memberIds.has(c.id))
      .map((c: any) => `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.uhid);
  }, [activeClientGroup, allClientsForGroups]);

  // Fetch Batch Grid Data from Server
  const { data: gridData, isLoading: gridLoading, refetch: refetchGrid } = useQuery({
    queryKey: ['performance-batch-grid', activeProtocol?.id, selectedBatch, assessmentDate, activeStation],
    queryFn: () => apiFetch(`/performance/batch-grid?protocol_id=${activeProtocol?.id || ''}&batch_name=${encodeURIComponent(selectedBatch)}&date=${assessmentDate}&station_key=${activeStation}`),
    enabled: !!activeProtocol?.id
  });

  // Populate local matrixData from server response
  useEffect(() => {
    if (gridData?.athletes) {
      const initialMap: Record<string, Record<string, Record<string, any>>> = {};
      gridData.athletes.forEach((item: any) => {
        const athId = item.athlete.id;
        const assess = item.assessment || {};
        initialMap[athId] = {
          anthropometrics: assess.anthropometrics || {},
          fms_data: assess.fms_data || {},
          stability_data: assess.stability_data || {},
          power_speed_data: assess.power_speed_data || {},
          agility_data: assess.agility_data || {},
          endurance_data: assess.endurance_data || {},
          anaerobic_data: assess.anaerobic_data || {},
          aerobic_data: assess.aerobic_data || {}
        };
      });
      setMatrixData(initialMap);
    }
  }, [gridData]);

  // Batch Save Mutation
  const saveBatchMutation = useMutation({
    mutationFn: async (updates: Array<{ athlete_id: string; category: string; field: string; value: any }>) => {
      return await apiFetch('/performance/batch-grid/cells', {
        method: 'PUT',
        body: {
          protocol_id: activeProtocol?.id,
          assessment_date: assessmentDate,
          batch_name: selectedBatch,
          updates
        }
      });
    },
    onSuccess: (res, variables) => {
      // Mark all variables as saved (green flash)
      setCellStates(prev => {
        const next = { ...prev };
        variables.forEach(v => {
          const key = `${v.athlete_id}:${v.category}:${v.field}`;
          next[key] = { status: 'saved' };
        });
        return next;
      });

      // Clear 'saved' flash after 2 seconds
      setTimeout(() => {
        setCellStates(prev => {
          const next = { ...prev };
          variables.forEach(v => {
            const key = `${v.athlete_id}:${v.category}:${v.field}`;
            if (next[key]?.status === 'saved') {
              next[key] = { status: 'idle' };
            }
          });
          return next;
        });
      }, 2000);
    },
    onError: (err: any, variables) => {
      setCellStates(prev => {
        const next = { ...prev };
        variables.forEach(v => {
          const key = `${v.athlete_id}:${v.category}:${v.field}`;
          next[key] = { status: 'error', errorMessage: err.message || 'Save error' };
        });
        return next;
      });
      toast({
        title: 'Auto-Save Error',
        description: err.message || 'Failed to save cell values.',
        variant: 'destructive'
      });
    }
  });

  // Debounced auto-save function
  const triggerDebouncedSave = useCallback((athlete_id: string, category: string, field: string, value: any) => {
    const key = `${athlete_id}:${category}:${field}`;

    // Set dirty/saving state
    setCellStates(prev => ({
      ...prev,
      [key]: { status: 'saving' }
    }));

    // Add to pending updates
    pendingUpdatesRef.current.push({ athlete_id, category, field, value });

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (pendingUpdatesRef.current.length > 0) {
        const payload = [...pendingUpdatesRef.current];
        pendingUpdatesRef.current = [];
        saveBatchMutation.mutate(payload);
      }
    }, 600); // 600ms debounce
  }, [saveBatchMutation]);

  // Handle cell change
  const handleCellChange = (athleteId: string, category: string, field: string, value: any) => {
    setMatrixData(prev => ({
      ...prev,
      [athleteId]: {
        ...(prev[athleteId] || {}),
        [category]: {
          ...(prev[athleteId]?.[category] || {}),
          [field]: value
        }
      }
    }));

    triggerDebouncedSave(athleteId, category, field, value);
  };

  // Append athlete locally and trigger save
  const handleQuickAddAthlete = () => {
    if (!quickAddAthleteId) return;
    const targetAth = allAthletes.find(a => a.id === quickAddAthleteId);
    if (!targetAth) return;

    if (!matrixData[quickAddAthleteId]) {
      setMatrixData(prev => ({
        ...prev,
        [quickAddAthleteId]: {
          anthropometrics: {},
          fms_data: {},
          stability_data: {},
          power_speed_data: {},
          agility_data: {},
          endurance_data: {},
          anaerobic_data: {},
          aerobic_data: {}
        }
      }));
    }

    // Trigger save with initial touch to create draft
    triggerDebouncedSave(quickAddAthleteId, 'anthropometrics', 'status', 'draft');
    setQuickAddAthleteId('');
    toast({
      title: 'Athlete Added',
      description: `${targetAth.full_name} added to testing matrix.`
    });
  };

  // Keyboard navigation handler
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number,
    totalRows: number,
    totalCols: number
  ) => {
    let nextRow = rowIndex;
    let nextCol = colIndex;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      nextRow = Math.min(totalRows - 1, rowIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = Math.max(0, rowIndex - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
      if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionStart !== (e.target as HTMLInputElement).value.length) {
        return; // Normal cursor move inside text
      }
      e.preventDefault();
      nextCol = Math.min(totalCols - 1, colIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      if ((e.target as HTMLInputElement).selectionStart !== 0) {
        return;
      }
      e.preventDefault();
      nextCol = Math.max(0, colIndex - 1);
    }

    if (nextRow !== rowIndex || nextCol !== colIndex) {
      const targetId = `matrix-cell-${nextRow}-${nextCol}`;
      const elem = document.getElementById(targetId);
      if (elem) {
        elem.focus();
        (elem as HTMLInputElement).select?.();
      }
    }
  };

  // Filter athletes
  const athleteList = useMemo(() => {
    const list = gridData?.athletes || [];
    return list.filter((item: any) => {
      const name = `${item.athlete.first_name || ''} ${item.athlete.last_name || ''}`.toLowerCase();
      const uhid = (item.athlete.uhid || '').toLowerCase();
      const q = searchFilter.toLowerCase();
      return name.includes(q) || uhid.includes(q);
    });
  }, [gridData, searchFilter]);

  // Dynamic Column Definitions based on Station Preset
  interface ColumnDef {
    key: string;
    header: string;
    category: string;
    field: string;
    type?: 'number' | 'text';
    step?: string;
    unit?: string;
    isCalculated?: boolean;
    calcFn?: (row: any, data: any) => string | number;
  }

  const columns: ColumnDef[] = useMemo(() => {
    switch (activeStation) {
      case 'anthropometrics':
        return [
          { key: 'standing_height', header: 'Standing Height', category: 'anthropometrics', field: 'standing_height', step: '0.1', unit: 'cm' },
          { key: 'sitting_height', header: 'Sitting Height', category: 'anthropometrics', field: 'sitting_height', step: '0.1', unit: 'cm' },
          { key: 'weight', header: 'Body Weight', category: 'anthropometrics', field: 'weight', step: '0.1', unit: 'kg' },
          { key: 'body_fat_pct', header: 'Body Fat', category: 'anthropometrics', field: 'body_fat_pct', step: '0.1', unit: '%' },
          { key: 'muscle_mass', header: 'Muscle Mass', category: 'anthropometrics', field: 'skeletal_muscle_mass', step: '0.1', unit: 'kg' },
          { key: 'leg_length_r', header: 'Lower Limb R', category: 'anthropometrics', field: 'lower_limb_length_r', step: '0.1', unit: 'cm' },
          { key: 'leg_length_l', header: 'Lower Limb L', category: 'anthropometrics', field: 'lower_limb_length_l', step: '0.1', unit: 'cm' }
        ];

      case 'jump_power':
        return [
          { key: 'cmj_1', header: 'CMJ Jump', category: 'power_speed_data', field: 'vertical_jump', step: '0.5', unit: 'cm' },
          { key: 'broad_jump', header: 'Broad Jump', category: 'power_speed_data', field: 'broad_jump', step: '1', unit: 'cm' },
          { key: 'mb_throw', header: 'Med Ball Throw', category: 'power_speed_data', field: 'mb_throw_overhead', step: '0.1', unit: 'm' },
          {
            key: 'sayers_calc',
            header: 'Sayers Peak Power',
            category: 'calc',
            field: 'sayers',
            isCalculated: true,
            unit: 'W',
            calcFn: (_, data) => {
              const vj = parseFloat(data.power_speed_data?.vertical_jump) || 0;
              const wt = parseFloat(data.anthropometrics?.weight) || 0;
              return calculateSayersPower(vj, wt) || '—';
            }
          },
          { key: 'dj_height', header: 'Drop Jump Ht', category: 'power_speed_data', field: 'drop_jump_height', step: '0.5', unit: 'cm' },
          { key: 'dj_ct', header: 'Contact Time', category: 'power_speed_data', field: 'drop_jump_contact_time', step: '1', unit: 'ms' },
          {
            key: 'rsi_calc',
            header: 'Drop Jump RSI',
            category: 'calc',
            field: 'rsi',
            isCalculated: true,
            calcFn: (_, data) => {
              const ht = parseFloat(data.power_speed_data?.drop_jump_height) || 0;
              const ct = parseFloat(data.power_speed_data?.drop_jump_contact_time) || 0;
              return calculateDropJumpRSI(ht, ct) || '—';
            }
          }
        ];

      case 'speed_agility':
        return [
          { key: 'sp_10m', header: '10m Sprint Gate', category: 'power_speed_data', field: 'sprint_10m', step: '0.01', unit: 's' },
          { key: 'sp_20m', header: '20m Sprint Gate', category: 'power_speed_data', field: 'sprint_20m', step: '0.01', unit: 's' },
          { key: 'sp_30m', header: '30m Sprint Gate', category: 'power_speed_data', field: 'sprint_30m', step: '0.01', unit: 's' },
          { key: 'semo', header: 'Semo Agility', category: 'agility_data', field: 'semo_time', step: '0.01', unit: 's' },
          { key: 't_agil', header: 'T-Agility', category: 'agility_data', field: 't_agility_time', step: '0.01', unit: 's' }
        ];

      case 'fms':
        return [
          { key: 'fms_ohs', header: 'OHS (0-3)', category: 'fms_data', field: 'ohs_final', step: '1' },
          { key: 'fms_hurdle_r', header: 'Hurdle R', category: 'fms_data', field: 'hurdle_r', step: '1' },
          { key: 'fms_hurdle_l', header: 'Hurdle L', category: 'fms_data', field: 'hurdle_l', step: '1' },
          { key: 'fms_lunge_r', header: 'Lunge R', category: 'fms_data', field: 'lunge_r', step: '1' },
          { key: 'fms_lunge_l', header: 'Lunge L', category: 'fms_data', field: 'lunge_l', step: '1' },
          { key: 'fms_shoulder_r', header: 'Shoulder R', category: 'fms_data', field: 'shoulder_r', step: '1' },
          { key: 'fms_shoulder_l', header: 'Shoulder L', category: 'fms_data', field: 'shoulder_l', step: '1' },
          { key: 'fms_aslr_r', header: 'ASLR R', category: 'fms_data', field: 'aslr_r', step: '1' },
          { key: 'fms_aslr_l', header: 'ASLR L', category: 'fms_data', field: 'aslr_l', step: '1' },
          { key: 'fms_pushup', header: 'Push-Up', category: 'fms_data', field: 'pushup', step: '1' },
          { key: 'fms_rotary_r', header: 'Rotary R', category: 'fms_data', field: 'rotary_r', step: '1' },
          { key: 'fms_rotary_l', header: 'Rotary L', category: 'fms_data', field: 'rotary_l', step: '1' }
        ];

      case 'aerobic':
        return [
          { key: 'yoyo_dist', header: 'Yo-Yo Distance', category: 'aerobic_data', field: 'distance_meters', step: '20', unit: 'm' },
          { key: 'yoyo_level', header: 'Level & Shuttle', category: 'aerobic_data', field: 'level_shuttle', type: 'text' },
          {
            key: 'vo2_calc',
            header: 'VO2 Max (Calc)',
            category: 'calc',
            field: 'vo2_max',
            isCalculated: true,
            unit: 'mL/kg/min',
            calcFn: (_, data) => {
              const d = parseFloat(data.aerobic_data?.distance_meters) || 0;
              return calculateYoYoVO2Max(d) || '—';
            }
          },
          { key: 'rest_hr', header: 'Resting HR', category: 'aerobic_data', field: 'resting_hr', step: '1', unit: 'bpm' },
          { key: 'max_hr', header: 'Peak HR', category: 'aerobic_data', field: 'max_hr', step: '1', unit: 'bpm' },
          { key: 'rec_hr', header: '1-Min Recovery HR', category: 'aerobic_data', field: 'recovery_hr_1min', step: '1', unit: 'bpm' }
        ];

      case 'all':
      default:
        return [
          { key: 'weight', header: 'Weight (kg)', category: 'anthropometrics', field: 'weight', step: '0.1' },
          { key: 'cmj', header: 'CMJ (cm)', category: 'power_speed_data', field: 'vertical_jump', step: '0.5' },
          { key: 'broad', header: 'Broad Jump (cm)', category: 'power_speed_data', field: 'broad_jump', step: '1' },
          { key: 'sp_10m', header: '10m Sprint (s)', category: 'power_speed_data', field: 'sprint_10m', step: '0.01' },
          { key: 'semo', header: 'Agility (s)', category: 'agility_data', field: 'semo_time', step: '0.01' },
          { key: 'yoyo_dist', header: 'Yo-Yo Dist (m)', category: 'aerobic_data', field: 'distance_meters', step: '20' },
          {
            key: 'vo2_calc',
            header: 'VO2 Max',
            category: 'calc',
            field: 'vo2_max',
            isCalculated: true,
            calcFn: (_, data) => {
              const d = parseFloat(data.aerobic_data?.distance_meters) || 0;
              return calculateYoYoVO2Max(d) || '—';
            }
          }
        ];
    }
  }, [activeStation]);

  const getCellStatusClass = (status?: string) => {
    switch (status) {
      case 'saving':
        return 'border-primary ring-2 ring-primary/20 bg-primary/5 animate-pulse';
      case 'saved':
        return 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/50 transition-all duration-500';
      case 'error':
        return 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-50';
      case 'dirty':
        return 'border-amber-400 bg-amber-50/20';
      default:
        return 'border-slate-200 focus-within:border-primary';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ─────────────────────────────────────────────────────────────
          1. BATCH HEADER & STATION PRESETS
          ───────────────────────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="border-emerald-400/40 bg-emerald-400/20 text-emerald-300 font-black uppercase text-[10px] tracking-widest px-2.5 py-0.5">
                Mode 2: Group / Combine Matrix
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white text-[10px] font-bold">
                High-Density Spreadsheet Mode
              </Badge>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight font-display">
              Station Testing & Mass Combine Grid
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Keyboard driven spreadsheet entry with live auto-saving and instant multi-athlete calculations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchGrid()}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Grid
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-6 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          {/* Squad / Batch Selector */}
          <div className="sm:col-span-1 lg:col-span-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Select Squad / Batch</Label>
              <button
                type="button"
                onClick={() => setIsGroupsModalOpen(true)}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Users className="w-3 h-3" /> Manage Groups
              </button>
            </div>
            <Select value={selectedBatch} onValueChange={(val) => setSelectedBatch(val)}>
              <SelectTrigger className="bg-white h-11 font-bold text-sm border-slate-300">
                <SelectValue placeholder="Select Batch / Group" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {clientGroups.length > 0 ? (
                  clientGroups.map((g: any) => (
                    <SelectItem key={g.id || g.name} value={g.name} className="font-bold text-xs py-2.5">
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="font-bold text-slate-900">{g.name}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                          {g.client_group_members?.length || 0} athletes
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-xs text-slate-500 font-semibold mb-2">No groups created yet.</p>
                    <button
                      type="button"
                      onClick={() => setIsGroupsModalOpen(true)}
                      className="text-xs font-bold text-primary underline"
                    >
                      Click here to create a group
                    </button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Sport Protocol */}
          <div className="sm:col-span-1 lg:col-span-3 space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Protocol Battery</Label>
            <Select value={selectedProtocolSlug} onValueChange={(val) => setSelectedProtocolSlug(val)}>
              <SelectTrigger className="bg-white h-11 font-bold text-sm border-slate-300">
                <SelectValue placeholder="Protocol" />
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

          {/* Testing Date */}
          <div className="sm:col-span-1 lg:col-span-2 space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Testing Date</Label>
            <Input
              type="date"
              value={assessmentDate}
              onChange={(e) => setAssessmentDate(e.target.value)}
              className="bg-white h-11 font-semibold text-sm border-slate-300"
            />
          </div>

          {/* Search Filter */}
          <div className="sm:col-span-1 lg:col-span-4 space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Filter Grid Athletes</Label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search athlete name or UHID..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-white h-11 pl-9 text-xs border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Sports Scientist Group Reflection Banner */}
        {activeClientGroup && (
          <div className="mx-4 sm:mx-6 my-4 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-slate-900 uppercase tracking-tight">
                    Sports Scientist Group: {activeClientGroup.name}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-900 border-emerald-300 font-bold">
                    {gridData?.athletes?.length || activeClientGroup.client_group_members?.length || 0} Athletes in Grid
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  <strong className="text-slate-800">Athletes in this Group:</strong>{' '}
                  {activeGroupMemberNames.length > 0 ? (
                    <span className="text-emerald-950 font-semibold">{activeGroupMemberNames.join(' • ')}</span>
                  ) : gridData?.athletes?.length > 0 ? (
                    <span className="text-emerald-950 font-semibold">{gridData.athletes.map((a: any) => a.athlete.full_name).join(' • ')}</span>
                  ) : (
                    <span className="italic text-slate-400">No members assigned to this group yet.</span>
                  )}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsGroupsModalOpen(true)}
              className="text-xs font-bold gap-1.5 bg-white hover:bg-slate-50 border-emerald-300 text-emerald-950 shrink-0 h-8 shadow-sm"
            >
              <Pencil className="w-3.5 h-3.5 text-emerald-600" /> Edit Group Members
            </Button>
          </div>
        )}

        {/* Station Presets Bar with Interactive Sideways Scrolling */}
        <div className="relative flex items-center w-full bg-white border-b">
          {canScrollStationLeft && (
            <button
              type="button"
              onClick={() => handleStationScroll('left')}
              className="absolute left-1.5 z-20 w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all hover:scale-110 active:scale-95"
              title="Scroll station tabs left"
              aria-label="Scroll station tabs left"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}

          <div
            ref={stationScrollRef}
            onScroll={checkStationScroll}
            onWheel={handleStationWheel}
            className="w-full px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto touch-pan-x overscroll-x-contain scroll-smooth"
          >
            <span className="text-[11px] font-black uppercase text-slate-400 mr-2 shrink-0">Station View:</span>
            {[
              { id: 'jump_power', label: 'Jump & Power Station' },
              { id: 'speed_agility', label: 'Speed & Agility Gates' },
              { id: 'fms', label: 'FMS Movement Screen' },
              { id: 'anthropometrics', label: 'Anthropometrics Station' },
              { id: 'aerobic', label: 'Aerobic Shuttle / Yo-Yo' },
              { id: 'all', label: 'All Metrics (Full View)' }
            ].map(station => (
              <button
                key={station.id}
                onClick={(e) => {
                  setActiveStation(station.id as StationPreset);
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                }}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0 transition-all ${
                  activeStation === station.id
                    ? 'bg-slate-900 text-white shadow-sm scale-105'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {station.label}
              </button>
            ))}
          </div>

          {canScrollStationRight && (
            <button
              type="button"
              onClick={() => handleStationScroll('right')}
              className="absolute right-1.5 z-20 w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all hover:scale-110 active:scale-95"
              title="Scroll station tabs right"
              aria-label="Scroll station tabs right"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          2. EXCEL-LIKE HIGH DENSITY GRID MATRIX
          ───────────────────────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="p-4 bg-slate-50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="font-bold text-slate-700">
              Showing <strong>{athleteList.length}</strong> Athletes in {selectedBatch}
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Saved
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary animate-pulse ml-2"></span> Auto-Saving
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 ml-2"></span> Unsaved
            </div>
          </div>
          <div className="text-[11px] text-slate-400 hidden lg:block">
            Use <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-xs font-mono">Arrow Keys</kbd> or <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-xs font-mono">Enter</kbd> to jump between cells
          </div>
        </div>

        <div className="overflow-x-auto max-h-[620px] relative">
          <Table className="border-collapse">
            <TableHeader className="bg-slate-100 sticky top-0 z-10 shadow-xs">
              <TableRow className="border-b-2 border-slate-300">
                <TableHead className="w-64 font-black uppercase text-xs text-slate-800 bg-slate-100 sticky left-0 z-20">
                  Athlete Profile
                </TableHead>
                {columns.map((col) => (
                  <TableHead key={col.key} className="text-center font-black uppercase text-xs text-slate-800 px-3 min-w-[130px]">
                    <div>{col.header}</div>
                    {col.unit && <span className="text-[10px] text-slate-400 font-normal">({col.unit})</span>}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {gridLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="h-44 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-xs text-slate-500 mt-2 font-bold">Loading batch testing matrix...</p>
                  </TableCell>
                </TableRow>
              ) : athleteList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="h-44 text-center">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-700 mt-2">No athletes found for this squad.</p>
                    <p className="text-xs text-slate-400">Use the quick-action below to add athletes to this testing grid.</p>
                  </TableCell>
                </TableRow>
              ) : (
                athleteList.map((item: any, rowIndex: number) => {
                  const ath = item.athlete;
                  const athData = matrixData[ath.id] || {};

                  return (
                    <TableRow key={ath.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                      {/* Fixed Left Athlete Info Column */}
                      <TableCell className="font-medium p-3 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-xs">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 border bg-slate-100 shrink-0">
                            <AvatarFallback className="font-black text-xs text-slate-700">
                              {ath.first_name?.[0]}{ath.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 truncate leading-tight">
                              {ath.full_name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span>UHID: {ath.uhid}</span>
                              {ath.gender && <span>• {ath.gender}</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Interactive Metric Input Cells */}
                      {columns.map((col, colIndex) => {
                        const cellKey = `${ath.id}:${col.category}:${col.field}`;
                        const cellState = cellStates[cellKey] || { status: 'idle' };

                        // If read-only auto-calculation column
                        if (col.isCalculated && col.calcFn) {
                          const calculatedVal = col.calcFn(item, athData);
                          return (
                            <TableCell key={col.key} className="text-center p-2 bg-slate-50/50">
                              <span className="inline-block px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-black text-primary border border-slate-200">
                                {calculatedVal}
                              </span>
                            </TableCell>
                          );
                        }

                        // Regular editable cell
                        const curValue = athData[col.category]?.[col.field] ?? '';

                        return (
                          <TableCell key={col.key} className="p-1.5 text-center">
                            <div className="relative flex items-center justify-center">
                              <Input
                                id={`matrix-cell-${rowIndex}-${colIndex}`}
                                type={col.type || 'number'}
                                step={col.step || 'any'}
                                value={curValue}
                                onChange={(e) => handleCellChange(ath.id, col.category, col.field, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex, athleteList.length, columns.length)}
                                placeholder="—"
                                className={`h-10 text-center font-bold text-xs rounded-lg transition-all ${getCellStatusClass(cellState.status)}`}
                              />
                              {cellState.status === 'saving' && (
                                <Loader2 className="w-3 h-3 text-primary animate-spin absolute right-2 pointer-events-none" />
                              )}
                              {cellState.status === 'saved' && (
                                <Check className="w-3 h-3 text-emerald-500 absolute right-2 pointer-events-none" />
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. ADD ATHLETE QUICK-ACTION FOOTER
            ───────────────────────────────────────────────────────────── */}
        <div className="p-4 bg-slate-50 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">
              Quick Append Athlete:
            </span>
            <div className="w-72">
              <Select value={quickAddAthleteId} onValueChange={(val) => setQuickAddAthleteId(val)}>
                <SelectTrigger className="bg-white h-10 text-xs font-semibold border-slate-300">
                  <SelectValue placeholder="Choose athlete to add..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {allAthletes
                    .filter(a => !athleteList.some((item: any) => item.athlete.id === a.id))
                    .map((ath) => (
                      <SelectItem key={ath.id} value={ath.id} className="text-xs">
                        {ath.full_name} (UHID: {ath.uhid})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleQuickAddAthlete}
              disabled={!quickAddAthleteId}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-10 gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Row
            </Button>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Grid Station Battery: <strong>{activeProtocol?.template_name}</strong></span>
          </div>
        </div>
      </Card>

      {/* Sports Scientist Manage Groups Modal */}
      <ClientGroupsModal
        open={isGroupsModalOpen}
        onOpenChange={(open) => {
          setIsGroupsModalOpen(open);
          if (!open) {
            refetchClientGroups();
            queryClient.invalidateQueries({ queryKey: ['client-groups-all'] });
            queryClient.invalidateQueries({ queryKey: ['performance-batches'] });
            queryClient.invalidateQueries({ queryKey: ['performance-batch-grid'] });
          }
        }}
      />
    </div>
  );
}
