/**
 * Aircraft Dashboard Component
 *
 * Main dashboard displaying real-time aircraft tracking data with interactive visualizations.
 *
 * Features:
 * - Real-time data fetching from backend Express API
 * - Interactive charts (bar, scatter, pie) showing altitude, speed, and category distributions
 * - Filterable data table with search and filter capabilities
 * - Summary statistics cards with trend indicators
 * - Integrated chat interface via floating button (bottom-right corner)
 *
 * Data Structure:
 * - Fetches from: /aircraft/api/aircraftSpeedAltitudeByType
 * - Supports filtering by: category, altitude range, speed range
 * - Displays 9 aircraft categories (A0-A7, D7)
 *
 * Chat Integration:
 * - Floating MessageSquare button toggles resizable chat panel
 * - Allows natural language queries to ClickHouse data
 * - Uses ResizableChatLayout for resizable chat interface
 */

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ScatterChart, Scatter, PieChart, Pie, Cell, Customized } from "recharts";
import { Plane, TrendingUp, TrendingDown, Activity, Filter, X, MessageSquare, Pause, Play } from "lucide-react";
import ResizableChatLayout, { useChatLayout } from "@/components/resizable-chat-layout";

interface AircraftData {
  aircraft_category: string;
  total_records: string;
  avg_barometric_altitude: number;
  min_barometric_altitude: number;
  max_barometric_altitude: number;
  altitude_stddev: number;
  avg_ground_speed: number;
  min_ground_speed: number;
  max_ground_speed: number;
  speed_stddev: number;
  unique_aircraft_count: string;
}

interface FilterParams {
  category?: string;
  minAltitude?: number;
  maxAltitude?: number;
  minSpeed?: number;
  maxSpeed?: number;
}

const CATEGORY_COLORS = {
  A0: "#8884d8",
  A1: "#82ca9d",
  A2: "#ffc658",
  A3: "#ff7300",
  A4: "#8dd1e1",
  A5: "#d084d0",
  A6: "#ffb347",
  A7: "#87ceeb",
  D7: "#ff6b6b",
};

const CATEGORY_DESCRIPTIONS = {
  A0: "No ADS-B Emitter Category",
  A1: "Light (< 15,500 lbs)",
  A2: "Small (15,500-75,000 lbs)",
  A3: "Large (75,000-300,000 lbs)",
  A4: "High Vortex Large",
  A5: "Heavy (> 300,000 lbs)",
  A6: "High Performance",
  A7: "Rotorcraft",
  D7: "No Category Info",
};

const chartConfig = {
  altitude: {
    label: "Altitude (ft)",
    color: "#2CE3D7",
  },
  speed: {
    label: "Speed (kts)",
    color: "#2CE3D7",
  },
  count: {
    label: "Aircraft Count",
    color: "#2CE3D7",
  },
};

