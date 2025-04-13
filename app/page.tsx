import { Suspense } from "react"
import Hero from "@/components/hero"
import BenchmarkForm from "@/components/benchmark-form"
import ResultsDisplay from "@/components/results-display"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <Toaster />
      <Hero />
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div id="benchmark-form">
            <h2 className="text-2xl font-bold text-green-800 mb-6">Submit Your Code</h2>
            <Suspense fallback={<div className="p-8 border rounded-lg animate-pulse bg-gray-100">Loading form...</div>}>
              <BenchmarkForm />
            </Suspense>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-800 mb-6">Benchmark Results</h2>
            <Suspense
              fallback={<div className="p-8 border rounded-lg animate-pulse bg-gray-100">Loading results...</div>}
            >
              <ResultsDisplay />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  )
}
