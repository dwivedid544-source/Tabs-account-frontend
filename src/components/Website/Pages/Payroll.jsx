import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
const promoImage = "https://images.unsplash.com/photo-1554224155-1696413575b9?auto=format&fit=crop&w=800&q=80";
const testimonialImage = "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=500&q=500";
const featureCircleImage = "https://images.unsplash.com/photo-1454165833267-03510d48723c?auto=format&fit=crop&w=500&q=500";
import { FaChartLine, FaStopwatch, FaMoneyCheckAlt, FaChartBar, FaDesktop, FaHeadset } from 'react-icons/fa';
import { Link } from 'react-router-dom';



import './IndustrialSoltions.css';

const Payroll = () => {
  return (
    <>
      {/* Hero Section */}
      <Container fluid className="px-4 py-5 bg-light">
        <Row className="align-items-center justify-content-between gx-5">
          <Col md={6} className="text-start">
            <h1 className="fw-bold display-5 mb-4 text-dark">
              Faster, easier <br /> payroll-all inside <br /> TAB ACCOUNTS
            </h1>
            <p className="mb-3 fs-5 text-secondary">
              TAB ACCOUNTS Desktop Enterprise comes with fully integrated payroll options to fit your business, with no additional subscription fees.
            </p>
            <p className="mb-3 fs-5 text-secondary">


              To learn more, call <span className="fw-bold text-dark">1-833-207-6537</span>
            </p>
            <div className="d-flex flex-column flex-md-row gap-3">
              <Button
                variant="dark"
                size="lg"
                as={Link}
                to="/pricing"
              >
                Buy now
              </Button>

            </div>
          </Col>
          <Col md={6} className="text-center mt-5 mt-md-0">
            <div className="circle-image-container mx-auto">
              <img src={promoImage} alt="TAB ACCOUNTS Promo" className="img-fluid circle-image" />
            </div>
          </Col>
        </Row>
      </Container>

      {/* Feature Section */}
      <Container fluid className="py-5 text-center">
        <h2 className="fw-bold display-6 mb-3">Manage payroll faster right in Enterprise with<br />TAB ACCOUNTS Desktop Payroll</h2>
        <br />

        <Row className="text-start px-3 px-md-5">
          <Col md={3} className="mb-4">
            <div className="App-text-primary fs-2 mb-3"><FaChartLine /></div>
            <h5 className="fw-bold">Payroll built right into TAB ACCOUNTS</h5>
            <p className="App-text-muted">
              Run payroll in the same spot you manage your books. No syncing, importing, or manually re-entering data needed.
            </p>
          </Col>
          <Col md={3} className="mb-4">
            <div className="App-text-primary fs-2 mb-3"><FaStopwatch /></div>
            <h5 className="fw-bold">Automatic tax filing, guaranteed accurate</h5>
            <p className="App-text-muted">
              We manage payroll tax payments and filings for you—guaranteed to be on time and accurate.
            </p>
          </Col>
          <Col md={3} className="mb-4">
            <div className="App-text-primary fs-2 mb-3"><FaMoneyCheckAlt /></div>
            <h5 className="fw-bold">Online employee portal</h5>
            <p className="App-text-muted">
              Let employees view digital pay stubs, W-2s, PTO balances and withholding allowances anytime, using TAB ACCOUNTS Workforce. Improve administrator productivity by easily identifying incomplete employee profiles.
            </p>
          </Col>
          <Col md={3} className="mb-4">
            <div className="App-text-primary fs-2 mb-3"><FaChartBar /></div>
            <h5 className="fw-bold">Next-day direct deposit*</h5>
            <p className="App-text-muted">
              Get paid faster with Assisted Payroll (included with Desktop Enterprise Diamond), submit payroll up to 5:00 PM PT the day before payday. Funds are withdrawn on the day your employees get paid.
            </p>
          </Col>
        </Row>


      </Container>
      <Container fluid className="py-5 App-bg-white px-4">
        <Row className="align-items-center">
          {/* LEFT CONTENT */}
          <Col md={6} className="mb-5 mb-md-0">
            <div className="mb-2">
              <span className="badge bg-warning text-dark fw-bold">INCLUDED</span>
            </div>
            <p className="text-uppercase App-text-muted fw-semibold small mb-2">
              Desktop Enterprise Gold and Platinum
            </p>
            <h2 className="fw-bold display-5 mb-4">Do it yourself with Enhanced Payroll</h2>
            <p className="text-dark fs-5">
              Included with TAB ACCOUNTS Enterprise Gold and Platinum, TAB ACCOUNTS Desktop Enhanced Payroll gives you the tools to create paychecks and quickly file taxes yourself.
            </p>
            <ul className="text-dark fs-6 mt-4 ps-3">
              <li>Run your payroll right from TAB ACCOUNTS—no need to sync or import data from other programs.</li>
              <li>Enter hours, review, and pay your team—TAB ACCOUNTS calculates the earnings, taxes, and deductions for you.</li>
              <li>Pay with checks, free direct deposit, or a combination of both.</li>
              <li>Give employees access to an online portal to view pay stubs, W-2s, time off balances, taxes withheld, and more.</li>
              <li>Offer affordable 401(k) retirement plans through Guideline that are integrated with TAB ACCOUNTS.**</li>
            </ul>
          </Col>

          {/* RIGHT IMAGE */}
          <Col md={6} className="text-center position-relative">
            <div className="circle-image-wrapper mx-auto position-relative">
              <img
                src={testimonialImage}
                alt="Payroll Section"
                className="img-fluid rounded-circle App-shadow"
                style={{ width: '400px', height: '400px', objectFit: 'cover' }}
              />
              <div className="payroll-card shadow-sm">
                <div className="d-flex align-items-center mb-1">
                  <span className="badge bg-success rounded-circle me-2" style={{ width: '18px', height: '18px' }}></span>

                </div>

              </div>
            </div>
          </Col>
        </Row>
      </Container>
      <Container fluid className="py-5 App-bg-white px-4">
        <Row className="align-items-center">
          {/* LEFT IMAGE */}
          <Col md={6} className="text-center mb-4 mb-md-0">
            <div className="circle-image-wrapper mx-auto">
              <img
                src={featureCircleImage}
                alt="Assisted Payroll"
                className="img-fluid rounded-circle App-shadow"
                style={{ width: '400px', height: '400px', objectFit: 'cover' }}
              />
            </div>
          </Col>

          {/* RIGHT CONTENT */}
          <Col md={6}>
            <div className="mb-2">
              <span className="badge bg-warning text-dark fw-bold">INCLUDED</span>
            </div>
            <p className="text-uppercase App-text-muted fw-semibold small mb-2">
              Desktop Enterprise Diamond
            </p>
            <h2 className="fw-bold display-5 mb-4">Get extra help with Assisted Payroll</h2>
            <p className="fs-5 text-dark">
              Included with TAB ACCOUNTS Desktop Enterprise Diamond, our most powerful payroll solution takes work off your plate with automation and premium support.**
            </p>
            <ul className="fs-5 text-dark mt-3 ps-3">
              <li className="mb-2">
                We automatically file your taxes and forms for you—guaranteed on-time and accurate or we'll pay the penalties.†
              </li>
              <li className="mb-2">
                We'll give you step-by-step guidance with payroll setup.**
              </li>
              <li>
                Our specialists will answer questions when you have them to make payday hassle-free.**
              </li>
            </ul>
          </Col>
        </Row>
      </Container>

      <section style={{ backgroundColor: '#ffffff' }}>
        <Container className="py-5">
          <h2 className="text-center fw-bold display-5 mb-5">
            We’re here when you need us
          </h2>

          <Row className="g-4 justify-content-center">
            {/* Talk to Sales */}
            <Col xs={12} md={6} lg={6}>
              <div
                className="rounded-4 p-4 h-100"
                style={{ backgroundColor: '#073642', color: '#ffffff' }}
              >
                <div className="fs-2 mb-3 text-white">
                  <FaHeadset />
                </div>
                <h3 className="fw-bold mb-3" style={{ color: '#94a3b8' }}>
                  Talk to sales
                </h3>
                <p className="mb-1">
                  Give us a call if you have questions about TAB ACCOUNTS Desktop Enterprise.
                </p>
                <p className="fw-medium mb-0">Call 1-833-925-5657</p>
                <p className="mb-0">Mon–Fri, 6 AM to 4 PM PT</p>
              </div>
            </Col>

            {/* Priority Circle */}
            <Col xs={12} md={6} lg={6}>
              <div
                className="rounded-4 p-4 h-100"
                style={{ backgroundColor: '#073642', color: '#ffffff' }}
              >
                <div className="fs-2 mb-3 text-white">
                  <FaDesktop />
                </div>
                <h3 className="fw-bold mb-3" style={{ color: '#94a3b8' }}>
                  Priority Circle
                </h3>
                <p className="mb-4">
                  TAB ACCOUNTS Priority Circle provides premium support and on-demand training
                  to map TAB ACCOUNTS to your specific needs—no matter how much they change.**
                </p>
                <Button
                  variant="light"
                  className="fw-bold text-dark px-4 py-2 rounded-pill"
                >
                  Learn more
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </section>


    </>
  );
};

export default Payroll;
