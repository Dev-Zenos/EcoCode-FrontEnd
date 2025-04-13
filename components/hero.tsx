"use client"

import { ArrowRight, Leaf, Zap, BarChart } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Hero() {
  // Function to scroll to the benchmark form
  const scrollToBenchmarkForm = () => {
    const benchmarkFormElement = document.getElementById("benchmark-form")
    if (benchmarkFormElement) {
      benchmarkFormElement.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="bg-gradient-to-b from-green-100 to-green-50 py-16 md:py-24">
      <div className="container mx-auto px-4 text-center">
        <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 text-sm font-medium rounded-full bg-green-100 text-green-800">
          <Leaf className="h-4 w-4 mr-2" />
          <span>Sustainable Code Benchmarking</span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
          Measure Your Code's <span className="text-green-600">Environmental Impact</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Upload your code and get detailed performance metrics and energy consumption data to help you build
          more sustainable applications.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white" onClick={scrollToBenchmarkForm}>
            Start Benchmarking
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="bg-green-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4 mx-auto">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Energy Efficiency</h3>
            <p className="text-gray-600">Measure power consumption and optimize for lower energy usage</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="bg-green-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4 mx-auto">
              <BarChart className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Performance Metrics</h3>
            <p className="text-gray-600">Get detailed CPU, memory, and runtime statistics</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="bg-green-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4 mx-auto">
              <Leaf className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Carbon Footprint</h3>
            <p className="text-gray-600">Understand and reduce your code's environmental impact</p>
          </div>
        </div>
      </div>
    </div>
  )
}
