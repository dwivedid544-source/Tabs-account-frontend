import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faExclamationCircle,
  faSpinner,
  faPaperPlane,
  faMapMarkerAlt,
  faPhoneAlt,
  faEnvelope,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

const Contact = () => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => {
      const elements = document.querySelectorAll('.animate-on-scroll');
      elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const isInView = rect.top <= window.innerHeight - 100;
        if (isInView) {
          element.classList.add('animate-visible');
        }
      });
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const [formStatus, setFormStatus] = useState('idle');
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setFormStatus('submitting');

    setTimeout(() => {
      setFormStatus('success');
      setFormData({ name: '', email: '', message: '' });

      setTimeout(() => {
        setFormStatus('idle');
      }, 3000);
    }, 1500);
  };

  return (
    <div className="d-flex flex-column min-vh-100">

      {/* Header */}
      <header className="py-5 text-white position-relative" style={{
        background: 'linear-gradient(to right, var(--primary), var(--primary-hover))',
        overflow: 'hidden'
      }}>
        <div className="container">
          <div className="row align-items-center g-4">
            {/* Text Section (Left) */}
            <div className="col-lg-6 mb-4 mb-lg-0 text-center text-lg-start">
              <h1
                className={`display-4 fw-bold mb-3 animate-on-scroll ${isVisible ? "animate-visible" : ""}`}
                style={{ animationDelay: "0.2s" }}
              >
                Award Winning Customer Support
              </h1>
              <p
                className={`lead animate-on-scroll ${isVisible ? "animate-visible" : ""}`}
                style={{
                  animationDelay: "0.4s",
                  maxWidth: "600px",
                  lineHeight: '1.7'
                }}
              >
                All our customers get unbiased unconditional love forever with no
                limitations. Help is free and you'll directly be connected to a real,
                live human. We promise to reply to your query within 24 working hours.
              </p>
            </div>

            {/* Image Section (Right) */}
            <div className="col-lg-6 text-center">
              <img
                src="https://i.ibb.co/PHRBLCp/image-removebg-preview-8.png"
                alt="Customer Support"
                className="img-fluid animate-on-scroll"
                style={{ maxHeight: "350px", objectFit: "contain", animationDelay: "0.6s" }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-3 p-md-5 flex-grow-1">
        <div className="row justify-content-center g-4">
          {/* Contact Form */}
          <div className="col-lg-6">
            <div className="App-bg-white rounded-4 shadow-lg p-4 p-md-5 h-100 animate-on-scroll"
              style={{ borderTop: '5px solid #475569', transition: 'transform 0.3s ease' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <h2 className="h2 fw-bold mb-4 text-center text-md-start" style={{ color: '#475569' }}>
                Have a Query? Let Us Know
              </h2>

              {formStatus === 'success' && (
                <div className="alert alert-success d-flex align-items-center mb-4 animate-on-scroll">
                  <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                  <span>Thank you! Your message has been sent successfully.</span>
                </div>
              )}

              {formStatus === 'error' && (
                <div className="alert alert-danger d-flex align-items-center mb-4 animate-on-scroll">
                  <FontAwesomeIcon icon={faExclamationCircle} className="me-2" />
                  <span>Something went wrong. Please try again later.</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="name" className="form-label fw-medium">
                    Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`form-control form-control-lg ${errors.name ? 'is-invalid' : ''}`}
                    placeholder="Your name"
                    style={{ borderRadius: '12px' }}
                  />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>

                <div className="mb-4">
                  <label htmlFor="email" className="form-label fw-medium">
                    Email <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`form-control form-control-lg ${errors.email ? 'is-invalid' : ''}`}
                    placeholder="your.email@example.com"
                    style={{ borderRadius: '12px' }}
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>

                <div className="mb-4">
                  <label htmlFor="message" className="form-label fw-medium">
                    Message <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className={`form-control form-control-lg ${errors.message ? 'is-invalid' : ''}`}
                    placeholder="How can we help you?"
                    style={{ borderRadius: '12px' }}
                  ></textarea>
                  {errors.message && <div className="invalid-feedback">{errors.message}</div>}
                </div>

                <button
                  type="submit"
                  disabled={formStatus === 'submitting'}
                  className="btn w-100 py-3 fw-bold rounded-pill"
                  style={{ backgroundColor: '#475569', color: 'white', fontSize: '1.1rem' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#475569'}
                >
                  {formStatus === 'submitting' ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faPaperPlane} className="me-2" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      <div className="position-fixed" style={{ bottom: '1.5rem', right: '1.5rem', zIndex: 50 }}>
        <a
          href="https://wa.me/919876543210"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-circle App-shadow d-flex align-items-center justify-content-center animate-on-scroll"
          style={{
            width: '5rem',
            height: '5rem',
            backgroundColor: '#25D366',
            color: 'white',
            textDecoration: 'none',
            boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 211, 102, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 211, 102, 0.4)';
          }}
        >
          <FontAwesomeIcon icon={faWhatsapp} size="2x" />
        </a>
      </div>

      {/* CSS for animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              transform: translateY(50px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          @keyframes slideIn {
            from {
              transform: translateX(-50px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          .animate-on-scroll {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.8s ease-out;
          }
          .animate-visible {
            opacity: 1;
            transform: translateY(0);
          }
          
          /* Responsive adjustments */
          @media (max-width: 767.98px) {
            header h1 {
              font-size: 2.2rem;
              line-height: 1.3;
            }
            header p {
              font-size: 0.95rem;
              padding: 0 1rem;
            }
            .h2 {
              font-size: 1.75rem;
            }
            .form-control-lg {
              font-size: 1rem;
              padding: 0.75rem 1rem;
            }
          }
          
          @media (max-width: 575.98px) {
            header h1 {
              font-size: 1.8rem;
            }
            .h2 {
              font-size: 1.5rem;
            }
            .btn {
              font-size: 1rem !important;
              padding: 0.75rem 1rem !important;
            }
          }

          /* Form width fix */
          .col-lg-6 form {
            width: 100%;
          }

          /* Smooth scroll */
          html {
            scroll-behavior: smooth;
          }
        `}
      </style>
    </div>
  );
};

export default Contact;