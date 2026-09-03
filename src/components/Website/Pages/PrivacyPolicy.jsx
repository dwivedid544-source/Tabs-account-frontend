import React, { useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import {
  FaArrowUp,
  FaShieldAlt,
  FaUserLock,
  FaCookie,
  FaExchangeAlt,
  FaGlobe,
  FaChild,
  FaEnvelope,
} from 'react-icons/fa';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0); // Scroll to top on page load
  }, []);

  return (
    <div className="privacy-policy-page" style={{ backgroundColor: '#f1f5f9' }}>
      {/* Hero Section */}
      <section className="text-white py-5" style={{ backgroundColor: "#475569" }}>
        <Container fluid className="text-center px-4 px-md-5"> {/* 👈 Full width container */}
          <div className="mb-4 d-inline-block p-3 rounded-circle bg-success bg-opacity-20">
            <FaShieldAlt size={70} style={{ color: '#475569' }} /> {/* 👈 Icon size increased */}
          </div>
          <h1 className="display-4 fw-bold mb-4">Privacy Policy</h1> {/* 👈 Font size increased */}
          <p className="lead opacity-75 px-3" style={{ fontSize: '1.25rem', maxWidth: '900px', margin: '0 auto' }}> {/* 👈 Font size increased */}
            Your privacy is our promise. We protect your data like it’s our own — because for your business, it is.
          </p>
        </Container>
      </section>

      {/* Main Content */}
      <section className="py-5">
        <Container fluid className="px-4 px-md-5"> {/* 👈 Full width container */}
          <Row className="justify-content-center">
            <Col lg={12}> {/* 👈 Full width column */}
              <div
                className="App-bg-white p-4 p-md-5 rounded-4 shadow-sm border"
                style={{
                  border: '1px solid rgba(71, 85, 105, 0.2)',
                  boxShadow: '0 10px 30px rgba(71, 85, 105, 0.08)',
                  fontSize: '1.1rem', // 👈 Base font size for entire card
                  lineHeight: '1.8',  // 👈 Better readability
                }}
              >
                <div className="App-text-muted small text-end mb-5 pb-3 border-bottom border-light">
                  <strong>Last Updated:</strong> May 28, 2025
                </div>

                {/* Section 1 */}
                <section className="mb-5">
                  <h2 className="fw-bold d-flex align-items-center mb-4 pb-2 border-bottom" style={{ borderColor: '#475569', fontSize: '1.75rem' }}> {/* 👈 Font size increased */}
                    <FaUserLock className="me-3" style={{ color: '#475569', fontSize: '1.6rem' }} />
                    Introduction
                  </h2>
                  <p className="lead" style={{ fontSize: '1.25rem' }}> {/* 👈 Font size increased */}
                    At <strong className="text-dark">TAB ACCOUNTS</strong>, we don’t just protect your data — we honor it.
                  </p>
                  <p style={{ fontSize: '1.15rem' }}> {/* 👈 Font size increased */}
                    This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our business management platform — including accounting, inventory, VAT invoicing, vendor/customer management, and financial reporting tools.
                  </p>
                  <div className="alert alert-light border border-secondary-subtle small mt-3" role="alert" style={{ fontSize: '1.05rem' }}>
                    <strong>By using TAB ACCOUNTS</strong>, you entrust us with sensitive business data. We treat that trust as sacred.
                  </div>
                </section>

                {/* Section 6 */}
                <section className="mb-5">
                  <h2 className="fw-bold d-flex align-items-center mb-4 pb-2 border-bottom" style={{ borderColor: '#475569', fontSize: '1.75rem' }}> {/* 👈 Font size increased */}
                    <FaGlobe className="me-3" style={{ color: '#475569', fontSize: '1.6rem' }} />
                    Your Rights — Full Control
                  </h2>
                  <p style={{ fontSize: '1.15rem' }}>You own your data. Period. You have the right to:</p>
                  <ul className="list-group list-group-flush mb-4">
                    <li className="list-group-item border-0 ps-0 py-2" style={{ fontSize: '1.1rem' }}>
                      <i className="fas fa-check-circle App-text-success me-2"></i> <strong>Access & Export:</strong> Download ledgers, reports, or customer lists anytime.
                    </li>
                    <li className="list-group-item border-0 ps-0 py-2" style={{ fontSize: '1.1rem' }}>
                      <i className="fas fa-check-circle App-text-success me-2"></i> <strong>Update & Correct:</strong> Edit vendor details, product SKUs, or bank info directly.
                    </li>
                    <li className="list-group-item border-0 ps-0 py-2" style={{ fontSize: '1.1rem' }}>
                      <i className="fas fa-check-circle App-text-success me-2"></i> <strong>Delete & Anonymize:</strong> Request permanent deletion of your account + all data.
                    </li>
                    <li className="list-group-item border-0 ps-0 py-2" style={{ fontSize: '1.1rem' }}>
                      <i className="fas fa-check-circle App-text-success me-2"></i> <strong>Opt-Out:</strong> Withdraw consent for emails or data processing (except legal obligations).
                    </li>
                  </ul>
                  <p className="mt-3" style={{ fontSize: '1.15rem' }}>
                    To exercise any right, email us at{" "}
                    <a
                      href="mailto:support@tabaccounts.com"
                      className="text-decoration-none fw-medium link-hover"
                      style={{ color: '#475569', fontSize: '1.15rem' }}
                    >
                      support@tabaccounts.com
                    </a> — we respond within 48 hours.
                  </p>
                </section>

                {/* Section 7 */}
                <section className="mb-5">
                  <h2 className="fw-bold d-flex align-items-center mb-4 pb-2 border-bottom" style={{ borderColor: '#475569', fontSize: '1.75rem' }}> {/* 👈 Font size increased */}
                    <FaShieldAlt className="me-3" style={{ color: '#475569', fontSize: '1.6rem' }} />
                    Data Security — Fort Knox for Your Business
                  </h2>
                  <div className="bg-light p-4 rounded-3 border-start border-secondary border-5" style={{ fontSize: '1.1rem' }}>
                    <p className="mb-3" style={{ fontSize: '1.15rem' }}>
                      We deploy enterprise-grade security so you can focus on growth:
                    </p>
                    <ul className="mb-3" style={{ fontSize: '1.1rem' }}>
                      <li><strong>Encryption:</strong> All data — at rest & in transit — with AES-256.</li>
                      <li><strong>Access Control:</strong> Role-based permissions (Admin, Accountant, Sales).</li>
                      <li><strong>Audit Trails:</strong> Every voucher, invoice, or inventory change is logged.</li>
                      <li><strong>Backups:</strong> Daily encrypted backups in geo-redundant servers.</li>
                    </ul>
                    <p className="mb-0 mt-2 App-text-muted fst-italic small" style={{ fontSize: '1rem' }}>
                      <i className="fas fa-exclamation-triangle me-1"></i> While we implement best-in-class security, no internet service is 100% breach-proof. We notify you within 72 hours of any incident.
                    </p>
                  </div>
                </section>

                {/* Section 8 */}
                <section className="mb-5">
                  <h2 className="fw-bold d-flex align-items-center mb-4 pb-2 border-bottom" style={{ borderColor: '#475569', fontSize: '1.75rem' }}> {/* 👈 Font size increased */}
                    <FaChild className="me-3" style={{ color: '#475569', fontSize: '1.6rem' }} />
                    Children’s Privacy
                  </h2>
                  <div className="card border-warning bg-warning bg-opacity-10">
                    <div className="card-body p-4" style={{ fontSize: '1.15rem' }}>
                      <p className="mb-2">
                        <strong>TAB ACCOUNTS is a business tool</strong> — not for personal or educational use by minors.
                      </p>
                      <p className="mb-0">
                        We do not knowingly collect data from anyone under 18. If we discover such data, we will immediately delete it. Please contact us if you believe a minor has registered.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Section 10 */}
                <section>
                  <h2 className="fw-bold d-flex align-items-center mb-4 pb-2 border-bottom" style={{ borderColor: '#475569', fontSize: '1.75rem' }}> {/* 👈 Font size increased */}
                    <FaEnvelope className="me-3" style={{ color: '#475569', fontSize: '1.6rem' }} />
                    Contact Us — We’re Here for You
                  </h2>
                  <p style={{ fontSize: '1.15rem' }}>Questions? Concerns? Just want to say hi? Reach out via:</p>
                  <div className="bg-light bg-opacity-5 rounded-3 p-4">
                    <ul className="list-unstyled mb-0">
                      <li className="mb-3">
                        <strong className="text-dark d-block mb-1" style={{ fontSize: '1.15rem' }}>📧 Email Support:</strong>
                        <a
                          href="mailto:support@zirakBook.com"
                          className="text-decoration-none d-inline-block link-hover"
                          style={{ color: '#475569', fontSize: '1.15rem' }}
                        >
                          support@Zirakbook.com
                        </a>
                        <br />
                        <small className="App-text-muted" style={{ fontSize: '1rem' }}>Response within 24-48 hours</small>
                      </li>
                      <li className="mb-3">
                        <strong className="text-dark d-block mb-1" style={{ fontSize: '1.15rem' }}>📞 Phone Support:</strong>
                        <span className="text-dark" style={{ fontSize: '1.15rem' }}>+91 98765 43210</span>
                        <br />
                        <small className="App-text-muted" style={{ fontSize: '1rem' }}>Mon-Fri, 9 AM - 6 PM IST</small>
                      </li>
                      <li>
                        <strong className="text-dark d-block mb-1" style={{ fontSize: '1.15rem' }}>📍 Office:</strong>
                        <address className="text-dark mb-0" style={{ fontSize: '1.1rem' }}>
                          123 Business Park, Sector 44,<br />
                          Gurugram, Haryana - 122002, India
                        </address>
                      </li>
                    </ul>
                  </div>
                </section>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Back to Top Button */}
      <Button
        variant="dark"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="position-fixed bottom-0 end-0 m-4 rounded-circle p-3 App-shadow"
        style={{
          backgroundColor: '#475569',
          borderColor: '#475569',
          zIndex: 1000,
          width: '60px',   // 👈 Slightly larger
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FaArrowUp size={24} /> {/* 👈 Larger icon */}
      </Button>
    </div>
  );
};

export default PrivacyPolicy;