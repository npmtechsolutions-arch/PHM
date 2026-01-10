import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function DashboardLayout() {
    return (
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col h-full overflow-hidden min-w-0">
                {/* Header */}
                <Header />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 scroll-smooth">
                    <div className="page-content animate-fadeIn p-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
