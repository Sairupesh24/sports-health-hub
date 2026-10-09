import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sliders,
  ShieldCheck,
  Activity,
  Zap,
  Info,
  CheckCircle2,
  FileCode,
  Layers,
  Save,
  RotateCcw,
  Sparkles,
  HeartPulse,
  Timer,
  Ruler,
  UserCheck,
  Scale,
  Loader2,
  Check,
  Flame,
  Gauge,
  Copy,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PerformanceProtocol } from './performanceTypes';

// Standard split options
const ALL_SPRINT_SPLITS = ['5m', '10m', '20m', '30m', '40m'];

// Standard FMS movements
const ALL_FMS_FIELDS = [
  { id: 'ohs', label: 'Overhead Deep Squat' },
  { id: 'hurdle_step', label: 'Hurdle Step (R/L)' },
  { id: 'inline_lunge', label: 'In-line Lunge (R/L)' },
  { id: 'shoulder_mobility', label: 'Shoulder Mobility (R/L)' },
  { id: 'shoulder_clearing', label: 'Shoulder Impingement Clearing' },
  { id: 'aslr', label: 'Active Straight Leg Raise (R/L)' },
  { id: 'trunk_pushup', label: 'Trunk Stability Push-up' },
  { id: 'extension_clearing', label: 'Spinal Extension Clearing' },
  { id: 'rotary_stability', label: 'Rotary Stability (R/L)' },
  { id: 'flexion_clearing', label: 'Spinal Flexion Clearing' },
  { id: 'ankle_dorsiflexion_r', label: 'Ankle Dorsiflexion (R)' },
  { id: 'ankle_dorsiflexion_l', label: 'Ankle Dorsiflexion (L)' }
];

// Standard Anthropometrics fields
const ALL_ANTHRO_FIELDS = [
  { id: 'standing_height', label: 'Standing Height (cm)' },
  { id: 'sitting_height', label: 'Sitting Height (cm)' },
  { id: 'weight', label: 'Body Weight (kg)' },
  { id: 'body_fat_pct', label: 'Body Fat (%)' },
  { id: 'muscle_mass_kg', label: 'Muscle Mass (kg)' },
  { id: 'arm_span', label: 'Arm Span (cm)' },
  { id: 'lower_limb_length_r', label: 'Lower Limb Length (R)' },
  { id: 'lower_limb_length_l', label: 'Lower Limb Length (L)' },
  { id: 'upper_limb_length_r', label: 'Upper Limb Length (R)' },
  { id: 'upper_limb_length_l', label: 'Upper Limb Length (L)' }
];

// Standard Needs Analysis fields
const ALL_NEEDS_FIELDS = [
  { id: 'sport_training_age', label: 'Sport Training Age (Years)' },
  { id: 'strength_training_age', label: 'Strength Training Age (Years)' },
  { id: 'playing_hand', label: 'Dominant / Playing Hand' },
  { id: 'dominant_foot', label: 'Dominant Kicking Foot' },
  { id: 'other_sports', label: 'Multi-Sport Exposure' },
  { id: 'event_specialty', label: 'Specialty / Event Discipline' },
  { id: 'role', label: 'Cricket Player Role' },
  { id: 'position', label: 'Football Pitch Position' },
  { id: 'discipline', label: 'Equestrian / Fencing Weapon' }
];

// Biomotor radar dimensions pool
const ALL_BIOMOTOR_DIMENSIONS = [
  'Power',
  'Speed',
  'Agility',
  'Strength',
  'Balance',
  'Flexibility',
  'Aerobic',
  'Anaerobic',
  'Cardiorespiratory',
  'Trunk'
];

