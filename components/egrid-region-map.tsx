"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Image from "next/image"
import { EGRID_REGIONS } from "@/lib/egrid-data" // Import from the separate data file

type EGridRegionMapProps = {
  selectedRegion: string
  onRegionSelect: (region: string) => void
}

export default function EGridRegionMap({ selectedRegion, onRegionSelect }: EGridRegionMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <TooltipProvider>
          <div className="relative w-full h-[300px] bg-white rounded-md overflow-hidden">
            {/* Map image */}
            <div className="relative w-full h-full">
              <Image
                src="/images/egrid-map.png"
                alt="eGRID Subregion Map"
                fill
                style={{ objectFit: "contain" }}
                priority
              />

              {/* Clickable regions */}
              <svg viewBox="0 0 500 500" className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
                {EGRID_REGIONS.map((region) => (
                  <g key={region.id} style={{ pointerEvents: "auto" }}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <circle
                          cx={region.x}
                          cy={region.y}
                          r={selectedRegion === region.id ? 10 : 8}
                          fill={selectedRegion === region.id ? "rgba(31, 41, 55, 0.8)" : "rgba(156, 163, 175, 0.6)"}
                          stroke={
                            selectedRegion === region.id ? "#111827" : hoveredRegion === region.id ? "#4b5563" : "none"
                          }
                          strokeWidth={2}
                          className="cursor-pointer transition-all duration-200 hover:fill-gray-500"
                          onClick={() => onRegionSelect(region.id)}
                          onMouseEnter={() => setHoveredRegion(region.id)}
                          onMouseLeave={() => setHoveredRegion(null)}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div className="text-sm">
                          <p className="font-semibold">{region.name}</p>
                          <p className="text-xs text-gray-500">Region Code: {region.id}</p>
                          <p className="text-xs">CO₂ Rate: {region.co2Rate} kg/kWh</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </g>
                ))}
              </svg>
            </div>

            {/* Legend */}
            <div className="absolute bottom-2 left-2 bg-white p-2 rounded-md shadow-sm text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-gray-400 mr-1"></div>
                <span>Clickable Region</span>
              </div>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 rounded-full bg-gray-800 mr-1"></div>
                <span>Selected: {selectedRegion}</span>
              </div>
            </div>
          </div>
        </TooltipProvider>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="text-sm">
            <span className="font-medium">Selected Region:</span>{" "}
            {EGRID_REGIONS.find((r) => r.id === selectedRegion)?.name || selectedRegion}
          </div>
          <div className="text-sm text-right">
            <span className="font-medium">CO₂ Rate:</span>{" "}
            {EGRID_REGIONS.find((r) => r.id === selectedRegion)?.co2Rate.toFixed(3) || "N/A"} kg/kWh
          </div>
        </div>
      </CardContent>
    </Card>
  )
}