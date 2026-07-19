export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
      <div className="container mx-auto px-4 max-w-6xl text-center text-sm text-gray-500">
        <p>&copy; {year} IrMeetingApp. Built with React, Express &amp; SQLite.</p>
      </div>
    </footer>
  );
}
