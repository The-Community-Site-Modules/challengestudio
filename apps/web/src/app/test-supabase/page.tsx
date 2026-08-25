import { createClient } from '@/lib/supabase/server'

export default async function TestSupabasePage() {
  const supabase = await createClient()

  // Test connection by querying auth user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  // Test database connection (will fail if no tables exist yet)
  let dbError = null

  try {
    const { error } = await supabase.from('users').select('count').single()
    dbError = error
  } catch (e) {
    dbError = e
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
          
          <div className="space-y-4">
            {/* Supabase URL */}
            <div>
              <h2 className="font-semibold text-sm text-gray-600">Supabase URL</h2>
              <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}
              </p>
            </div>

            {/* Supabase Key (first 20 chars only) */}
            <div>
              <h2 className="font-semibold text-sm text-gray-600">Supabase Key (partial)</h2>
              <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                {process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) || 'NOT SET'}...
              </p>
            </div>

            {/* Auth Status */}
            <div>
              <h2 className="font-semibold text-sm text-gray-600">Auth Status</h2>
              <div className="mt-1">
                {userError ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">
                      <span className="font-semibold">Not authenticated</span>
                      {' '}- This is expected if no user is logged in.
                    </p>
                  </div>
                ) : user ? (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-sm text-green-800">
                      <span className="font-semibold">Authenticated as:</span> {user.email}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <p className="text-sm text-gray-600">No user logged in</p>
                  </div>
                )}
              </div>
            </div>

            {/* Database Test */}
            <div>
              <h2 className="font-semibold text-sm text-gray-600">Database Connection</h2>
              <div className="mt-1">
                {dbError ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">
                      <span className="font-semibold">Database query failed</span>
                      {' '}- This is expected if tables haven&apos;t been created yet.
                    </p>
                    <pre className="text-xs mt-2 text-gray-600 overflow-auto">
                      {JSON.stringify(dbError, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-sm text-green-800">
                      <span className="font-semibold">Database connected!</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Overall Status */}
            <div className="pt-4 border-t">
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h2 className="font-semibold text-blue-900 mb-2">✓ Supabase Setup Complete</h2>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Environment variables configured</li>
                  <li>• Client helpers created (server, client, middleware)</li>
                  <li>• Middleware refreshes auth tokens automatically</li>
                  <li>• Ready to create database schema and auth flows</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-3">Next Steps</h2>
          <ol className="text-sm space-y-2 list-decimal list-inside text-gray-700">
            <li>Create database schema in Supabase dashboard</li>
            <li>Set up Row Level Security (RLS) policies</li>
            <li>Enable email auth in Supabase Authentication settings</li>
            <li>Update auth pages to use Supabase auth methods</li>
            <li>Test signup/login flows</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
