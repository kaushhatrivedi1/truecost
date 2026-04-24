import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trace AI Layer — Dashboard',
  description: 'Personal and team analytics for AI prompt environmental impact.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
          <span className="font-semibold text-lg">🌿 Trace AI Layer</span>
          <a href="/" className="text-sm text-gray-600 hover:text-gray-900">
            Personal
          </a>
          <a href="/team" className="text-sm text-gray-600 hover:text-gray-900">
            Team
          </a>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
