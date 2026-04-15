'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-center px-4">
      <h2 className="text-2xl font-semibold text-gray-200">Something went wrong</h2>
      <pre className="mt-4 p-4 bg-gray-900 border border-gray-800 rounded-md text-red-400 text-sm max-w-2xl overflow-auto">
        {error.message || 'An unexpected error occurred'}
      </pre>
      <button
        onClick={reset}
        className="mt-8 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-md transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
