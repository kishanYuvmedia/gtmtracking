export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700">
      <div className="text-center text-white max-w-2xl mx-auto px-4">
        <h1 className="text-5xl font-bold mb-4">GTM Tracking Platform</h1>
        <p className="text-xl text-primary-200 mb-8">
          Server-Side Tracking & Conversion Routing Platform
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-8 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-primary-50 transition"
          >
            Sign In
          </a>
          <a
            href="/register"
            className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition"
          >
            Get Started
          </a>
        </div>
      </div>
    </main>
  );
}
