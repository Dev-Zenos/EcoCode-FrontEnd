"use client"

import type React from "react"

import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Cpu, MemoryStick, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { InfoIcon } from "lucide-react"
import EGridRegionMap from "@/components/egrid-region-map"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { EGRID_REGIONS } from "@/lib/egrid-data"
import { CPU_MODELS } from "@/lib/cpu-data"

export default function BenchmarkForm() {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStage, setLoadingStage] = useState("")
  const [selectedCpuModel, setSelectedCpuModel] = useState<string>("custom")

  // Find the default region (CAMX) to get its CO2 rate
  const defaultRegion = EGRID_REGIONS.find((r) => r.id === "CAMX") || EGRID_REGIONS[0]

  const [formData, setFormData] = useState({
    repoUrl: "",
    entrypoint: "",
    cpuWatt: 2.5,
    ramWatt: 0.15,
    baselineWatt: 0.3,
    timeout: 60, // Default timeout of 60 seconds
    notes: "Rough estimates for M1 MacBook Air - ADJUST FOR YOUR HARDWARE",
    eGridRegion: defaultRegion.id,
    co2Rate: defaultRegion.co2Rate,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Simulate loading stages for a better user experience
  const simulateLoadingStages = () => {
    const stages = [
      { progress: 10, message: "Cloning repository..." },
      { progress: 25, message: "Setting up environment..." },
      { progress: 40, message: "Preparing benchmark..." },
      { progress: 60, message: "Running code..." },
      { progress: 80, message: "Collecting metrics..." },
      { progress: 90, message: "Calculating results..." },
    ]

    let currentStage = 0
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setLoadingProgress(stages[currentStage].progress)
        setLoadingStage(stages[currentStage].message)
        currentStage++
      } else {
        clearInterval(interval)
      }
    }, 1500)

    return () => clearInterval(interval)
  }
  const handleCpuModelChange = (value: string) => {
    setSelectedCpuModel(value)

    if (value === "custom") {
      return
    }

    const selectedCpu = CPU_MODELS.find((cpu) => cpu.model === value)
    if (selectedCpu) {
      setFormData((prev) => ({
        ...prev,
        cpuWatt: selectedCpu.watts,
        notes: prev.notes.includes("ADJUST FOR YOUR HARDWARE")
          ? `Using ${selectedCpu.model} (${selectedCpu.watts}W) - Adjust other values as needed`
          : prev.notes,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoadingProgress(0)
    setLoadingStage("Initializing...")

    const clearLoadingAnimation = simulateLoadingStages()

    let success = false

    try {
      const res = await fetch("http://127.0.0.1:1234/upload_data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            user_code_dir_relative: "../test/code",
            code_entrypoint: formData.entrypoint,
            power_assumptions: {
              notes: formData.notes,
              cpu_per_core_watt: Number.parseFloat(formData.cpuWatt.toString()),
              ram_per_gb_watt: Number.parseFloat(formData.ramWatt.toString()),
              baseline_container_watt: Number.parseFloat(formData.baselineWatt.toString()),
            },
            repo_url: formData.repoUrl,
            co2_rate: formData.co2Rate,
            container_wait_timeout: Number.parseInt(formData.timeout.toString()), // Add the timeout value
          },
        }),
      })

      if (!res.ok) {
        const errorBody = "Unknown error"
        toast({
          title: "Error",
          description: "Failed to submit the benchmark. Please try again.",
        })
      }

      const data = await res.json()
      console.log("Response data:", data)
      console.log("Logs in response:", data.logs)

      const regionInfo = EGRID_REGIONS.find((r) => r.id === formData.eGridRegion)
      const timestamp = new Date().toISOString()
      const benchmarkId = `benchmark_${Date.now()}`

      const enhancedData = {
        ...data,
        results: {
          ...(data.results || {}),
          regionName: regionInfo?.name || "Unknown Region",
          timestamp: timestamp,
          benchmarkId: benchmarkId,
          formData: { ...formData, cpuModel: selectedCpuModel !== "custom" ? selectedCpuModel : "Custom" },
        },
        logs: data.results.logs || [], // Explicitly capture logs from the API response
        raw_stats: data.raw_stats || {}, // Capture raw stats if available
      }

      // --- LocalStorage Operations ---
      localStorage.setItem("currentBenchmarkResult", JSON.stringify(enhancedData))

      const historyString = localStorage.getItem("benchmarkHistory") || "[]"
      let history = []
      try {
        history = JSON.parse(historyString)
        if (!Array.isArray(history)) history = [] // Ensure it's an array
      } catch (e) {
        console.error("Failed to parse benchmark history, resetting.", e)
        history = []
      }

      history.push({
        id: benchmarkId,
        timestamp: timestamp,
        repoUrl: formData.repoUrl,
        entrypoint: formData.entrypoint,
        regionName: regionInfo?.name || "Unknown Region",
        co2Rate: formData.co2Rate,
        result: enhancedData, // Store the full result within history item
      })

      const trimmedHistory = history.slice(-10)
      localStorage.setItem("benchmarkHistory", JSON.stringify(trimmedHistory))
      // --- End LocalStorage ---

      console.log("Data stored in localStorage.")

      setLoadingProgress(100)
      setLoadingStage("Benchmark completed!")
      success = true // Mark as success

      // Dispatch event AFTER saving to localStorage
      window.dispatchEvent(new Event("benchmarkUpdated"))
      console.log("Dispatched benchmarkUpdated event.")

      toast({
        title: "Benchmark completed!",
        description: "Your code has been analyzed successfully.",
      })

      // Refresh the page OR navigate after a short delay
      // Choose ONE of the following:
      // Option 1: Refresh current page (requires display component to listen/reload)
      setTimeout(() => {
        console.log("Refreshing router...")
        window.location.reload()
      }, 1000)

      // Option 2: Navigate to a results page (simpler if possible)
      // setTimeout(() => {
      //   router.push('/results'); // Example path
      // }, 1000);
    } catch (error) {
      console.error("Error submitting benchmark:", error)
      setLoadingProgress(0) // Reset progress on error
      setLoadingStage("") // Clear stage message

      toast({
        title: "Benchmark failed",
        // Provide more detail if possible from the error object
        description: error instanceof Error ? error.message : "There was an error processing your request.",
        variant: "destructive",
      })
    } finally {
      // Always clear the interval
      clearLoadingAnimation()

      // Only set isLoading to false *after* potential navigation/refresh delay
      // Use the success flag to determine if we wait or stop immediately
      const delay = success ? 1100 : 100 // Wait slightly longer than refresh timeout if successful
      setTimeout(() => {
        setIsLoading(false)
      }, delay)
    }
  }

  // Handle region selection and update both region ID and CO2 rate
  const handleRegionSelect = (regionId: string) => {
    const selectedRegion = EGRID_REGIONS.find((r) => r.id === regionId)
    if (selectedRegion) {
      setFormData((prev) => ({
        ...prev,
        eGridRegion: regionId, // Keep for UI purposes
        co2Rate: selectedRegion.co2Rate, // This is what we'll send to the backend
      }))
    }
  }

  return (
    <TooltipProvider>
      <Card className="shadow-md">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <h3 className="text-xl font-medium text-gray-800 mb-2">Running Benchmark</h3>
                <p className="text-gray-600 mb-6">{loadingStage}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress</span>
                  <span>{loadingProgress}%</span>
                </div>
                <Progress value={loadingProgress} className="h-2" />
              </div>

              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg animate-pulse">
                  <Cpu className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Analyzing CPU</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg animate-pulse">
                  <MemoryStick className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Measuring Memory</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg animate-pulse">
                  <Zap className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Calculating Energy</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center mt-6">
                This may take a few minutes depending on the complexity of your code
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="repoUrl">GitHub Repository URL</Label>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 ml-2 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Enter the full URL to your GitHub repository (e.g., https://github.com/username/repo)
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="repoUrl"
                  name="repoUrl"
                  placeholder="https://github.com/username/repo"
                  value={formData.repoUrl}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="entrypoint">Code Entrypoint</Label>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 ml-2 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      The main file that should be executed (e.g., main.py, index.js)
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="entrypoint"
                  name="entrypoint"
                  placeholder="main.py"
                  value={formData.entrypoint}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <Label>Server Location (eGrid Region)</Label>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 ml-2 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Select the US eGrid region where your server is located to calculate more accurate carbon
                      emissions
                    </TooltipContent>
                  </Tooltip>
                </div>
                <EGridRegionMap selectedRegion={formData.eGridRegion} onRegionSelect={handleRegionSelect} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="cpuModel">CPU Model</Label>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <InfoIcon className="h-4 w-4 ml-2 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Select your CPU model to automatically set power consumption, or choose "Custom" to enter
                        manually
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={selectedCpuModel} onValueChange={handleCpuModelChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select CPU model" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="custom">Custom</SelectItem>
                      {CPU_MODELS.map((cpu) => (
                        <SelectItem key={cpu.model} value={cpu.model}>
                          {cpu.model} ({cpu.watts}W)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="cpuWatt">CPU Watt per Core</Label>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <InfoIcon className="h-4 w-4 ml-2 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Average power consumption per CPU core in watts
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="cpuWatt"
                    name="cpuWatt"
                    type="number"
                    step="0.1"
                    placeholder="2.5"
                    value={formData.cpuWatt}
                    onChange={(e) => {
                      handleChange(e)
                      setSelectedCpuModel("custom")
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="ramWatt">RAM Watt per GB</Label>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <InfoIcon className="h-4 w-4 ml-2 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Average power consumption per GB of RAM in watts
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="ramWatt"
                    name="ramWatt"
                    type="number"
                    step="0.01"
                    placeholder="0.15"
                    value={formData.ramWatt}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="baselineWatt">Baseline Container Watt</Label>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 ml-2 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Baseline power consumption of the container in watts
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="baselineWatt"
                  name="baselineWatt"
                  type="number"
                  step="0.1"
                  placeholder="0.3"
                  value={formData.baselineWatt}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="timeout">Auto-Timeout (seconds)</Label>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 ml-2 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Maximum execution time in seconds before the benchmark is automatically terminated
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="timeout"
                  name="timeout"
                  type="number"
                  min="1"
                  max="3600"
                  step="1"
                  placeholder="60"
                  value={formData.timeout}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="notes">Hardware Notes</Label>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 ml-2 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Additional information about your hardware specifications
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Describe your hardware specifications"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Start Benchmark
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
