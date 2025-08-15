// Simple test page to debug the blank screen
export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🎉 Content Engine Test
        </h1>
        <p className="text-gray-600 mb-4">
          If you can see this, React is working correctly!
        </p>
        <div className="space-y-2">
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm">
            ✅ React Components Working
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
            ✅ Tailwind CSS Working
          </div>
          <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded text-sm">
            ✅ TypeScript Working
          </div>
        </div>
        <button 
          onClick={() => alert('Button click working!')}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Test Button
        </button>
      </div>
    </div>
  );
}