export function AircraftDashboard() {
  const [data, setData] = useState<AircraftData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterParams>({});
  const [activeFilters, setActiveFilters] = useState<FilterParams>({});
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLiveUpdatesEnabled, setIsLiveUpdatesEnabled] = useState(true);

  const fetchData = async (filterParams: FilterParams = {}, isPolling: boolean = false) => {
    try {
      if (!isPolling) setLoading(true);
      if (!isPolling) setError(null);

      const queryParams = new URLSearchParams();
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const baseUrl = process.env.NEXT_PUBLIC_MOOSE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(
        `${baseUrl}/aircraft/api/aircraftSpeedAltitudeByType?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      if (!isPolling) setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeFilters);
    if (!isLiveUpdatesEnabled) return;
    const interval = setInterval(() => {
      fetchData(activeFilters, true);
    }, 20000); // Polling interval for real-time updates
    return () => clearInterval(interval);
  }, [activeFilters, isLiveUpdatesEnabled]);



  const handleFilterChange = (key: keyof FilterParams, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setActiveFilters(filters);
  };

  const clearFilters = () => {
    setFilters({});
    setActiveFilters({});
  };

  const totalAircraft = data.reduce((sum, item) => sum + parseInt(item.unique_aircraft_count), 0);
  const totalRecords = data.reduce((sum, item) => sum + parseInt(item.total_records), 0);
  const avgAltitude = data.reduce((sum, item) => sum + item.avg_barometric_altitude * parseInt(item.total_records), 0) / totalRecords;
  const avgSpeed = data.reduce((sum, item) => sum + item.avg_ground_speed * parseInt(item.total_records), 0) / totalRecords;

  // Sort data alphabetically by aircraft category for bar charts
  const sortedData = [...data].sort((a, b) => a.aircraft_category.localeCompare(b.aircraft_category));

  const scatterData = data.map(item => ({
    ...item,
    altitude: item.avg_barometric_altitude,
    speed: item.avg_ground_speed,
  }));

  const pieData = data.map(item => ({
    name: item.aircraft_category,
    value: parseInt(item.unique_aircraft_count),
    fill: CATEGORY_COLORS[item.aircraft_category as keyof typeof CATEGORY_COLORS] || "#8884d8",
  }));

  if (loading) {
    return (
      <ResizableChatLayout className="h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 animate-spin" />
            <span>Loading aircraft data...</span>
          </div>
        </div>
      </ResizableChatLayout>
    );
  }

  if (error) {
    return (
      <ResizableChatLayout className="h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-2">Error loading data: {error}</p>
            <Button onClick={() => fetchData()}>Retry</Button>
          </div>
        </div>
      </ResizableChatLayout>
    );
  }

  return (
    <ResizableChatLayout className="h-screen">
      <DashboardContent
        data={data}
        sortedData={sortedData}
        scatterData={scatterData}
        pieData={pieData}
        totalAircraft={totalAircraft}
        totalRecords={totalRecords}
        avgAltitude={avgAltitude}
        avgSpeed={avgSpeed}
        filters={filters}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        handleFilterChange={handleFilterChange}
        applyFilters={applyFilters}
        clearFilters={clearFilters}
        fetchData={fetchData}
        lastUpdated={lastUpdated}
        isLiveUpdatesEnabled={isLiveUpdatesEnabled}
        setIsLiveUpdatesEnabled={setIsLiveUpdatesEnabled}
      />
    </ResizableChatLayout>
  );
}

function GaugeCard({ title, value, description, icon: Icon, lastUpdated }: { title: string, value: React.ReactNode, description: string, icon: any, lastUpdated?: Date | null }) {
  const [hoverCount, setHoverCount] = useState(0);
  const updateKey = `${lastUpdated?.getTime() || 'init'}-${hoverCount}`;
  
  return (
    <div 
      className="relative flex flex-col items-center justify-center p-6 w-64 h-64 mx-auto rounded-full cursor-pointer"
      onMouseEnter={() => setHoverCount(prev => prev + 1)}
    >
      <style>{`
        @keyframes gaugePulse {
          0% { box-shadow: 0 0 10px rgba(44,227,215,0.1); transform: scale(0.95); opacity: 0.8; }
          40% { box-shadow: 0 0 60px rgba(44,227,215,0.8); transform: scale(1.05); opacity: 1; }
          100% { box-shadow: 0 0 30px rgba(44,227,215,0.15); transform: scale(1); opacity: 1; }
        }
        @keyframes gaugeSpin {
          0% { transform: rotate(-90deg) scale(0.95); }
          50% { transform: rotate(-60deg) scale(1.02); }
          100% { transform: rotate(-90deg) scale(1); }
        }
        @keyframes valPop {
          0% { transform: scale(0.8) translateY(10px); opacity: 0; filter: blur(4px); }
          50% { transform: scale(1.1) translateY(-2px); filter: blur(0px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Outer Cyan Glow behind ticks */}
      <div 
        key={`glow-${updateKey}`}
        className="absolute inset-2 rounded-full pointer-events-none"
        style={{ animation: 'gaugePulse 1s ease-out forwards', boxShadow: '0 0 30px rgba(44,227,215,0.15)' }}
      />
      
      {/* Ticks SVG */}
      <svg 
        key={`svg-${updateKey}`}
        className="absolute inset-0 w-full h-full pointer-events-none rounded-full" 
        viewBox="0 0 100 100" 
        style={{ animation: 'gaugeSpin 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards', transform: "rotate(-90deg)" }}
      >
         {/* Inner Circle line */}
         <circle cx="50" cy="50" r="46" fill="none" stroke="#1B4C48" strokeWidth="0.5" />
         {Array.from({ length: 60 }).map((_, i) => (
           <line
             key={i}
             x1="99"
             y1="50"
             x2={i % 5 === 0 ? "93" : "96"} 
             y2="50"
             stroke={i % 5 === 0 ? "#2CE3D7" : "#1B4C48"}
             strokeWidth="0.5"
             transform={`rotate(${(i * 360) / 60} 50 50)`}
           />
         ))}
      </svg>
      
      {/* Content */}
      <div className="absolute top-[22%] flex flex-col items-center">
        <Icon className="w-5 h-5 text-[#E9E9E9] mb-1 opacity-80" />
        <h3 className="text-[#E9E9E9] text-sm font-medium">{title}</h3>
      </div>
      
      <div 
        key={`val-${updateKey}`}
        className="text-5xl font-light text-[#2CE3D7] tracking-tight"
        style={{ animation: 'valPop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
      >
        {value}
      </div>
      
      <div className="absolute bottom-[23%] w-[80%] flex justify-center">
        <p className="text-xs text-[#939393] text-center leading-tight">{description}</p>
      </div>
    </div>
  )
}

function DashboardContent({
  data,
  sortedData,
  scatterData,
  pieData,
  totalAircraft,
  totalRecords,
  avgAltitude,
  avgSpeed,
  filters,
  showFilters,
  setShowFilters,
  handleFilterChange,
  applyFilters,
  clearFilters,
  fetchData,
  lastUpdated,
  isLiveUpdatesEnabled,
  setIsLiveUpdatesEnabled,
}: {
  data: AircraftData[];
  sortedData: AircraftData[];
  scatterData: any[];
  pieData: any[];
  totalAircraft: number;
  totalRecords: number;
  avgAltitude: number;
  avgSpeed: number;
  filters: FilterParams;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  handleFilterChange: (key: keyof FilterParams, value: string | number | undefined) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  fetchData: () => void;
  lastUpdated: Date | null;
  isLiveUpdatesEnabled: boolean;
  setIsLiveUpdatesEnabled: (enabled: boolean) => void;
}) {
  const { toggleChat } = useChatLayout();

  const HUD_SHADES = ["#00ffc3", "#00e6af", "#00cc9c", "#00b388", "#009974", "#008061", "#00664d", "#004d3a"];

  const pieDataHUD = [...pieData]
    .sort((a, b) => a.value - b.value)
    .map((item, index, arr) => ({
      ...item,
      fill: index === arr.length - 1 ? "#ef4444" : HUD_SHADES[index % HUD_SHADES.length]
    }));

  // Calculate needle targeting exactly the center of the danger zone
  let maxCategoryVal = 0;
  pieDataHUD.forEach(d => {
    if (d.value > maxCategoryVal) maxCategoryVal = d.value;
  });
  let accumulated = 0;
  let needleTarget = 0;
  pieDataHUD.forEach(d => {
    if (d.value === maxCategoryVal && needleTarget === 0) {
      needleTarget = accumulated + d.value / 2;
    }
    accumulated += d.value;
  });

  const NeedleComponent = (props: any) => {
    const { width, height, viewBox } = props;
    const w = width || viewBox?.width || 400;
    const h = (height || viewBox?.height || 300);
    const cx = w / 2;
    const cy = h * 0.90; // cy="90%"
    
    // Recharts strictly limits 100% radius to the smaller of width/height divided by 2
    const maxRadius = Math.min(w, h) / 2;
    const iR = maxRadius * 1.0;  // equivalent to innerRadius="100%"
    const oR = maxRadius * 1.80; // equivalent to outerRadius="180%"

    let total = 0;
    pieDataHUD.forEach((v) => {
      total += v.value;
    });
    const RADIAN = Math.PI / 180;
    const ang = 180.0 * (1 - needleTarget / total);
    const length = (iR + 2 * oR) / 3;
    const sin = Math.sin(-RADIAN * ang);
    const cos = Math.cos(-RADIAN * ang);
    const r = 6;
    const xba = cx + r * sin;
    const yba = cy - r * cos;
    const xbb = cx - r * sin;
    const ybb = cy + r * cos;
    const xp = cx + length * cos;
    const yp = cy + length * sin;

    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="#00ccff" strokeWidth={2} />
        <path d={`M${xba} ${yba}L${xbb} ${ybb} L${xp} ${yp} Z`} stroke="none" fill="#00ccff" style={{ filter: "drop-shadow(0px 0px 5px rgba(0, 204, 255, 0.5))" }} />
      </g>
    );
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Speed & Altitude Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time aircraft tracking data showing barometric altitude and ground speed by category
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLiveUpdatesEnabled(!isLiveUpdatesEnabled)}
              className="h-6 px-2 text-[#2CE3D7]/80 hover:text-[#2CE3D7] hover:bg-[#2CE3D7]/10 -ml-2"
            >
              {isLiveUpdatesEnabled ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
              {isLiveUpdatesEnabled ? "Pause" : "Resume"}
            </Button>
            {isLiveUpdatesEnabled ? (
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2CE3D7] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2CE3D7]"></span>
              </span>
            ) : (
              <span className="flex h-2 w-2 mr-1 rounded-full bg-muted-foreground/50"></span>
            )}
            <p className={`text-sm ${isLiveUpdatesEnabled ? 'text-[#2CE3D7]/80' : 'text-muted-foreground/80'}`}>
              {isLiveUpdatesEnabled ? "Live updates" : "Updates paused"} • Last active at {lastUpdated ? lastUpdated.toLocaleTimeString() : "..."}
            </p>
          </div>
        </div>

      </div>



      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-4">
        <GaugeCard title="Total Aircraft" value={totalAircraft.toLocaleString()} description="Unique aircraft tracked" icon={Plane} lastUpdated={lastUpdated} />
        <GaugeCard title="Total Records" value={totalRecords.toLocaleString()} description="Data points collected" icon={Activity} lastUpdated={lastUpdated} />
        <GaugeCard title="Avg Altitude" value={`${avgAltitude.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft`} description="Barometric altitude" icon={TrendingUp} lastUpdated={lastUpdated} />
        <GaugeCard title="Avg Speed" value={`${avgSpeed.toLocaleString(undefined, { maximumFractionDigits: 0 })} kts`} description="Ground speed" icon={TrendingDown} lastUpdated={lastUpdated} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Altitude by Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Average Altitude by Aircraft Category</CardTitle>
            <CardDescription>
              Barometric altitude (feet) - company standard definition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1B4C48" vertical={false} />
                <XAxis dataKey="aircraft_category" tick={{fill: '#E9E9E9', fontSize: 11}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#E9E9E9', fontSize: 11}} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="avg_barometric_altitude"
                  fill="var(--color-altitude)"
                  name="Avg Altitude (ft)"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Speed by Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Average Speed by Aircraft Category</CardTitle>
            <CardDescription>
              Ground speed (knots) - note: company standard specifies air speed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1B4C48" vertical={false} />
                <XAxis dataKey="aircraft_category" tick={{fill: '#E9E9E9', fontSize: 11}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#E9E9E9', fontSize: 11}} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="avg_ground_speed"
                  fill="var(--color-speed)"
                  name="Avg Speed (kts)"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Speed vs Altitude Scatter Plot */}
        <Card>
          <CardHeader>
            <CardTitle>Speed vs Altitude Correlation</CardTitle>
            <CardDescription>
              Relationship between average speed and altitude by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ScatterChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1B4C48" vertical={false} />
                <XAxis
                  dataKey="altitude"
                  name="Altitude (ft)"
                  type="number"
                  tick={{fill: '#E9E9E9', fontSize: 11}}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="speed"
                  name="Speed (kts)"
                  type="number"
                  tick={{fill: '#E9E9E9', fontSize: 11}}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Scatter
                  dataKey="speed"
                  fill="var(--color-altitude)"
                  name="Speed vs Altitude"
                />
              </ScatterChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Aircraft Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Aircraft Distribution by Category</CardTitle>
            <CardDescription>
              Number of unique aircraft per category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-[2/1] w-full pb-0 [&_.recharts-pie]:translate-y-4">
              <PieChart>
                <Pie
                  data={pieDataHUD}
                  cx="50%"
                  cy="90%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="100%"
                  outerRadius="180%"
                  dataKey="value"
                  nameKey="name"
                  stroke="#1e293b"
                  strokeWidth={3}
                  paddingAngle={0}
                  minAngle={3}
                >
                  {pieDataHUD.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Customized component={NeedleComponent} />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value, name, item) => (
                        <>
                          <div
                            className="h-3 w-3 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: item.payload.fill }}
                          />
                          <div className="flex flex-1 justify-between leading-none items-center">
                            <span className="text-muted-foreground mr-4">
                              {name}
                            </span>
                            <span className="text-foreground font-mono font-medium tabular-nums">
                              {value.toLocaleString()}
                            </span>
                          </div>
                        </>
                      )} 
                    />
                  } 
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Aircraft Statistics</CardTitle>
          <CardDescription>
            Comprehensive view of all aircraft categories and their performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-right p-3">Aircraft Count</th>
                  <th className="text-right p-3">Total Records</th>
                  <th className="text-right p-3">Avg Altitude (ft)</th>
                  <th className="text-right p-3">Altitude Range</th>
                  <th className="text-right p-3">Avg Speed (kts)</th>
                  <th className="text-right p-3">Speed Range</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item) => (
                  <tr key={item.aircraft_category} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <Badge className="bg-[#555555] hover:bg-[#555555]/90 text-white">
                        {item.aircraft_category}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {CATEGORY_DESCRIPTIONS[item.aircraft_category as keyof typeof CATEGORY_DESCRIPTIONS] || "Unknown"}
                    </td>
                    <td className="p-3 text-right">{parseInt(item.unique_aircraft_count).toLocaleString()}</td>
                    <td className="p-3 text-right">{parseInt(item.total_records).toLocaleString()}</td>
                    <td className="p-3 text-right">{item.avg_barometric_altitude.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="p-3 text-right text-sm text-muted-foreground">
                      {item.min_barometric_altitude.toLocaleString()} - {item.max_barometric_altitude.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">{item.avg_ground_speed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="p-3 text-right text-sm text-muted-foreground">
                      {item.min_ground_speed.toLocaleString()} - {item.max_ground_speed.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Floating Chat Button */}
      <Button
        onClick={toggleChat}
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        aria-label="Open chat"
      >
        <MessageSquare className="size-6" />
      </Button>
    </div>
    </div>
  );
} 
