"use client";

import Link from "next/link";

export function ClientHeader() {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/trips" className="text-xl font-bold text-gray-900 dark:text-white">
              Memories
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/logout"
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
