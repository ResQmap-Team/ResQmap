import React from 'react';
import { DisasterProvider, useDisaster } from './context/DisasterContext';
import resqEmblem from './assets/resq_emblem.png';
import Navbar from './components/Navbar';
import StatsBar from './components/StatsBar';
import LiveMap from './components/LiveMap';
import IncidentDrawer from './components/IncidentDrawer';
import CitizenReportModal from './components/CitizenReportModal';
import ResponderHub from './components/ResponderHub';
import AnalyticsView from './components/AnalyticsView';
import AllReportsView from './components/AllReportsView';
import SettingsModal from './components/SettingsModal';
import ResilienceModal from './components/ResilienceModal';
import VolunteerHub from './components/VolunteerHub';
import SOSQueueView from './components/SOSQueueView';
import EmergencyContactsModal from './components/EmergencyContactsModal';
import SafeHousePanel from './components/SafeHousePanel';
import SafeHouseDetailsModal from './components/SafeHouseDetailsModal';
import GovDispatchModal from './components/GovDispatchModal';

function MainAppContent() {
  const { activeView } = useDisaster();

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white font-['Plus_Jakarta_Sans',sans-serif]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:px-6 lg:px-8 space-y-4">
        {/* Metric Triage Counters with P0-P3 and Cluster Status */}
        <StatsBar />

        {/* Dynamic Views */}
        {activeView === 'map' && <LiveMap />}
        {activeView === 'reports' && <AllReportsView />}
        {activeView === 'responder' && <ResponderHub />}
        {activeView === 'volunteers' && <VolunteerHub />}
        {activeView === 'analytics' && <AnalyticsView />}
        {activeView === 'sos' && <SOSQueueView />}

        {/* Global Modals & Slide-overs */}
        <IncidentDrawer />
        <CitizenReportModal />
        <SettingsModal />
        <ResilienceModal />
        <EmergencyContactsModal />
        <SafeHousePanel />
        <SafeHouseDetailsModal />
        <GovDispatchModal />
      </main>


      {/* Footer with ResQNet Branding */}
      <footer className="mt-8 border-t border-[#1f293d] bg-[#0d131f] py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src={resqEmblem} alt="RESQ" className="w-5 h-5 rounded object-cover" />
            <span>
              <b>RESQ</b> © 2026 — "From citizen evidence to coordinated response."
            </span>
          </div>
          <span className="font-mono text-slate-400">
            P0–P3 Priority Triage · Spatial Corroboration Engine · Multimodal AI Vision
          </span>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <DisasterProvider>
      <MainAppContent />
    </DisasterProvider>
  );
}
