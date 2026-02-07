import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import Header from './Header';

const AppLayout = ({ children, onCopyResults }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-800">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Header */}
      <Header onCopyResults={onCopyResults} />

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-8 pb-24 lg:pb-8">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
};

export default AppLayout;
