import React, { useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import {
  FaArrowUp,
  FaFileContract,
  FaHandshake,
  FaLock,
  FaBalanceScale,
  FaGlobe,
} from 'react-icons/fa';

const TermsConditions = () => {
  useEffect(() => {
    window.scrollTo(0, 0); // Scroll to top on page load
  }, []);

  return (
    <div className="terms-page" style={{ backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      {/* Hero Section */}
      <section
        className="bg-dark text-white py-5 position-relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 100%)',
        }}
      >
        <div
          className="position-absolute top-0 start-0 w-100 h-100 opacity-10"
          style={{
            backgroundColor: '#475569',
            backgroundSize: '60px 60px',
          }}
        ></div>
        <Container fluid className="text-center position-relative px-4 px-md-5"> {/* 👈 Full width */}
          <FaFileContract size={70} className="mb-4" style={{ color: '#475569' }} />
          <h1 className="display-4 fw-bold mb-3">Terms & Conditions</h1>
          <p className="lead opacity-75 fs-5">
            Please read these terms carefully before using TAB ACCOUNTS services.
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
                  boxShadow: '0 8px 30px rgba(71, 85, 105, 0.1)',
                }}
              >
                <div className="App-text-muted small text-end mb-5">
                  Last Updated: <strong>May 28, 2025</strong>
                </div>

                {/* Section 1 */}
                <section className="mb-5">
                  <h2 className="fw-bold border-bottom pb-3 mb-4 d-flex align-items-center gap-2" style={{ borderColor: '#475569', fontSize: '1.5rem' }}>
                    <FaHandshake style={{ color: '#475569' }} />
                    Acceptance of Terms
                  </h2>
                  <p className="fs-5">
                    By accessing or using the TAB ACCOUNTS software or website (“Service”), you agree to be bound by these Terms and Conditions (“Terms”). If you do not agree with any part of the terms, you may not access the Service.
                  </p>
                </section>

                {/* Section 2 */}
                <section className="mb-5">
                  <h2 className="fw-bold border-bottom pb-3 mb-4 d-flex align-items-center gap-2" style={{ borderColor: '#475569', fontSize: '1.5rem' }}>
                    <FaLock style={{ color: '#475569' }} />
                    Subscription & Payments
                  </h2>
                  <p className="fs-5">
                    Access to premium features requires a paid subscription. You agree to pay all fees as specified at the time of purchase. All fees are non-refundable except as expressly stated in our Refund Policy.
                  </p>
                  <p className="fs-5">
                    We use third-party payment processors (Razorpay, Stripe, etc.). You agree to their terms as well.
                  </p>
                </section>

                {/* Section 3 */}
                <section className="mb-5">
                  <h2 className="fw-bold border-bottom pb-3 mb-4 d-flex align-items-center gap-2" style={{ borderColor: '#475569', fontSize: '1.5rem' }}>
                    <FaBalanceScale style={{ color: '#475569' }} />
                    Intellectual Property
                  </h2>
                  <p className="fs-5">
                    The Service and its original content, features, and functionality are owned by TAB ACCOUNTS and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                  </p>
                  <p className="fs-5">
                    You are granted a limited, non-exclusive, non-transferable license to access and use the Service — not to copy, modify, or redistribute it.
                  </p>
                </section>

                {/* Section 4 */}
                <section className="mb-5">
                  <h2 className="fw-bold border-bottom pb-3 mb-4 d-flex align-items-center gap-2" style={{ borderColor: '#475569', fontSize: '1.5rem' }}>
                    <FaGlobe style={{ color: '#475569' }} />
                    Limitation of Liability
                  </h2>
                  <p className="fs-5">
                    In no event shall TAB ACCOUNTS, its affiliates, or licensors be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Service.
                  </p>
                  <p className="fs-5">
                    Our total liability to you for any claim under these Terms shall not exceed the amount you paid us in the 6 months prior to the event giving rise to the claim.
                  </p>
                </section>

                {/* Section 5 */}
                <section className="mb-5">
                  <h2 className="fw-bold border-bottom pb-3 mb-4 d-flex align-items-center gap-2" style={{ borderColor: '#475569', fontSize: '1.5rem' }}>
                    <FaFileContract style={{ color: '#475569' }} />
                    Governing Law
                  </h2>
                  <p className="fs-5">
                    These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
                  </p>
                  <p className="fs-5">
                    Any dispute shall be subject to the exclusive jurisdiction of courts in Gurugram, Haryana, India.
                  </p>
                </section>

                {/* Section 6 */}
                <section className="mb-5">
                  <h2 className="fw-bold border-bottom pb-3 mb-4 d-flex align-items-center gap-2" style={{ borderColor: '#475569', fontSize: '1.5rem' }}>
                    <FaArrowUp style={{ color: '#475569' }} />
                    Changes to Terms
                  </h2>
                  <p className="fs-5">
                    We reserve the right to modify or replace these Terms at any time. We will notify you of material changes via email or in-app notification.
                  </p>
                  <p className="fs-5">
                    By continuing to access or use the Service after changes become effective, you agree to be bound by the revised Terms.
                  </p>
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
        className="position-fixed bottom-0 end-0 m-4 rounded-circle p-3 shadow-lg"
        style={{
          backgroundColor: '#475569',
          borderColor: '#475569',
          zIndex: 1000,
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <FaArrowUp size={20} />
      </Button>
    </div>
  );
};

export default TermsConditions;