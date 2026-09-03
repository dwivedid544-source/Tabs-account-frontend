import React, { useState, useEffect } from 'react';
import {
    Building2, Users, DollarSign, UserPlus, FileText, Loader2, Plus, Settings, X
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from 'recharts';
import dashboardService from '../../services/dashboardService';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        stats: { totalCompanies: 0, totalRequests: 0, totalRevenue: 0, todaySignups: 0 },
        charts: { growthData: [], revenueData: [] }
    });
    const [announcements, setAnnouncements] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [announcementToDelete, setAnnouncementToDelete] = useState(null);
    const [formData, setFormData] = useState({ title: '', content: '', status: 'Active' });

    useEffect(() => {
        fetchDashboardData();
        fetchAnnouncements();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const res = await dashboardService.getDashboardStats();
            setData(res);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            const res = await dashboardService.getAnnouncements();
            setAnnouncements(res);
        } catch (error) {
            console.error('Error fetching announcements:', error);
        }
    };

    const handleOpenModal = (ann = null) => {
        if (ann) {
            setSelectedAnnouncement(ann);
            setFormData({ title: ann.title, content: ann.content, status: ann.status });
        } else {
            setSelectedAnnouncement(null);
            setFormData({ title: '', content: '', status: 'Active' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedAnnouncement) {
                await dashboardService.updateAnnouncement(selectedAnnouncement.id, formData);
            } else {
                await dashboardService.createAnnouncement(formData);
            }
            fetchAnnouncements();
            setShowModal(false);
        } catch (error) {
            console.error('Error saving announcement:', error);
        }
    };

    const handleDelete = async () => {
        try {
            await dashboardService.deleteAnnouncement(announcementToDelete.id);
            fetchAnnouncements();
            setShowDeleteModal(false);
        } catch (error) {
            console.error('Error deleting announcement:', error);
        }
    };

    const StatsCard = ({ title, value, icon: Icon, color, badge, badgeColor }) => (
        <div className="stat-card">
            <div className="stat-header">
                <div className={`icon-box ${color}`}>
                    <Icon size={24} />
                </div>
                {badge && (
                    <span className={`stat-badge ${badgeColor}`}>
                        {badge}
                    </span>
                )}
            </div>
            <div className="stat-info">
                <span className="stat-label">{title}</span>
                <span className="stat-value">{value}</span>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="stats-grid">
                <StatsCard title="Total Company" value={data.stats.totalCompanies} icon={Building2} color="green" badge="Lifetime" badgeColor="badge-success" />
                <StatsCard title="Total Request" value={data.stats.totalRequests} icon={Users} color="blue" badge="Active" badgeColor="badge-neutral" />
                <StatsCard title="Total Revenue" value={`$${data.stats.totalRevenue.toLocaleString()}`} icon={DollarSign} color="orange" badge="Actual" badgeColor="badge-success" />
                <StatsCard title="New Signups Company" value={data.stats.todaySignups} icon={UserPlus} color="pink" badge="Today" badgeColor="badge-primary" />
            </div>

            <div className="charts-grid">
                <div className="chart-card">
                    <div className="chart-header"><h3 className="chart-title">Company Growth</h3></div>
                    <div className="h-64 w-full" style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.charts.growthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="val" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card">
                    <div className="chart-header"><h3 className="chart-title">Signup Trends</h3></div>
                    <div className="h-64 w-full" style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.charts.growthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="val" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card full-width-chart">
                    <div className="chart-header"><h3 className="chart-title">Revenue Trends (Current Year)</h3></div>
                    <div className="h-64 w-full" style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.charts.revenueData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="val" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Announcements Section */}
            {/* <div className="announcements-section mt-8">
                <div className="section-header flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-800">System Announcements</h3>
                    <button className="add-btn" onClick={() => handleOpenModal()}>
                        <Plus size={18} /> Add New
                    </button>
                </div>
                <div className="announcements-grid">
                    {announcements.map(ann => (
                        <div key={ann.id} className="announcement-card App-bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-lg text-slate-800">{ann.title}</h4>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(ann)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Settings size={16} /></button>
                                    <button onClick={() => { setAnnouncementToDelete(ann); setShowDeleteModal(true); }} className="p-1.5 hover:bg-red-50 rounded text-red-500"><X size={16} /></button>
                                </div>
                            </div>
                            <p className="text-slate-600 mb-4 line-clamp-3">{ann.content}</p>
                            <div className="flex justify-between items-center text-xs text-slate-400">
                                <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                                <span className={`px-2 py-0.5 rounded-full ${ann.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {ann.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div> */}

            {/* Announcement Modal */}
            {/* {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{selectedAnnouncement ? 'Edit Announcement' : 'Add New Announcement'}</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group mb-4">
                                    <label className="block mb-1 font-semibold">Title</label>
                                    <input type="text" className="form-control" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                                </div>
                                <div className="form-group mb-4">
                                    <label className="block mb-1 font-semibold">Content</label>
                                    <textarea className="form-control" rows="4" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} required></textarea>
                                </div>
                                <div className="form-group">
                                    <label className="block mb-1 font-semibold">Status</label>
                                    <select className="form-control" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="Active">Active</option>
                                        <option value="Draft">Draft</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-save">{selectedAnnouncement ? 'Update' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )} */}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content modal-sm">
                        <div className="delete-modal-body p-8 text-center">
                            <h3 className="text-xl font-bold mb-2">Delete Announcement?</h3>
                            <p className="text-slate-500 mb-6">Are you sure you want to remove this notification?</p>
                            <div className="flex justify-center gap-4">
                                <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                                <button className="btn-delete" onClick={handleDelete}>Delete Anyway</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;
