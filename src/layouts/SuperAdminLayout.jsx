import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';
import Navbar from '../components/Navbar/Navbar';
import Loader from '../components/common/Loader';
import { loaderService } from '../services/loaderService';
import './SuperAdminLayout.css';

const SuperAdminLayout = () => {
    // Initialize sidebar state based on screen width
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 991);
    const { currentUser } = useContext(AuthContext);
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
        // Initial load for 1s on each major layout hit
        const timer = setTimeout(() => setIsLoading(false), 1000);

        // Subscribe to loaderService
        const unsubscribe = loaderService.subscribe((loading) => {
            setIsLoading(loading);
        });

        return () => {
            clearTimeout(timer);
            unsubscribe();
        };
    }, [location.pathname]);

    const navigate = useNavigate();

    // Redirect users to their respective dashboards if they hit the wrong one
    React.useEffect(() => {
        if (!currentUser) return;

        const role = currentUser.role?.toUpperCase().trim();
        const isAdmin = role === 'COMPANY' || role === 'ADMIN';
        const isSuperAdmin = role === 'SUPERADMIN';

        if (!isSuperAdmin) {
            if (!isAdmin && location.pathname === '/company/dashboard') {
                navigate('/user/dashboard');
            } else if (isAdmin && location.pathname === '/user/dashboard') {
                navigate('/company/dashboard');
            }
        }
    }, [location.pathname, currentUser, navigate]);

    // Close sidebar on route change for mobile
    React.useEffect(() => {
        if (window.innerWidth <= 991) {
            setIsSidebarOpen(false);
        }
    }, [location]);

    // Handle screen resize
    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 991) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Mapping backend roles to Sidebar keys
    // Backend: SUPERADMIN -> 'superadmin' menu
    // All others (ADMIN, COMPANY, Custom) -> 'company' menu
    let userRole = 'company'; // Default

    if (currentUser?.role?.toUpperCase() === 'SUPERADMIN') {
        userRole = 'superadmin';
    } else {
        // All other roles (ADMIN, COMPANY, USER, Custom Roles) use the Company Menu structure
        // The Sidebar component will filter specific items based on 'permissions'
        userRole = 'company';
    }

    return (
        <div className="layout-container"
            style={{
                '--loader-left': isSidebarOpen ? '260px' : '80px',
                '--loader-top': '70px'
            }}>
            {/* Mobile Overlay Backdrop */}
            {isSidebarOpen && (
                <div
                    className="sidebar-overlay d-lg-none"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <Sidebar
                isOpen={isSidebarOpen}
                role={userRole}
                permissions={currentUser?.permissions || []}
                planModules={currentUser?.planModules || []}
                isAdmin={currentUser?.role?.toUpperCase() === 'COMPANY' || currentUser?.role?.toUpperCase() === 'ADMIN'}
                onClose={() => setIsSidebarOpen(false)}
            />
            <div className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="page-content">
                    <Loader show={isLoading} />
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default SuperAdminLayout;
