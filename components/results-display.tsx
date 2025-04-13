"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Battery, Cpu, Clock, MemoryStick, Zap, AlertCircle, History, ChevronDown, Terminal } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EGRID_REGIONS } from "@/lib/egrid-data"

// Update the BenchmarkResults type to include raw_stats
type BenchmarkResults = {
  message: string
  status: string
  logs?: string[] | string
  results: {
    avg_cpu_percent: number
    avg_mem_mib: number
    avg_power_watt: number
    energy_kwh: number
    exit_code: number
    peak_mem_mib: number
    power_assumptions_used: {
      baseline_container_watt: number
      cpu_per_core_watt: number
      notes: string
      ram_per_gb_watt: number
    }
    runtime_seconds: number
    samples_collected: number
    co2_rate?: number
    regionName?: string
    timestamp?: string
    benchmarkId?: string
    formData?: {
      repoUrl: string
      entrypoint: string
      cpuWatt: number
      ramWatt: number
      baselineWatt: number
      notes: string
      eGridRegion: string
      co2Rate: number
      cpuModel?: string
    }
    logs?: string[] | string
    raw_stats?: Array<{
      time: number
      cpu_perc_str: string
      mem_usage_mib: number
    }>
  }
}

type BenchmarkHistoryItem = {
  id: string
  timestamp: string
  repoUrl: string
  entrypoint: string
  regionName: string
  co2Rate: number
  result: BenchmarkResults
}

