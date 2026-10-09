import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Grid,
  BarChart3,
  Sliders,
  Plus,
  ArrowRight,
  ClipboardList,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import IndividualAssessmentForm from '@/components/performance/IndividualAssessmentForm';
import GroupTestingMatrix from '@/components/performance/GroupTestingMatrix';
import AssessmentAnalytics from '@/components/performance/AssessmentAnalytics';
import ProtocolConfigView from '@/components/performance/ProtocolConfigView';

type HubView = 'individual' | 'grid' | 'analytics' | 'protocols';

export default function PerformanceTestingHub() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ subview?: string }>();

  // Determine active view based on URL
  const determineView = (): HubView => {
    const p = location.pathname;
    if (p.includes('/performance-testing/grid')) return 'grid';
    if (p.includes('/performance-testing/analytics')) return 'analytics';
    if (p.includes('/performance-testing/protocols')) return 'protocols';
    return 'individual';
  };

  const [activeView, setActiveView] = useState<HubView>(determineView());
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | undefined>(undefined);

  // Sideways Navigation Scroll State & Handlers
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkNavScroll = () => {
    if (navScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navScrollRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  useEffect(() => {
    checkNavScroll();
    const handleResize = () => checkNavScroll();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(checkNavScroll, 200);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  const handleNavScroll = (direction: 'left' | 'right') => {
    if (navScrollRef.current) {
      navScrollRef.current.scrollBy({
        left: direction === 'left' ? -260 : 260,
        behavior: 'smooth',
      });
      setTimeout(checkNavScroll, 350);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (navScrollRef.current && navScrollRef.current.scrollWidth > navScrollRef.current.clientWidth) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        navScrollRef.current.scrollLeft += e.deltaY;
        checkNavScroll();
      }
    }
  };

  useEffect(() => {
    setActiveView(determineView());
  }, [location.pathname]);

  const switchView = (view: HubView) => {
    setActiveView(view);
    if (view === 'grid') navigate('/ams/performance-testing/grid');
    else if (view === 'analytics') navigate('/ams/performance-testing/analytics');
    else if (view === 'protocols') navigate('/ams/performance-testing/protocols');
    else navigate('/ams/performance-testing');
  };

  const handleEditAssessment = (assessmentId: string) => {
    setEditingAssessmentId(assessmentId);
    setActiveView('individual');
    navigate('/ams/performance-testing');
  };

  return (
    <DashboardLayout role={profile?.role || 'sports_scientist'}>
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
        <main className="flex-1 p-6 md:p-10 space-y-8 max-w-[1720px] mx-auto w-full">
          {/* Top Module Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 font-display">
                  Performance Testing <span className="text-primary">& Diagnostics</span>
                </h1>
              </div>
              <p className="text-slate-500 font-bold uppercase text-[10px] sm:text-[11px] tracking-widest ml-1">
                Integrated Sports Health & Physio Operating System • Forms & Assessments
              </p>
            </div>

            {/* Quick Switch to Clinical Questionnaires & Intake */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/ams/questionnaires')}
                className="bg-white hover:bg-slate-50 font-bold text-xs gap-1.5 border-slate-300 whitespace-nowrap"
              >
                <ClipboardList className="w-4 h-4 text-slate-500" />
                Clinical Questionnaires & Intake
              </Button>
              {activeView !== 'individual' && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingAssessmentId(undefined);
                    switchView('individual');
                  }}
                  className="bg-primary hover:bg-primary/90 text-white font-black text-xs gap-1.5 shadow-md shadow-primary/20 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> New Individual Test
                </Button>
              )}
            </div>
          </div>

          {/* Module Sub-Navigation Switcher with interactive sideways scrolling */}
          <div className="relative flex items-center w-full">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => handleNavScroll('left')}
                className="absolute -left-2.5 z-20 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all hover:scale-110 active:scale-95"
                title="Scroll navigation left"
                aria-label="Scroll navigation left"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}

            <div
              ref={navScrollRef}
              onScroll={checkNavScroll}
              onWheel={handleWheel}
              className="w-full bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto touch-pan-x overscroll-x-contain scroll-smooth"
            >
              <button
                onClick={() => {
                  setEditingAssessmentId(undefined);
                  switchView('individual');
                }}
                className={`px-5 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
                  activeView === 'individual'
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Activity className="w-4 h-4" /> Individual Performance Testing Form
              </button>

              <button
                onClick={() => switchView('grid')}
                className={`px-5 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
                  activeView === 'grid'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Grid className="w-4 h-4" /> Station / Combine Testing Grid
              </button>

              <button
                onClick={() => switchView('analytics')}
                className={`px-5 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
                  activeView === 'analytics'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" /> Historical Assessment Analytics
              </button>

              <button
                onClick={() => switchView('protocols')}
                className={`px-5 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-wider flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
                  activeView === 'protocols'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sliders className="w-4 h-4" /> Protocol Configurations
              </button>
            </div>

            {canScrollRight && (
              <button
                type="button"
                onClick={() => handleNavScroll('right')}
                className="absolute -right-2.5 z-20 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all hover:scale-110 active:scale-95"
                title="Scroll navigation right"
                aria-label="Scroll navigation right"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Active Sub-View Render */}
          <div>
            {activeView === 'individual' && (
              <IndividualAssessmentForm
                assessmentId={editingAssessmentId}
                onSuccess={() => switchView('analytics')}
              />
            )}

            {activeView === 'grid' && (
              <GroupTestingMatrix />
            )}

            {activeView === 'analytics' && (
              <AssessmentAnalytics
                onEditAssessment={handleEditAssessment}
              />
            )}

            {activeView === 'protocols' && (
              <ProtocolConfigView />
            )}
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}