export default function ProtocolConfigView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: protocols = [], isLoading } = useQuery<PerformanceProtocol[]>({
    queryKey: ['performance-protocols'],
    queryFn: () => apiFetch('/performance/protocols')
  });

  const [activeSlug, setActiveSlug] = useState<string>('badminton-assessment');
  const [templateTitle, setTemplateTitle] = useState<string>('');
  const [configDraft, setConfigDraft] = useState<any>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Sideways Navigation Scroll for Protocol Battery Selector
  const protoScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollProtoLeft, setCanScrollProtoLeft] = useState(false);
  const [canScrollProtoRight, setCanScrollProtoRight] = useState(false);

  const checkProtoScroll = () => {
    if (protoScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = protoScrollRef.current;
      setCanScrollProtoLeft(scrollLeft > 6);
      setCanScrollProtoRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  useEffect(() => {
    checkProtoScroll();
    const handleResize = () => checkProtoScroll();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(checkProtoScroll, 200);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [protocols]);

  const handleProtoScroll = (direction: 'left' | 'right') => {
    if (protoScrollRef.current) {
      protoScrollRef.current.scrollBy({
        left: direction === 'left' ? -240 : 240,
        behavior: 'smooth',
      });
      setTimeout(checkProtoScroll, 350);
    }
  };

  const handleProtoWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (protoScrollRef.current && protoScrollRef.current.scrollWidth > protoScrollRef.current.clientWidth) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        protoScrollRef.current.scrollLeft += e.deltaY;
        checkProtoScroll();
      }
    }
  };

  // Active protocol from server
  const activeProto = useMemo(() => {
    return protocols.find((p) => p.slug === activeSlug) || protocols[0];
  }, [protocols, activeSlug]);

  // Sync draft whenever active protocol changes or loads
  useEffect(() => {
    if (activeProto) {
      setTemplateTitle(activeProto.template_name || '');
      setConfigDraft(JSON.parse(JSON.stringify(activeProto.sections_config || {})));
    }
  }, [activeProto]);

  // Detect unsaved modifications
  const hasChanges = useMemo(() => {
    if (!activeProto) return false;
    const titleChanged = templateTitle !== activeProto.template_name;
    const configChanged = JSON.stringify(configDraft) !== JSON.stringify(activeProto.sections_config || {});
    return titleChanged || configChanged;
  }, [activeProto, templateTitle, configDraft]);

  // Reset draft to database values
  const handleReset = () => {
    if (!activeProto) return;
    setTemplateTitle(activeProto.template_name || '');
    setConfigDraft(JSON.parse(JSON.stringify(activeProto.sections_config || {})));
    toast({
      title: 'Changes Discarded',
      description: `Reverted to saved settings for ${activeProto.template_name}.`
    });
  };

  // Helper toggle section active state
  const toggleSection = (sectionKey: string, active: boolean) => {
    setConfigDraft((prev: any) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        active
      }
    }));
  };

  // Helper toggle field inside an array of fields (e.g. anthro, fms, needs)
  const toggleArrayField = (sectionKey: string, fieldId: string) => {
    setConfigDraft((prev: any) => {
      const section = prev[sectionKey] || { active: true, fields: [] };
      const currentFields: string[] = section.fields || [];
      const updatedFields = currentFields.includes(fieldId)
        ? currentFields.filter((f) => f !== fieldId)
        : [...currentFields, fieldId];

      return {
        ...prev,
        [sectionKey]: {
          ...section,
          fields: updatedFields
        }
      };
    });
  };

  // Helper toggle direct boolean property inside a section
  const toggleSectionProperty = (sectionKey: string, propKey: string, value: boolean) => {
    setConfigDraft((prev: any) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        [propKey]: value
      }
    }));
  };

  // Helper set direct string property inside a section
  const setSectionProperty = (sectionKey: string, propKey: string, value: any) => {
    setConfigDraft((prev: any) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        [propKey]: value
      }
    }));
  };

  // Toggle sprint split tag
  const toggleSprintSplit = (split: string) => {
    setConfigDraft((prev: any) => {
      const ps = prev.power_speed || { active: true, sprint_splits: [] };
      const currentSplits: string[] = ps.sprint_splits || [];
      const updated = currentSplits.includes(split)
        ? currentSplits.filter((s) => s !== split)
        : [...currentSplits, split].sort();

      return {
        ...prev,
        power_speed: {
          ...ps,
          sprint_splits: updated
        }
      };
    });
  };

  // Toggle biomotor dimension tag
  const toggleBiomotorDimension = (dim: string) => {
    setConfigDraft((prev: any) => {
      const bm = prev.biomotor_ratings || { active: true, dimensions: [] };
      const currentDims: string[] = bm.dimensions || [];
      const updated = currentDims.includes(dim)
        ? currentDims.filter((d) => d !== dim)
        : [...currentDims, dim];

      return {
        ...prev,
        biomotor_ratings: {
          ...bm,
          dimensions: updated
        }
      };
    });
  };

  // Save changes to PostgreSQL
  const handleSaveProtocol = async () => {
    if (!activeProto) return;
    setIsSaving(true);
    try {
      await apiFetch('/performance/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport_name: activeProto.sport_name,
          template_name: templateTitle.trim() || activeProto.template_name,
          slug: activeProto.slug,
          sections_config: configDraft
        })
      });

      await queryClient.invalidateQueries({ queryKey: ['performance-protocols'] });

      toast({
        title: 'Protocol Saved Successfully',
        description: `Updated configuration for "${templateTitle || activeProto.template_name}" is now live across ISHPO.`
      });
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not update protocol configuration.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(configDraft, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
    toast({
      title: 'JSON Copied',
      description: 'Configuration schema copied to clipboard.'
    });
  };

  if (isLoading || !activeProto) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-bold text-slate-500">Loading sport protocols configuration...</p>
      </div>
    );
  }

  // Active section shortcut accessors
  const needsConfig = configDraft.needs_analysis || {};
  const anthroConfig = configDraft.anthropometrics || {};
  const fmsConfig = configDraft.fms || {};
  const stabilityConfig = configDraft.stability || {};
  const flexConfig = configDraft.flexibility || {};
  const powerConfig = configDraft.power_speed || {};
  const agilityConfig = configDraft.agility || {};
  const enduranceConfig = configDraft.endurance || {};
  const anaerobicConfig = configDraft.anaerobic || {};
  const aerobicConfig = configDraft.aerobic || {};
  const biomotorConfig = configDraft.biomotor_ratings || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      {/* ── BANNER & HEADER ── */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="border-emerald-400/40 bg-emerald-500/20 text-emerald-300 font-black uppercase text-[10px] tracking-widest px-2.5 py-0.5">
                Protocol Architecture
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white text-[10px] font-bold">
                Interactive Battery Editor
              </Badge>
              {hasChanges && (
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase animate-pulse">
                  Unsaved Changes
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight font-display">
              Sport Protocol & Diagnostic Configurations
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Customize active sections, required diagnostic fields, sprint gates, and formula rules across sport batteries.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSaveProtocol}
              disabled={isSaving || !hasChanges}
              className={`font-black text-xs gap-1.5 shadow-md ${
                hasChanges
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Protocol Selector Tabs with Interactive Sideways Scrolling */}
        <div className="relative flex items-center w-full bg-slate-50 border-b">
          {canScrollProtoLeft && (
            <button
              type="button"
              onClick={() => handleProtoScroll('left')}
              className="absolute left-1.5 z-20 w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all hover:scale-110 active:scale-95"
              title="Scroll protocols left"
              aria-label="Scroll protocols left"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}

          <div
            ref={protoScrollRef}
            onScroll={checkProtoScroll}
            onWheel={handleProtoWheel}
            className="w-full p-2.5 sm:p-3 flex items-center gap-2 overflow-x-auto touch-pan-x overscroll-x-contain scroll-smooth"
          >
            {protocols.map((p) => {
              const isSelected = activeProto?.slug === p.slug;
              return (
                <button
                  key={p.slug}
                  onClick={(e) => {
                    setActiveSlug(p.slug);
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                  }}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0 transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm scale-105'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {p.template_name}
                </button>
              );
            })}
          </div>

          {canScrollProtoRight && (
            <button
              type="button"
              onClick={() => handleProtoScroll('right')}
              className="absolute right-1.5 z-20 w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all hover:scale-110 active:scale-95"
              title="Scroll protocols right"
              aria-label="Scroll protocols right"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </Card>

      {/* ── METADATA & TITLE EDITOR ── */}
      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-2 lg:col-span-5 space-y-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Protocol Template Title
            </Label>
            <Input
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              className="font-bold text-slate-900 h-10 border-slate-300"
              placeholder="e.g. Badminton Performance Assessment"
            />
          </div>
          <div className="sm:col-span-1 lg:col-span-3 space-y-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sport Category
            </Label>
            <div className="h-10 px-3 flex items-center bg-slate-100 rounded-lg font-bold text-xs text-slate-700 border border-slate-200">
              {activeProto.sport_name}
            </div>
          </div>
          <div className="sm:col-span-1 lg:col-span-2 space-y-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              System Slug
            </Label>
            <div className="h-10 px-3 flex items-center bg-slate-100 rounded-lg font-mono text-xs text-slate-700 border border-slate-200">
              {activeProto.slug}
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-2 space-y-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Scope
            </Label>
            <div className="h-10 px-3 flex items-center bg-emerald-50 text-emerald-800 rounded-lg font-bold text-xs border border-emerald-200">
              {activeProto.org_id ? 'Custom Org' : 'Global ISHPO'}
            </div>
          </div>
        </div>
      </Card>

      {/* ── MAIN TABS: INTERACTIVE TOGGLES VS RAW JSONB ── */}
      <Tabs defaultValue="toggles" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-slate-200/80 p-1 rounded-xl h-auto flex flex-wrap sm:flex-nowrap gap-1">
            <TabsTrigger value="toggles" className="font-bold text-xs gap-1.5 whitespace-nowrap data-[state=active]:bg-white">
              <Sliders className="w-3.5 h-3.5 text-primary" /> Interactive Section Toggles
            </TabsTrigger>
            <TabsTrigger value="jsonb" className="font-bold text-xs gap-1.5 whitespace-nowrap data-[state=active]:bg-white">
              <FileCode className="w-3.5 h-3.5 text-indigo-500" /> PostgreSQL JSONB Inspector
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-bold text-slate-600 bg-white">
              Battery: {activeProto.template_name}
            </Badge>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 1: INTERACTIVE SECTION TOGGLES                            */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <TabsContent value="toggles" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* 1. NEEDS ANALYSIS & ATHLETE PROFILE */}
            <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <div>
                    <CardTitle className="text-sm font-black uppercase text-slate-900">
                      Needs Analysis & Sport Profile
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Sport history, training age, and sport specialty
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sw-needs" className="text-xs font-bold text-slate-600">
                    {needsConfig.active ? 'Active' : 'Disabled'}
                  </Label>
                  <Switch
                    id="sw-needs"
                    checked={!!needsConfig.active}
                    onCheckedChange={(checked) => toggleSection('needs_analysis', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Profile Fields:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_NEEDS_FIELDS.map((f) => {
                    const isEnabled = (needsConfig.fields || []).includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        disabled={!needsConfig.active}
                        onClick={() => toggleArrayField('needs_analysis', f.id)}
                        className={`p-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                          !needsConfig.active
                            ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                            : isEnabled
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate pr-1">{f.label}</span>
                        {isEnabled && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 2. ANTHROPOMETRICS & BODY COMPOSITION */}
            <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-indigo-500" />
                  <div>
                    <CardTitle className="text-sm font-black uppercase text-slate-900">
                      Anthropometrics & Morphology
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Stature, sitting height, body fat %, and limb lengths
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sw-anthro" className="text-xs font-bold text-slate-600">
                    {anthroConfig.active ? 'Active' : 'Disabled'}
                  </Label>
                  <Switch
                    id="sw-anthro"
                    checked={!!anthroConfig.active}
                    onCheckedChange={(checked) => toggleSection('anthropometrics', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Morphological Measurements:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_ANTHRO_FIELDS.map((f) => {
                    const isEnabled = (anthroConfig.fields || []).includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        disabled={!anthroConfig.active}
                        onClick={() => toggleArrayField('anthropometrics', f.id)}
                        className={`p-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                          !anthroConfig.active
                            ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                            : isEnabled
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate pr-1">{f.label}</span>
                        {isEnabled && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 3. FUNCTIONAL MOVEMENT SCREEN (FMS) */}
            <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <div>
                    <CardTitle className="text-sm font-black uppercase text-slate-900">
                      Functional Movement Screen (FMS)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      7-movement diagnostic scoring & pain clearing fail-safes
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sw-fms" className="text-xs font-bold text-slate-600">
                    {fmsConfig.active ? 'Active' : 'Disabled'}
                  </Label>
                  <Switch
                    id="sw-fms"
                    checked={!!fmsConfig.active}
                    onCheckedChange={(checked) => toggleSection('fms', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Screen Movement Patterns:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_FMS_FIELDS.map((f) => {
                    const isEnabled = (fmsConfig.fields || []).includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        disabled={!fmsConfig.active}
                        onClick={() => toggleArrayField('fms', f.id)}
                        className={`p-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                          !fmsConfig.active
                            ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                            : isEnabled
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate pr-1">{f.label}</span>
                        {isEnabled && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 4. DYNAMIC STABILITY & BALANCE */}
            <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-cyan-600" />
                  <div>
                    <CardTitle className="text-sm font-black uppercase text-slate-900">
                      Dynamic Stability & Balance (YBT / BESS)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Lower/Upper quarter Y-balance & BESS stance testing
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sw-stability" className="text-xs font-bold text-slate-600">
                    {stabilityConfig.active ? 'Active' : 'Disabled'}
                  </Label>
                  <Switch
                    id="sw-stability"
                    checked={!!stabilityConfig.active}
                    onCheckedChange={(checked) => toggleSection('stability', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/60">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Y-Balance Lower Quarter (YBT-LQ)</p>
                    <p className="text-[11px] text-slate-500">Ant, PM, PL reach & composite auto-calculation</p>
                  </div>
                  <Switch
                    disabled={!stabilityConfig.active}
                    checked={stabilityConfig.ybt_lower !== false}
                    onCheckedChange={(checked) => toggleSectionProperty('stability', 'ybt_lower', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/60">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Y-Balance Upper Quarter (YBT-UQ)</p>
                    <p className="text-[11px] text-slate-500">Med, IM, IL upper limb reach asymmetry</p>
                  </div>
                  <Switch
                    disabled={!stabilityConfig.active}
                    checked={!!stabilityConfig.ybt_upper}
                    onCheckedChange={(checked) => toggleSectionProperty('stability', 'ybt_upper', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/60">
                  <div>
                    <p className="text-xs font-bold text-slate-800">BESS Balance Stance Battery</p>
                    <p className="text-[11px] text-slate-500">Double leg, single leg, tandem error counts</p>
                  </div>
                  <Switch
                    disabled={!stabilityConfig.active}
                    checked={!!stabilityConfig.bess_balance}
                    onCheckedChange={(checked) => toggleSectionProperty('stability', 'bess_balance', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 5. POWER & SPEED BATTERY */}
            <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden md:col-span-2">
              <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <div>
                    <CardTitle className="text-sm font-black uppercase text-slate-900">
                      Power, Speed & Reactive Strength Battery
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Sayers jump power, broad jump, Drop Jump RSI, sprint gates, and dynamometry
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sw-powerspeed" className="text-xs font-bold text-slate-600">
                    {powerConfig.active ? 'Active' : 'Disabled'}
                  </Label>
                  <Switch
                    id="sw-powerspeed"
                    checked={!!powerConfig.active}
                    onCheckedChange={(checked) => toggleSection('power_speed', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                {/* Discrete test toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Vertical Jump (Sayers)</p>
                      <p className="text-[10px] text-slate-500">Automated Peak Power (Watts)</p>
                    </div>
                    <Switch
                      disabled={!powerConfig.active}
                      checked={powerConfig.vertical_jump !== false && powerConfig.vertical_jump_sayers !== false && powerConfig.cmj !== false}
                      onCheckedChange={(checked) => {
                        toggleSectionProperty('power_speed', 'vertical_jump', checked);
                        toggleSectionProperty('power_speed', 'vertical_jump_sayers', checked);
                      }}
                    />
                  </div>

                  <div className="p-3 rounded-xl border bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Broad Jump (cm)</p>
                      <p className="text-[10px] text-slate-500">Horizontal explosiveness</p>
                    </div>
                    <Switch
                      disabled={!powerConfig.active}
                      checked={powerConfig.broad_jump !== false}
                      onCheckedChange={(checked) => toggleSectionProperty('power_speed', 'broad_jump', checked)}
                    />
                  </div>

                  <div className="p-3 rounded-xl border bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Drop Jump RSI</p>
                      <p className="text-[10px] text-slate-500">Reactive Strength Index</p>
                    </div>
                    <Switch
                      disabled={!powerConfig.active}
                      checked={!!powerConfig.drop_jump_rsi}
                      onCheckedChange={(checked) => toggleSectionProperty('power_speed', 'drop_jump_rsi', checked)}
                    />
                  </div>

                  <div className="p-3 rounded-xl border bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Handgrip Dynamometry</p>
                      <p className="text-[10px] text-slate-500">Trials 1-3 (R & L, kg)</p>
                    </div>
                    <Switch
                      disabled={!powerConfig.active}
                      checked={!!powerConfig.handgrip_rl_trials}
                      onCheckedChange={(checked) => toggleSectionProperty('power_speed', 'handgrip_rl_trials', checked)}
                    />
                  </div>
                </div>

                {/* Medicine Ball Throw Type & Sprint Splits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Medicine Ball Throw Protocol</Label>
                    <Select
                      disabled={!powerConfig.active}
                      value={powerConfig.mb_throw_type || 'none'}
                      onValueChange={(val) => setSectionProperty('power_speed', 'mb_throw_type', val)}
                    >
                      <SelectTrigger className="bg-white h-10 text-xs font-semibold">
                        <SelectValue placeholder="Select MB throw type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Disabled / Not Tested</SelectItem>
                        <SelectItem value="kneeling_oh">Kneeling Overhead Throw (m)</SelectItem>
                        <SelectItem value="kneeling_rotational_rl">Kneeling Rotational Throw (R/L, m)</SelectItem>
                        <SelectItem value="half_kneeling_mb">Half-Kneeling MB Throw (m)</SelectItem>
                        <SelectItem value="oh_medball">Standing Overhead Soccer Throw (m)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Active Sprint Split Gates</Label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_SPRINT_SPLITS.map((split) => {
                        const isSelected = (powerConfig.sprint_splits || []).includes(split);
                        return (
                          <button
                            key={split}
                            type="button"
                            disabled={!powerConfig.active}
                            onClick={() => toggleSprintSplit(split)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              !powerConfig.active
                                ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                                : isSelected
                                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {split} Gate {isSelected && '✓'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 6. AGILITY & FOOTWORK */}
            <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-violet-500" />
                  <div>
                    <CardTitle className="text-sm font-black uppercase text-slate-900">
                      Agility & Change of Direction
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Sport-specific COD and footwork drills
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sw-agility" className="text-xs font-bold text-slate-600">
                    {agilityConfig.active ? 'Active' : 'Disabled'}
                  </Label>
                  <Switch
                    id="sw-agility"
                    checked={!!agilityConfig.active}
                    onCheckedChange={(checked) => toggleSection('agility', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Primary Agility Protocol</Label>
                  <Select
                    disabled={!agilityConfig.active}
                    value={agilityConfig.test_type || (agilityConfig.run_a_3 ? 'run_a_3' : 'semo')}
                    onValueChange={(val) => setSectionProperty('agility', 'test_type', val)}
                  >
                    <SelectTrigger className="bg-white h-10 text-xs font-semibold">
                      <SelectValue placeholder="Select Agility Test" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semo">SEMO Agility Test (Racket Sports)</SelectItem>
                      <SelectItem value="t_agility">T-Agility Test (Football / Court)</SelectItem>
                      <SelectItem value="y_agility">Y-Agility Test (Reactive COD / Fencing)</SelectItem>
                      <SelectItem value="run_a_3">Run-a-3 / Cricket Bat Sprint (Cricket)</SelectItem>
                      <SelectItem value="505_agility">5-0-5 Agility Test</SelectItem>
                      <SelectItem value="illinois">Illinois Agility Battery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border text-[11px] text-slate-500">
                  The individual assessment form will automatically render the timing gates and trial inputs associated with the selected agility drill.
                </div>
              </CardContent>
            </Card>

            {/* 7. TRUNK & MUSCULAR ENDURANCE */}
            <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <div>
                    <CardTitle className="text-sm font-black uppercase text-slate-900">
                      Trunk & Muscular Endurance
                    </CardTitle>
                    <CardDescription className="text-xs">
                      McGill trunk endurance lines, push-ups, and pull-ups
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sw-endurance" className="text-xs font-bold text-slate-600">
                    {enduranceConfig.active ? 'Active' : 'Disabled'}
                  </Label>
                  <Switch
                    id="sw-endurance"
                    checked={!!enduranceConfig.active}
                    onCheckedChange={(checked) => toggleSection('endurance', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border bg-slate-50/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Trunk Lines (Flex/Ext/Lat)</span>
                    <Switch
                      disabled={!enduranceConfig.active}
                      checked={enduranceConfig.trunk_lines !== false}
                      onCheckedChange={(checked) => toggleSectionProperty('endurance', 'trunk_lines', checked)}
                    />
                  </div>

                  <div className="p-2.5 rounded-xl border bg-slate-50/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Max Push-ups</span>
                    <Switch
                      disabled={!enduranceConfig.active}
                      checked={!!enduranceConfig.push_ups || !!enduranceConfig.pushups}
                      onCheckedChange={(checked) => {
                        toggleSectionProperty('endurance', 'push_ups', checked);
                        toggleSectionProperty('endurance', 'pushups', checked);
                      }}
                    />
                  </div>

                  <div className="p-2.5 rounded-xl border bg-slate-50/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Pull-ups / Mod. Pullup</span>
                    <Switch
                      disabled={!enduranceConfig.active}
                      checked={!!enduranceConfig.pull_ups || !!enduranceConfig.modified_pullup}
                      onCheckedChange={(checked) => {
                        toggleSectionProperty('endurance', 'pull_ups', checked);
                        toggleSectionProperty('endurance', 'modified_pullup', checked);
                      }}
                    />
                  </div>

                  <div className="p-2.5 rounded-xl border bg-slate-50/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Single-Leg Calf Raise</span>
                    <Switch
                      disabled={!enduranceConfig.active}
                      checked={!!enduranceConfig.sl_calf_raise_rl}
                      onCheckedChange={(checked) => toggleSectionProperty('endurance', 'sl_calf_raise_rl', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 8. ANAEROBIC ENGINE */}
            <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <div>
                    <CardTitle className="text-sm font-black uppercase text-slate-900">
                      Anaerobic Capacity Engine
                    </CardTitle>
                    <CardDescription className="text-xs">
                      RAST sprint power or Badminton MRSAT
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sw-anaerobic" className="text-xs font-bold text-slate-600">
                    {anaerobicConfig.active ? 'Active' : 'Disabled'}
                  </Label>
                  <Switch
                    id="sw-anaerobic"
                    checked={!!anaerobicConfig.active}
                    onCheckedChange={(checked) => toggleSection('anaerobic', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Anaerobic Engine Formula</Label>
                  <Select
                    disabled={!anaerobicConfig.active}
                    value={anaerobicConfig.test_type || 'rast'}
                    onValueChange={(val) => setSectionProperty('anaerobic', 'test_type', val)}
                  >
                    <SelectTrigger className="bg-white h-10 text-xs font-semibold">
                      <SelectValue placeholder="Select Anaerobic Test" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rast">RAST (Running-based Anaerobic Sprint Test, 6 x 35m)</SelectItem>
                      <SelectItem value="mrsat">MRSAT (Multi-Shuttle Badminton-Specific Endurance Test)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-200 text-[11px] text-orange-950">
                  {anaerobicConfig.test_type === 'mrsat' ? (
                    <span><strong>MRSAT active:</strong> Logs total stages completed (1-10) with automatic fatigue rating.</span>
                  ) : (
                    <span><strong>RAST active:</strong> Calculates Peak Power (W), Min Power (W), Average Power (W), and Fatigue Index (W/s).</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 9. AEROBIC CAPACITY */}
            <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <div>
                    <CardTitle className="text-sm font-black uppercase text-slate-900">
                      Aerobic Capacity & VO2 Max
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Yo-Yo intermittent recovery or continuous bleep test
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sw-aerobic" className="text-xs font-bold text-slate-600">
                    {aerobicConfig.active ? 'Active' : 'Disabled'}
                  </Label>
                  <Switch
                    id="sw-aerobic"
                    checked={!!aerobicConfig.active}
                    onCheckedChange={(checked) => toggleSection('aerobic', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Aerobic Test Protocol</Label>
                  <Select
                    disabled={!aerobicConfig.active}
                    value={aerobicConfig.test_type || 'yoyo_ir1'}
                    onValueChange={(val) => setSectionProperty('aerobic', 'test_type', val)}
                  >
                    <SelectTrigger className="bg-white h-10 text-xs font-semibold">
                      <SelectValue placeholder="Select Aerobic Test" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yoyo_ir1">Yo-Yo Intermittent Recovery Level 1 (IR1)</SelectItem>
                      <SelectItem value="yoyo_irt1">Yo-Yo IRT1 (Senior Combine / Elite Football)</SelectItem>
                      <SelectItem value="children_yoyo_irt1">Children Yo-Yo IRT1 (Youth / U-12)</SelectItem>
                      <SelectItem value="bleep_test">20m Multi-Stage Shuttle Run (Bleep Test)</SelectItem>
                      <SelectItem value="cooper_12min">12-Minute Cooper Run Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 text-[11px] text-rose-950">
                  VO2 Max is automatically derived using Bangsbo formula: <br />
                  <code className="font-mono text-[10px]">VO2 Max = Distance (m) × 0.0084 + 36.4</code>
                </div>
              </CardContent>
            </Card>

            {/* 10. BIO-MOTOR RADAR SPIDER CHART */}
            <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden md:col-span-2">
              <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <div>
                    <CardTitle className="text-sm font-black uppercase text-slate-900">
                      Bio-Motor Polygon Radar Dimensions
                    </CardTitle>
                    <CardDescription className="text-xs">
                      5-tier diagnostic radar axes mapped on printed reports and athlete profiles
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sw-biomotor" className="text-xs font-bold text-slate-600">
                    {biomotorConfig.active ? 'Active' : 'Disabled'}
                  </Label>
                  <Switch
                    id="sw-biomotor"
                    checked={!!biomotorConfig.active}
                    onCheckedChange={(checked) => toggleSection('biomotor_ratings', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Radar Dimensions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_BIOMOTOR_DIMENSIONS.map((dim) => {
                    const isSelected = (biomotorConfig.dimensions || []).includes(dim);
                    return (
                      <button
                        key={dim}
                        type="button"
                        disabled={!biomotorConfig.active}
                        onClick={() => toggleBiomotorDimension(dim)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          !biomotorConfig.active
                            ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                            : isSelected
                            ? 'bg-slate-900 text-white border-slate-950 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {dim}
                        {isSelected ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="text-slate-400">+</span>}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 2: POSTGRESQL JSONB INSPECTOR & RAW PREVIEW               */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <TabsContent value="jsonb" className="space-y-4">
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50 p-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-500" /> Live JSONB Schema
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time database payload generated for {activeProto.template_name}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyJson}
                  className="font-bold text-xs gap-1.5 bg-white"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedJson ? 'Copied' : 'Copy JSON'}
                </Button>
                <Badge variant="outline" className="text-[10px] font-mono bg-white">
                  PostgreSQL JSONB
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="p-6 bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[550px] leading-relaxed">
                {JSON.stringify(configDraft, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