// Add the PerformanceChart component inside the ResultsDisplay component, before the return statement
function PerformanceChart({
  rawStats,
}: { rawStats: Array<{ time: number; cpu_perc_str: string; mem_usage_mib: number }> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{ time: number; cpu: number; mem: number } | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !rawStats || rawStats.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set dimensions
    const width = canvas.width
    const height = canvas.height
    const padding = { top: 20, right: 20, bottom: 30, left: 50 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Process data
    const cpuData = rawStats.map((stat) => ({
      time: stat.time,
      value: Number.parseFloat(stat.cpu_perc_str.replace("%", "")),
    }))

    const memData = rawStats.map((stat) => ({
      time: stat.time,
      value: stat.mem_usage_mib,
    }))

    // Normalize time to seconds from start
    const startTime = rawStats[0].time
    const normalizedCpuData = cpuData.map((point) => ({
      time: point.time - startTime,
      value: point.value,
    }))

    const normalizedMemData = memData.map((point) => ({
      time: point.time - startTime,
      value: point.value,
    }))

    // Find min/max values for scaling
    const maxTime = Math.max(...normalizedCpuData.map((d) => d.time))
    const maxCpu = 100 // CPU percentage is always 0-100
    const maxMem = Math.max(...memData.map((d) => d.value)) * 1.1 // Add 10% padding

    // Draw axes
    ctx.strokeStyle = "#ccc"
    ctx.lineWidth = 1

    // X-axis
    ctx.beginPath()
    ctx.moveTo(padding.left, height - padding.bottom)
    ctx.lineTo(width - padding.right, height - padding.bottom)
    ctx.stroke()

    // Y-axis
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, height - padding.bottom)
    ctx.stroke()

    // X-axis labels (time)
    ctx.fillStyle = "#666"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "center"

    const timeStep = Math.ceil(maxTime / 5)
    for (let t = 0; t <= maxTime; t += timeStep) {
      const x = padding.left + (t / maxTime) * chartWidth
      ctx.fillText(`${t.toFixed(0)}s`, x, height - padding.bottom + 15)

      // Grid line
      ctx.strokeStyle = "#eee"
      ctx.beginPath()
      ctx.moveTo(x, height - padding.bottom)
      ctx.lineTo(x, padding.top)
      ctx.stroke()
    }

    // Y-axis labels (CPU - left side)
    ctx.textAlign = "right"
    ctx.fillStyle = "#E11D48" // Red for CPU

    const cpuStep = 20 // 0, 20, 40, 60, 80, 100
    for (let cpu = 0; cpu <= maxCpu; cpu += cpuStep) {
      const y = height - padding.bottom - (cpu / maxCpu) * chartHeight
      ctx.fillText(`${cpu}%`, padding.left - 10, y + 3)
    }

    // Y-axis labels (Memory - right side)
    ctx.textAlign = "left"
    ctx.fillStyle = "#2563EB" // Blue for Memory

    const memStep = maxMem / 5
    for (let mem = 0; mem <= maxMem; mem += memStep) {
      const y = height - padding.bottom - (mem / maxMem) * chartHeight
      ctx.fillText(`${mem.toFixed(1)} MiB`, width - padding.right + 10, y + 3)
    }

    // Draw CPU line
    ctx.strokeStyle = "#E11D48" // Red
    ctx.lineWidth = 2
    ctx.beginPath()

    normalizedCpuData.forEach((point, i) => {
      const x = padding.left + (point.time / maxTime) * chartWidth
      const y = height - padding.bottom - (point.value / maxCpu) * chartHeight

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw Memory line
    ctx.strokeStyle = "#2563EB" // Blue
    ctx.lineWidth = 2
    ctx.beginPath()

    normalizedMemData.forEach((point, i) => {
      const x = padding.left + (point.time / maxTime) * chartWidth
      const y = height - padding.bottom - (point.value / maxMem) * chartHeight

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw data points for CPU
    normalizedCpuData.forEach((point) => {
      const x = padding.left + (point.time / maxTime) * chartWidth
      const y = height - padding.bottom - (point.value / maxCpu) * chartHeight

      ctx.fillStyle = "#E11D48"
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw data points for Memory
    normalizedMemData.forEach((point) => {
      const x = padding.left + (point.time / maxTime) * chartWidth
      const y = height - padding.bottom - (point.value / maxMem) * chartHeight

      ctx.fillStyle = "#2563EB"
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })

    // Add legend
    ctx.fillStyle = "#333"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "left"

    // CPU legend
    ctx.fillStyle = "#E11D48"
    ctx.fillRect(padding.left, padding.top - 15, 12, 12)
    ctx.fillText("CPU Usage", padding.left + 18, padding.top - 5)

    // Memory legend
    ctx.fillStyle = "#2563EB"
    ctx.fillRect(padding.left + 100, padding.top - 15, 12, 12)
    ctx.fillText("Memory Usage", padding.left + 118, padding.top - 5)

    // Add hover functionality
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left

      // Find closest data point
      let closestPoint = null
      let minDistance = Number.POSITIVE_INFINITY

      normalizedCpuData.forEach((point, index) => {
        const x = padding.left + (point.time / maxTime) * chartWidth
        const distance = Math.abs(mouseX - x)

        if (distance < minDistance) {
          minDistance = distance
          closestPoint = {
            time: point.time,
            cpu: point.value,
            mem: normalizedMemData[index].value,
          }
        }
      })

      if (minDistance < 20 && closestPoint) {
        setHoveredPoint(closestPoint)
      } else {
        setHoveredPoint(null)
      }
    }

    canvas.addEventListener("mousemove", handleMouseMove)

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove)
    }
  }, [rawStats])

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={800} height={300} className="w-full h-[300px] bg-white rounded-lg" />
      {hoveredPoint && (
        <div className="absolute bg-white shadow-md rounded-md p-2 text-xs">
          <div>Time: {hoveredPoint.time.toFixed(1)}s</div>
          <div className="text-rose-600">CPU: {hoveredPoint.cpu.toFixed(2)}%</div>
          <div className="text-blue-600">Memory: {hoveredPoint.mem.toFixed(2)} MiB</div>
        </div>
      )}
    </div>
  )
}

export default function ResultsDisplay() {
  const [results, setResults] = useState<BenchmarkResults | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkHistoryItem[]>([])
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string | null>(null)
  const [logContent, setLogContent] = useState<string>("")

  useEffect(() => {
    // Load benchmark history
    const historyString = localStorage.getItem("benchmarkHistory")
    if (historyString) {
      try {
        const history = JSON.parse(historyString)
        setBenchmarkHistory(history)
      } catch (e) {
        console.error("Error parsing benchmark history:", e)
      }
    }

    // Load current benchmark result
    const storedResults = localStorage.getItem("currentBenchmarkResult")
    if (storedResults) {
      try {
        const parsedResults = JSON.parse(storedResults)
        console.log("Loaded results from localStorage:", parsedResults)
        setResults(parsedResults)

        if (parsedResults.results?.benchmarkId) {
          setSelectedBenchmarkId(parsedResults.results.benchmarkId)
        }

        // Process logs - handle both array and string formats
        processLogs(parsedResults)
      } catch (e) {
        console.error("Error parsing stored results:", e)
      }
    }
  }, [])

  // Process logs from various possible locations in the result object
  const processLogs = (resultObj: any) => {
    let logsFound = false
    let logsContent = ""

    // Check for logs at the top level
    if (resultObj.logs) {
      logsFound = true
      if (Array.isArray(resultObj.logs)) {
        logsContent = resultObj.logs.join("\n")
      } else {
        logsContent = String(resultObj.logs)
      }
      console.log("Found logs at top level:", logsContent)
    }
    // Check for logs in the results object
    else if (resultObj.results?.logs) {
      logsFound = true
      if (Array.isArray(resultObj.results.logs)) {
        logsContent = resultObj.results.logs.join("\n")
      } else {
        logsContent = String(resultObj.results.logs)
      }
      console.log("Found logs in results object:", logsContent)
    }
    // Check for output property
    else if (resultObj.output) {
      logsFound = true
      logsContent = String(resultObj.output)
      console.log("Found output property:", logsContent)
    }
    // Check for console property
    else if (resultObj.console) {
      logsFound = true
      logsContent = String(resultObj.console)
      console.log("Found console property:", logsContent)
    }

    if (!logsFound) {
      console.log("No logs found in result object:", resultObj)
      setLogContent("")
    } else {
      setLogContent(logsContent)
    }
  }

  // Load a specific benchmark from history
  const loadBenchmark = (benchmarkId: string) => {
    const benchmark = benchmarkHistory.find((item) => item.id === benchmarkId)
    if (benchmark) {
      setResults(benchmark.result)
      setSelectedBenchmarkId(benchmarkId)
      localStorage.setItem("currentBenchmarkResult", JSON.stringify(benchmark.result))

      // Process logs from the loaded benchmark
      processLogs(benchmark.result)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  if (!results) {
    return (
      <Card className="shadow-md h-full">
        <CardContent className="pt-6 flex flex-col items-center justify-center h-full min-h-[400px]">
          <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Results Yet</h3>
          <p className="text-gray-500 text-center">Submit your code using the form to see benchmark results here.</p>
        </CardContent>
      </Card>
    )
  }

  const { results: benchmarkData } = results

  // Calculate carbon footprint using the provided CO2 rate if available
  const co2Rate = benchmarkData.co2_rate || 0.5 // Use provided rate or default to 0.5 kg/kWh
  const carbonFootprint = benchmarkData.energy_kwh * co2Rate // in kg CO2

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 text-green-600 mr-2" />
            Benchmark Results
            <span className="ml-3 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
              {results.status === "success" ? "Success" : "Failed"}
            </span>
          </CardTitle>

          {benchmarkHistory.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center">
                  <History className="h-4 w-4 mr-1" />
                  History
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[300px]">
                {benchmarkHistory.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    className={`flex flex-col items-start py-2 ${selectedBenchmarkId === item.id ? "bg-gray-100" : ""}`}
                    onClick={() => loadBenchmark(item.id)}
                  >
                    <div className="font-medium">{item.repoUrl.split("/").pop()}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(item.timestamp)} • {item.entrypoint}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {benchmarkData.timestamp && (
          <div className="text-sm text-gray-500 mt-1">Benchmark run on {formatDate(benchmarkData.timestamp)}</div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="energy">Energy</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Clock className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-500">Runtime</span>
                </div>
                <div className="text-2xl font-bold">{benchmarkData.runtime_seconds.toFixed(1)}s</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Zap className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-500">Energy Used</span>
                </div>
                <div className="text-2xl font-bold">{(benchmarkData.energy_kwh * 1000000).toFixed(2)} μWh</div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Repository Details</h3>
              <div className="text-sm text-gray-600">
                <p>
                  <span className="font-medium">Repo:</span> {benchmarkData.formData?.repoUrl || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Entrypoint:</span> {benchmarkData.formData?.entrypoint || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Region:</span> {benchmarkData.regionName || "N/A"}
                </p>
                {benchmarkData.formData?.cpuModel && (
                  <p>
                    <span className="font-medium">CPU Model:</span> {benchmarkData.formData.cpuModel}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Samples Collected: {benchmarkData.samples_collected}</h3>
              <p className="text-sm text-gray-500">{results.message}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium flex items-center">
                  <Terminal className="h-4 w-4 mr-1" /> Logs
                </h3>
                <button
                  onClick={() => {
                    console.log("Current results:", results)
                    console.log("Log content:", logContent)
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Debug
                </button>
              </div>
              <div className="bg-black text-green-400 p-3 rounded font-mono text-xs h-[200px] overflow-y-auto">
                {logContent ? (
                  <pre className="whitespace-pre-wrap">{logContent}</pre>
                ) : (
                  <div className="text-gray-500">No logs available</div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {benchmarkData.raw_stats && benchmarkData.raw_stats.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-3">Resource Usage Over Time</h3>
                <PerformanceChart rawStats={benchmarkData.raw_stats} />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium flex items-center">
                    <Cpu className="h-4 w-4 mr-1" /> CPU Usage
                  </span>
                  <span className="text-sm font-medium">{benchmarkData.avg_cpu_percent.toFixed(1)}%</span>
                </div>
                <Progress value={benchmarkData.avg_cpu_percent} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium flex items-center">
                    <MemoryStick className="h-4 w-4 mr-1" /> Memory (Average)
                  </span>
                  <span className="text-sm font-medium">{benchmarkData.avg_mem_mib.toFixed(2)} MiB</span>
                </div>
                <Progress value={(benchmarkData.avg_mem_mib / benchmarkData.peak_mem_mib) * 100} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium flex items-center">
                    <MemoryStick className="h-4 w-4 mr-1" /> Memory (Peak)
                  </span>
                  <span className="text-sm font-medium">{benchmarkData.peak_mem_mib.toFixed(2)} MiB</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
            </div>

            {benchmarkData.raw_stats && benchmarkData.raw_stats.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-3">Raw Measurement Data</h3>
                <div className="max-h-[200px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="text-xs text-gray-700 sticky top-0 bg-gray-50">
                      <tr>
                        <th className="text-left py-2">Time (s)</th>
                        <th className="text-left py-2">CPU Usage</th>
                        <th className="text-right py-2">Memory (MiB)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarkData.raw_stats.map((stat, index) => {
                        // Calculate seconds from start
                        const startTime = benchmarkData.raw_stats[0].time
                        const relativeTime = (stat.time - startTime).toFixed(1)

                        return (
                          <tr key={index} className="border-t border-gray-200">
                            <td className="py-1">{relativeTime}s</td>
                            <td className="py-1">{stat.cpu_perc_str}</td>
                            <td className="py-1 text-right">{stat.mem_usage_mib.toFixed(3)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="energy" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Battery className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-500">Average Power</span>
                </div>
                <div className="text-2xl font-bold">{benchmarkData.avg_power_watt.toFixed(3)} W</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Zap className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-500">Total Energy</span>
                </div>
                <div className="text-2xl font-bold">{(benchmarkData.energy_kwh * 1000000).toFixed(2)} μWh</div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Carbon Footprint</h3>
              <div className="text-2xl font-bold">{(carbonFootprint * 1000000).toFixed(2)} μg CO₂</div>
              <p className="text-xs text-gray-500 mt-1">
                Based on {benchmarkData.regionName ? benchmarkData.regionName : "selected"} region carbon intensity (
                {co2Rate.toFixed(3)} kg/kWh)
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Power Assumptions Used</h3>
              <ul className="text-sm space-y-1">
                <li>CPU per core: {benchmarkData.power_assumptions_used.cpu_per_core_watt} W</li>
                <li>RAM per GB: {benchmarkData.power_assumptions_used.ram_per_gb_watt} W</li>
                <li>Baseline: {benchmarkData.power_assumptions_used.baseline_container_watt} W</li>
                <li>CO₂ Rate: {co2Rate.toFixed(3)} kg/kWh</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2">{benchmarkData.power_assumptions_used.notes}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-3">eGrid Region Carbon Intensity Ranking</h3>
              <div className="max-h-[200px] overflow-y-auto pr-2">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-700 sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left py-2">Rank</th>
                      <th className="text-left py-2">Region</th>
                      <th className="text-right py-2">CO₂ Rate (kg/kWh)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...EGRID_REGIONS]
                      .sort((a, b) => a.co2Rate - b.co2Rate)
                      .map((region, index) => (
                        <tr
                          key={region.id}
                          className={`border-t border-gray-200 ${region.id === benchmarkData.formData?.eGridRegion ? "bg-green-50" : ""}`}
                        >
                          <td className="py-2">{index + 1}</td>
                          <td className="py-2">
                            {region.name}
                            <span className="text-xs text-gray-500 ml-1">({region.id})</span>
                          </td>
                          <td className="text-right py-2">
                            {region.co2Rate.toFixed(3)}
                            {region.id === benchmarkData.formData?.eGridRegion && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Choosing a region with lower carbon intensity can significantly reduce your application's environmental
                impact.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
