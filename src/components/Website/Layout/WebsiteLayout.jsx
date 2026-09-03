import React from 'react';
import Navbar from './Navbarwebsite';
import Footer from './Footer';
import ScrollToTop from './ScrollToTop';
import { Outlet } from 'react-router-dom';

const WebsiteLayout = () => {
    return (
        <div className="website-layout">
            <ScrollToTop />
            <Navbar />
            <main>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default WebsiteLayout;
