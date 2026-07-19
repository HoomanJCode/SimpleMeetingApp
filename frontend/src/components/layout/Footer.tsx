export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-6 mt-auto transition-colors">
      <div className="container mx-auto px-4 max-w-6xl text-center text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {year} IrMeetingApp. Built with React, Express &amp; SQLite.</p>
      </div>
    </footer>
  );
}
