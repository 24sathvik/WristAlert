import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <Clock className="h-24 w-24 text-text-muted mb-8 opacity-20 animate-pulse" />
      <h1 className="text-4xl font-bold mb-4">404 - Out of Stock</h1>
      <p className="text-text-muted text-lg mb-8 text-center max-w-md">
        Looks like this page sold out faster than a Rolex Daytona. 
        We couldn't find what you were looking for.
      </p>
      <Link to="/dashboard" className="btn-primary py-3 px-8 text-lg font-bold">
        Back to Dashboard
      </Link>
    </div>
  )
}
