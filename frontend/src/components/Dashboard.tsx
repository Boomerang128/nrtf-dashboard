"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity, Thermometer, Gauge, Zap, AlertTriangle, CheckCircle2, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type SensorData = {
  id: string;
  current: number;
  energy_kwh: number;
  vibration: number;
  pressure_hpa: number;
  temp_c: number;
  is_anomaly?: boolean;
  ai_status?: string;
  anomaly_score?: number;
  confidence?: number;
  timestamp: string;
};

export default function Dashboard() {
  const [dataHistory, setDataHistory] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState<SensorData[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
    
    // In production/Docker, 'backend' hostname is internal and not reachable by the browser.
    // We resolve it to the current window hostname (usually localhost or the server IP).
    const resolvedWsUrl = (typeof window !== "undefined" && wsUrl.includes("backend"))
      ? wsUrl.replace("backend", window.location.hostname)
      : wsUrl;

    const apiUrl = resolvedWsUrl.replace("ws://", "http://").replace("/ws", "/history");
    
    // 1. Fetch initial history from DB
    const fetchHistory = async () => {
      try {
        const response = await fetch(apiUrl);
        const history = await response.json();
        
        if (history && Array.isArray(history)) {
          const formattedHistory = history.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })
          }));
          
          setDataHistory(formattedHistory);
          
          const historyAlerts = formattedHistory
            .filter((d: SensorData) => d.is_anomaly)
            .reverse();
          setAlerts(historyAlerts);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };

    fetchHistory();

    // 2. Connect WebSocket for real-time updates
    const connectWs = () => {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connectWs, 3000);
      };
      
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const newData: SensorData = {
            ...payload,
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
          };
          
          setDataHistory((prev) => {
            const updated = [...prev, newData];
            if (updated.length > 25) updated.shift();
            return updated;
          });

          if (newData.is_anomaly) {
            setAlerts((prev) => {
              const updated = [newData, ...prev];
              if (updated.length > 50) updated.pop();
              return updated;
            });
          }
        } catch (err) {
          console.error("Error parsing WS data:", err);
        }
      };
      
      wsRef.current = ws;
    };

    connectWs();
    return () => wsRef.current?.close();
  }, []);

  const latestData = dataHistory[dataHistory.length - 1];
  const confidence = latestData?.confidence ?? 0;
  const anomalyScore = latestData?.anomaly_score ?? 0;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 lg:p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-white/5"
        >
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              NRTF Hybrid Showstopper
            </h1>
            <p className="text-slate-400 mt-1 font-medium tracking-wide text-sm uppercase">Industrial IoT & AI Analytics Dashboard</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
             <a 
              href="https://github.com/Boomerang128/nrtfpart3sidequest"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/30 transition-all group"
            >
              <Thermometer className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-wider">Waste Heat Design</span>
            </a>
            <div className="flex items-center space-x-3 bg-slate-900/80 px-4 py-2 rounded-full border border-white/10 shadow-xl backdrop-blur-lg">
              <div className="relative flex h-3 w-3">
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isConnected ? "bg-emerald-400" : "bg-rose-400")}></span>
                <span className={cn("relative inline-flex rounded-full h-3 w-3", isConnected ? "bg-emerald-500" : "bg-rose-500")}></span>
              </div>
              <span className="text-sm font-semibold tracking-wide text-slate-200">
                {isConnected ? "SYSTEM ONLINE" : "CONNECTING..."}
              </span>
            </div>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AnimatedStatCard 
                title="Vibration" 
                value={latestData?.vibration.toFixed(4) || "0.0000"} 
                unit="m/s²"
                icon={<Activity className="w-5 h-5 text-indigo-400" />}
                status={latestData?.is_anomaly ? "danger" : "normal"}
                data={dataHistory}
                dataKey="vibration"
                color="#818cf8"
                delay={0.1}
              />
              <AnimatedStatCard 
                title="Energy" 
                value={latestData?.energy_kwh.toFixed(2) || "0.00"} 
                unit="kWh"
                icon={<Zap className="w-5 h-5 text-amber-400" />}
                data={dataHistory}
                dataKey="energy_kwh"
                color="#fbbf24"
                delay={0.2}
              />
              <AnimatedStatCard 
                title="Pressure" 
                value={latestData?.pressure_hpa.toFixed(1) || "0.0"} 
                unit="hPa"
                icon={<Gauge className="w-5 h-5 text-emerald-400" />}
                data={dataHistory}
                dataKey="pressure_hpa"
                color="#34d399"
                delay={0.3}
              />
              <AnimatedStatCard 
                title="Temperature" 
                value={latestData?.temp_c.toFixed(2) || "0.00"} 
                unit="°C"
                icon={<Thermometer className="w-5 h-5 text-rose-400" />}
                data={dataHistory}
                dataKey="temp_c"
                color="#fb7185"
                delay={0.4}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PremiumChart title="Vibration Telemetry" data={dataHistory} dataKey="vibration" color="#818cf8" gradientId="colorVib" />
              <PremiumChart title="Thermal Analytics" data={dataHistory} dataKey="temp_c" color="#fb7185" gradientId="colorTemp" />
            </div>
          </div>

          {/* Right Sidebar: ML Gauge + Alerts */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* ML Anomaly Confidence Gauge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#0f172a]/90 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-6 relative z-10">
                <Brain className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-lg text-slate-100">Isolation Forest ML</h3>
              </div>
              
              <div className="flex items-center justify-center relative z-10">
                <AnomalyGauge score={confidence} isAnomaly={latestData?.is_anomaly || false} />
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm relative z-10">
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                  <span className="text-slate-500 text-xs uppercase tracking-wider block">Raw Score</span>
                  <span className="text-slate-100 font-mono font-bold text-lg">{anomalyScore.toFixed(4)}</span>
                </div>
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                  <span className="text-slate-500 text-xs uppercase tracking-wider block">Status</span>
                  <span className={cn(
                    "font-bold text-lg",
                    latestData?.is_anomaly ? "text-rose-400" : "text-emerald-400"
                  )}>
                    {latestData?.is_anomaly ? "ANOMALY" : "NORMAL"}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* AI Sentinel Log */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-[#0f172a]/90 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
              
              <div className="bg-[#0f172a] p-5 border-b border-white/5 flex items-center justify-between z-10">
                <h3 className="font-bold text-lg flex items-center gap-2 text-slate-100">
                  <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
                  AI Sentinel Log
                </h3>
                <span className="text-[10px] uppercase tracking-widest bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full font-bold border border-purple-500/30">
                  Isolation Forest
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 h-[400px] z-10 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {alerts.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4"
                    >
                      <div className="relative">
                        <div className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 relative z-10 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-slate-300">System Nominal</p>
                        <p className="text-sm text-slate-500">Awaiting anomaly detection...</p>
                      </div>
                    </motion.div>
                  ) : (
                    alerts.map((alert, idx) => (
                      <motion.div 
                        key={alert.timestamp + idx}
                        initial={{ opacity: 0, x: 50, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="group bg-rose-950/30 border border-rose-500/20 hover:border-rose-500/50 rounded-2xl p-4 flex gap-3 transition-colors relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                        <div className="mt-1 flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-rose-400 font-black text-sm tracking-wide">ANOMALY</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30">
                                {(alert.confidence ?? 0).toFixed(1)}%
                              </span>
                              <span className="text-slate-400 text-xs font-mono">{alert.timestamp}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono bg-black/20 p-2 rounded-lg border border-white/5">
                            <div className="flex flex-col"><span className="text-slate-500">VIB</span><span className="text-slate-200">{alert.vibration.toFixed(4)}</span></div>
                            <div className="flex flex-col"><span className="text-slate-500">TMP</span><span className="text-slate-200">{alert.temp_c.toFixed(2)}</span></div>
                            <div className="flex flex-col"><span className="text-slate-500">PRS</span><span className="text-slate-200">{alert.pressure_hpa.toFixed(1)}</span></div>
                            <div className="flex flex-col"><span className="text-slate-500">CUR</span><span className="text-slate-200">{alert.current.toFixed(3)}</span></div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(51, 65, 85, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(71, 85, 105, 0.8); }
      `}} />
    </div>
  );
}

// ─── Anomaly Gauge Component ─────────────────────────────────────────
function AnomalyGauge({ score, isAnomaly }: { score: number; isAnomaly: boolean }) {
  const radius = 70;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  
  const getColor = () => {
    if (score < 30) return "#34d399";    // green
    if (score < 60) return "#fbbf24";    // amber
    return "#f43f5e";                     // red
  };
  
  return (
    <div className="relative w-44 h-44">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        {/* Background ring */}
        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        {/* Progress ring */}
        <circle
          cx="80" cy="80" r={radius} fill="none"
          stroke={getColor()}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-black", isAnomaly ? "text-rose-400" : "text-emerald-400")}>
          {score.toFixed(1)}%
        </span>
        <span className="text-slate-500 text-xs uppercase tracking-widest mt-1">Confidence</span>
      </div>
      {/* Glow effect */}
      {isAnomaly && (
        <div className="absolute inset-0 rounded-full bg-rose-500/10 blur-xl animate-pulse pointer-events-none" />
      )}
    </div>
  );
}

// ─── Stat Card with Sparkline ────────────────────────────────────────
function AnimatedStatCard({ title, value, unit, icon, status = "normal", data, dataKey, color, delay }: any) {
  const isDanger = status === "danger";
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "relative bg-[#0f172a]/80 backdrop-blur-md rounded-3xl p-5 overflow-hidden transition-all duration-500 border",
        isDanger ? "shadow-[0_0_30px_-5px_rgba(225,29,72,0.3)] border-rose-500/50" : "shadow-xl border-white/5"
      )}
    >
      {isDanger && <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-transparent to-rose-500/10 opacity-50 pointer-events-none" />}

      <div className="flex items-center justify-between mb-2 relative z-10">
        <h3 className="text-slate-400 font-semibold text-sm tracking-wide uppercase">{title}</h3>
        <div className={cn("p-2 rounded-xl backdrop-blur-md border", isDanger ? "bg-rose-500/20 border-rose-500/30" : "bg-white/5 border-white/10")}>
          {icon}
        </div>
      </div>
      
      <div className="flex items-baseline gap-1 relative z-10 mb-4">
        <span className={cn("text-3xl font-black tracking-tight", isDanger ? "text-rose-400" : "text-slate-100")}>{value}</span>
        <span className="text-slate-500 font-bold text-xs">{unit}</span>
      </div>

      <div className="h-10 w-full relative z-10 opacity-70">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey={dataKey} stroke={isDanger ? "#fb7185" : color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// ─── Premium Area Chart ──────────────────────────────────────────────
function PremiumChart({ title, data, dataKey, color, gradientId }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="bg-[#0f172a]/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-xl"
    >
      <h3 className="text-lg font-bold text-slate-100 mb-6">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}
              itemStyle={{ color: color, fontWeight: 'bold' }}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fillOpacity={1} fill={`url(#${gradientId})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
