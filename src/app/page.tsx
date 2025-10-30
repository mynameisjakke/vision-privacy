export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Vision Privacy API</h1>
        <p className="text-lg text-gray-600 mb-8">
          Centralized privacy and cookie policy management for WordPress sites
        </p>
        <div className="space-y-2">
          <p className="text-sm">
            <strong>API Status:</strong> <span className="text-green-600">Active</span>
          </p>
          <p className="text-sm">
            <strong>Version:</strong> 1.0.0
          </p>
          <p className="text-sm">
            <strong>Health Check:</strong> <a href="/api/health" className="text-blue-600 hover:underline">/api/health</a>
          </p>
        </div>
      </div>
    </main>
  )
}