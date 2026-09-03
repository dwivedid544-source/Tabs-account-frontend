import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import './Login.css';
import logo from '../../assets/tab-accounts-logo.png';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);
    const [loading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await login(formData.email, formData.password);
            toast.success('Login Successful!');

            const userData = response.user;
            console.log("Logged in user data:", userData);

            const role = userData.role?.toUpperCase().trim();
            console.log("Logged in user role (processed):", role);

            if (role === 'SUPERADMIN') {
                navigate('/superadmin/dashboard');
            } else if (role === 'USER' || role === 'USERS' || role === 'EMPLOYEE' || role === 'STAFF') {
                navigate('/user/dashboard');
            } else if (role === 'COMPANY' || role === 'ADMIN') {
                navigate('/company/dashboard');
            } else {
                // For any other custom roles, check if they should be treated as user or company
                // Defaulting to user dashboard for non-standard roles to be safe, 
                // or you can stay with company/dashboard if that's the preferred fallback.
                navigate('/user/dashboard');
            }
        } catch (error) {
            console.error(error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Invalid email or password';
            toast.error(errorMessage);
        }
    };

    return (
        <div className="login-container">
            <div className="login-wrapper">

                {/* LEFT SIDE – LOGIN */}
                <div className="login-card">
                    <div className="login-header">
                        <img src={logo} alt="TAB ACCOUNTS Logo" className="login-logo-img" style={{ maxWidth: '220px', marginBottom: '1rem' }} />
                        <p className="login-subtext">
                            Welcome back! Please sign in to continue.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <div className="input-wrapper">
                                <Mail className="input-icon" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    placeholder="yours@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type="password"
                                    name="password"
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-footer">
                            <label className="remember">
                                <input type="checkbox" />
                                Remember me
                            </label>
                            <a href="#" className="forgot-password">Forgot Password?</a>
                        </div>

                        <button type="submit" className="login-btn">
                            {loading ? 'Signing In...' : 'Sign In'}
                            {!loading && <ArrowRight size={18} />}
                        </button>

                        <button 
                            type="button" 
                            className="login-website-btn"
                            onClick={() => navigate('/')}
                        >
                            <Globe size={18} />
                            Go to Website
                        </button>
                    </form>
                </div>

                {/* RIGHT SIDE – BRANDING */}
                <div className="brand-card">
                    <img
                        // src="https://zirak-book.netlify.app/assets/account-D0hzE4k5.jpg"
                        src="https://i.ibb.co/PvMV0BpB/image.png"
                        alt="Accounting"
                        className="brand-image"
                        style={{ maxWidth: '250px' }}
                    />
                    <h2 className="mt-4">Smart Accounting Solutions</h2>
                    <p>Track, manage, and grow your business with precision.</p>
                </div>

            </div>
        </div>
    );
};

export default Login;