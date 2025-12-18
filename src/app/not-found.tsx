import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-400"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
            <line x1="9" x2="9.01" y1="9" y2="9" />
            <line x1="15" x2="15.01" y1="9" y2="9" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-zinc-300 mb-4">
          Page Not Found
        </h2>
        <p className="text-zinc-400 mb-6 max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or the room has
          expired.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-white text-black font-medium rounded-xl hover:bg-zinc-200 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
