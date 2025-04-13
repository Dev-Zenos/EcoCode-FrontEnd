import Link from "next/link"
import { Leaf } from "lucide-react"

export default function Navbar() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Leaf className="h-6 w-6 text-green-600" />
            <span className="text-xl font-bold text-green-800">EcoCode</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
