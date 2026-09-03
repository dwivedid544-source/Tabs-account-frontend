import React, { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import { Link } from 'react-router-dom';
const hero_img = "/images/features/features_hero.png";
const slide1 = "/images/features/v_slide1.png";
const slide2 = "/images/features/v_slide2.png";
const slide3 = "/images/features/v_slide3.png";
const slide4 = "/images/features/v_slide4.png";
const slide5 = "/images/features/v_slide5.png";
const img1 = "/images/features/accounting_inventory.png";
const img2 = "/images/features/crm.png";
const img3 = "/images/features/inventory.png";
const img4 = "/images/features/hero.png";

// Import Bootstrap components
import { Container, Row, Col, Button, Carousel } from 'react-bootstrap';
import {
  MdCheckCircle,
  MdDashboard,
  MdAccountTree,
  MdGroup,
  MdBusinessCenter,
  MdReceiptLong,
  MdWarehouse,
  MdInventory,
  MdSettingsSuggest,
  MdAssignment,
  MdSwapHoriz,
  MdAutorenew,
  MdShoppingCart,
  MdUndo,
  MdShoppingBag,
  MdHistory,
  MdAccountBalanceWallet,
  MdRequestQuote,
  MdBarChart
} from 'react-icons/md';

const Features = () => {
  useEffect(() => {
    AOS.init({ duration: 1200, once: true, easing: "ease-in-out" });
  }, []);

  return (
    <div>

      <section style={{ backgroundColor: 'var(--secondary)', fontFamily: 'Segoe UI, sans-serif', color: 'var(--text-main)', padding: '40px 0' }}>
        <Container>
          <Row className="align-items-center">
            {/* TEXT SECTION */}
            <Col md={6} data-aos="fade-right" className="text-center text-md-start">
              <div style={{ textAlign: 'start', marginLeft: 'auto', marginRight: 'auto', paddingLeft: 0, paddingRight: 0 }}>
                <h2
                  className="fw-bold display-5 mb-3"
                  style={{
                    fontSize: '2.5rem',
                    lineHeight: '1.2',
                    margin: '0 0 16px',
                    // padding: 0,
                    fontWeight: '700',
                    textAlign: 'left',
                    fontFamily: 'inherit'
                  }}
                >
                  Features That Are&nbsp;Incredibly<br />
                  easy to use
                </h2>
                <p
                  style={{
                    fontSize: '1.25rem',
                    lineHeight: '1.6',
                    margin: '0 0 20px',
                    paddingLeft: 0,
                    paddingRight: 0,
                    color: 'inherit'
                  }}
                >
                  Create invoices, get ready GST reports and so much more.
                </p>
                <p
                  style={{
                    fontSize: '1rem',
                    margin: '0 0 30px',
                    paddingLeft: 0,
                    paddingRight: 0,
                    color: '#222'
                  }}
                >
                  Faster | Smarter | Anywhere | Anytime
                </p>
              </div>
            </Col>
            {/* IMAGE SECTION */}
            <Col md={6} className="text-center mt-4 mt-md-0" data-aos="zoom-in">
              <div
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  aspectRatio: "1 / 1",
                  margin: "0 auto",
                  borderRadius: "50%",
                  overflow: "hidden",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  transition: "transform 0.4s ease",
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <img
                  src={hero_img}
                  alt="Business team collaboration"
                  className="img-fluid"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover", // ensures no empty space, fills circle
                  }}
                />
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* NEW CAROUSEL SECTION */}
      <section className="py-4 py-md-5" style={{ backgroundColor: "#f8f9fa" }}>
        <Container>
          <h2
            className="text-center fw-bold mb-4"
            data-aos="fade-down"
            style={{ fontSize: '2.5rem', letterSpacing: '0.5px', color: '#333' }}
          >
            Explore Our Invoice Features
          </h2>

          <Carousel
            data-bs-theme="dark"
            variant="dark"
            data-aos="zoom-in"
            interval={3000}
            controls={true}
            indicators={true}
            className="shadow-lg rounded-4 overflow-hidden custom-carousel"
            style={{
              maxWidth: "1000px",
              margin: "0 auto",
              position: "relative",
              borderRadius: "1.5rem",
              boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
              minHeight: '300px' // Prevents collapse on small screens
            }}
          >
            {/* Slide 1 */}
            <Carousel.Item>
              <div className="position-relative">
                <img
                  className="d-block w-100 img-fluid"
                  src={slide1}
                  alt="Accounting Dashboard"
                  style={{
                    height: "auto",
                    maxHeight: "550px",
                    objectFit: "cover",
                    aspectRatio: "16/9",
                  }}
                />
              </div>
            </Carousel.Item>

            {/* Slide 2 */}
            <Carousel.Item>
              <div className="position-relative">
                <img
                  className="d-block w-100 img-fluid"
                  src={slide2}
                  alt="Invoice Management"
                  style={{
                    height: "auto",
                    maxHeight: "550px",
                    objectFit: "cover",
                    aspectRatio: "16/9",
                  }}
                />
              </div>
            </Carousel.Item>

            {/* Slide 3 */}
            <Carousel.Item>
              <div className="position-relative">
                <img
                  className="d-block w-100 img-fluid"
                  src={slide3}
                  alt="GST Reports"
                  style={{
                    height: "auto",
                    maxHeight: "550px",
                    objectFit: "cover",
                    aspectRatio: "16/9",
                  }}
                />
              </div>
            </Carousel.Item>

            {/* Slide 4 */}
            <Carousel.Item>
              <div className="position-relative">
                <img
                  className="d-block w-100 img-fluid"
                  src={slide4}
                  alt="Inventory Management"
                  style={{
                    height: "auto",
                    maxHeight: "550px",
                    objectFit: "cover",
                    aspectRatio: "16/9",
                  }}
                />
              </div>
            </Carousel.Item>

            {/* Slide 5 */}
            <Carousel.Item>
              <div className="position-relative">
                <img
                  className="d-block w-100 img-fluid"
                  src={slide5}
                  alt="Financial Reports"
                  style={{
                    height: "auto",
                    maxHeight: "550px",
                    objectFit: "cover",
                    aspectRatio: "16/9",
                  }}
                />
              </div>
            </Carousel.Item>
          </Carousel>
        </Container>
      </section>

      {/* Slide 1: Chart of Accounts & Ledger Management */}
      <section className="py-4 py-md-5" style={{ backgroundColor: "#fff" }}>
        <Container>
          <Row className="align-items-center">
            {/* Left Text */}
            <Col lg={6} data-aos="fade-right" className="mb-4 mb-lg-0">
              {/* <h2 className="mt-2 fw-bold mb-3 h4">
                Chart of Accounts & Ledger Management
              </h2> */}
              <h2 className="mt-2 fw-bold mb-3 h4 text-center text-md-start">
                Chart of Accounts & Ledger Management
              </h2>

              <ul className="list-unstyled mt-4">
                <li className="mb-2" data-aos="fade-up" data-aos-delay="100">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong>Customizable Chart of Accounts:</strong> Create and manage a hierarchical structure for all financial accounts (Assets, Liabilities, Income, Expenses).
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="100">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong>Parent & Sub-Accounts:</strong> Organize accounts into logical groups (e.g., Sundry Debtors/Creditors under Current Assets/Liabilities).
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="300">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong> View Detailed Ledgers:</strong> Access a complete transaction history for any individual account or customer/vendor.
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="400">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong>Credit/Debit Control:</strong> Define credit periods for customers and track outstanding balances.
                </li>
              </ul>
            </Col>

            {/* Right Invoice Preview */}
            <Col lg={6} data-aos="fade-left">
              <div className="text-center">
                <div
                  className="bg-light p-3 p-md-4 rounded shadow-lg"
                  style={{
                    maxWidth: "100%",
                    margin: "0 auto",
                    transition: "transform 0.4s ease"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-8px)"}
                  onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0px)"}
                >
                  <img
                    src={img1}
                    alt="Accounts & Ledger"
                    className="img-fluid rounded"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Slide 2: Customer & Vendor (Debtor/Creditor) Management */}
      <section className="py-4 py-md-5" style={{ backgroundColor: "#f8f9fa" }}>
        <Container>
          <Row className="align-items-center">
            <Col lg={6} data-aos="fade-right" className="mb-4 mb-lg-0">

              <h2 className="mt-2 fw-bold mb-3 h4 text-center text-md-start">
                Customer & Vendor (Debtor/Creditor) Management
              </h2>

              <ul className="list-unstyled mt-4">
                <li className="mb-2" data-aos="fade-up" data-aos-delay="100">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong> Comprehensive CRM:</strong> Add, view, and manage customer details (contact info, credit limit, GSTIN, shipping address).
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="200">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong> Vendor Directory:</strong> Maintain a database of suppliers with their contact, payment terms, and account information.
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="300">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong> Account Status Tracking:</strong> Monitor customer receivables and vendor payables, including aging reports for overdue amounts.
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="400">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong> Credit/Debit Control:</strong>Define credit periods for customers and track outstanding balances.
                </li>
              </ul>
            </Col>
            <Col lg={6} data-aos="fade-left">
              <div className="text-center">
                <div
                  className="bg-light p-3 p-md-4 rounded shadow-lg"
                  style={{
                    maxWidth: "100%",
                    margin: "0 auto",
                    transition: "transform 0.4s ease"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-8px)"}
                  onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0px)"}
                >
                  <img
                    src={img2}
                    alt="Debtor/Creditor"
                    className="img-fluid rounded"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Slide 3: Inventory & Warehouse Management */}
      <section className="py-4 py-md-5" style={{ backgroundColor: "#fff" }}>
        <Container>
          <Row className="align-items-center">
            {/* Left - IMAGE SECTION */}
            <Col lg={6} data-aos="fade-right" className="mb-4 mb-lg-0">
              <div className="text-center">
                <div
                  className="App-bg-white p-3 p-md-4 rounded shadow-lg"
                  style={{
                    maxWidth: "100%",
                    margin: "0 auto",
                    transition: "transform 0.4s ease"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-8px)"}
                  onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0px)"}
                >
                  <img
                    src={img3}
                    alt="Expenses & Profit Dashboard"
                    className="img-fluid rounded"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                </div>
              </div>
            </Col>

            {/* Right - Text Section */}
            <Col lg={6} data-aos="fade-left">
              <h2 className="mt-2 fw-bold mb-3 h4 text-center text-md-start">
                Inventory & Warehouse Management
              </h2>

              <ul className="list-unstyled mt-4">
                <li className="mb-2" data-aos="fade-up" data-aos-delay="100">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong> Multi-Warehouse Support:</strong> Create and manage multiple warehouse locations (e.g., Central, North Zone, South Depot).
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="200">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong> Product Master: </strong> Add products with details like SKU, HSN code, category, brand, description, and images.
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="300">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong> Stock Level Monitoring: </strong> Track opening, inward, outward, and closing stock levels for each product at every warehouse.
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="300">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong> Stock Alerts:</strong>  Get notifications for low stock or out-of-stock items to prevent sales loss.
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="300">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong> Stock Transfer: </strong>   Easily move stock between different warehouses with a dedicated voucher.
                </li>
              </ul>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Slide 4: Sales Workflow & Order Management */}
      <section className="py-4 py-md-5" style={{ backgroundColor: "#f8f9fa" }}>
        <Container>
          <Row className="align-items-center">
            {/* Left - Reports Image */}
            <Col lg={6} data-aos="fade-right" className="mb-4 mb-lg-0">
              <div className="text-center">
                <img
                  src={img4}
                  alt="GST Invoice Example"
                  className="img-fluid rounded shadow-lg"
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    border: "1px solid #e9ecef",
                    borderRadius: "8px",
                    transition: "transform 0.4s ease"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                />
              </div>
            </Col>

            {/* Right - Text Content */}
            <Col lg={6} data-aos="fade-left">
              <h2 className="mt-2 fw-bold mb-3 h4 text-center text-md-start">
                Sales Workflow & Order Management
              </h2>


              <ul className="list-unstyled mt-4">
                <li className="mb-2" data-aos="fade-up" data-aos-delay="100">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong> End-to-End Sales Process: </strong> Manage the complete sales cycle from Quotation to Payment Receipt.
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="200">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong> Multi-Stage Documents:</strong> Create and convert between Quotations, Sales Orders, Delivery Challans, and Invoices.
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="300">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong>Flexible Invoicing: </strong> Generate professional invoices with customizable templates, tax calculations, and discount options.
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="400">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong>Payment Tracking:</strong>Record and reconcile customer payments against specific invoices.
                </li>
                <li className="mb-2" data-aos="fade-up" data-aos-delay="500">
                  <MdCheckCircle className="App-text-primary me-2" />
                  <strong> Sales Returns: </strong> Manage product returns with reasons, reference to original invoices, and processing status (Pending/Approved).
                </li>
              </ul>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Additional Features Grid */}
      <section className="py-4 py-md-5" style={{ backgroundColor: "var(--accent-light)" }}>
        <Container data-aos="fade-up">
          <div className="text-center mb-5">
            <h2 className="h1 fw-bold mb-3" data-aos="zoom-in">
              There's More!
            </h2>
          </div>
          <Row>
            {[
              { icon: <MdDashboard />, title: "Dashboard", description: "View KPIs, quick stats, and alerts in one place." },
              { icon: <MdAccountTree />, title: "Charts of Accounts", description: "Organize all financial accounts for reporting." },
              { icon: <MdGroup />, title: "Customers / Debtors", description: "Manage customer details, balances, and receivables." },
              { icon: <MdBusinessCenter />, title: "Vendors / Creditors", description: "Maintain supplier records and monitor payables." },
              { icon: <MdReceiptLong />, title: "All Transactions", description: "Track invoices, payments, expenses, and receipts." },
              { icon: <MdWarehouse />, title: "Warehouse", description: "Monitor stock levels and transfers." },
              { icon: <MdInventory />, title: "Product & Inventory", description: "Manage products with batch and stock tracking." },
              { icon: <MdSettingsSuggest />, title: "Service", description: "Record and manage non-inventory services." },
              { icon: <MdAssignment />, title: "Create Voucher", description: "Generate vouchers for payments, receipts, adjustments." },
              { icon: <MdSwapHoriz />, title: "Stock Transfer", description: "Transfer stock with proper documentation." },
              { icon: <MdAutorenew />, title: "Inventory Adjustment", description: "Adjust stock discrepancies easily." },
              { icon: <MdShoppingCart />, title: "Sales Order", description: "Track sales orders from confirmation to dispatch." },
              { icon: <MdUndo />, title: "Sales Return", description: "Record returns and manage credit notes." },
              { icon: <MdShoppingBag />, title: "Purchase Orders", description: "Manage supplier purchase orders with tracking." },
              { icon: <MdHistory />, title: "Purchase Return", description: "Handle returned goods and adjustments." },
              { icon: <MdAccountBalanceWallet />, title: "Expenses", description: "Record business expenses with categories." },
              { icon: <MdRequestQuote />, title: "ITC Report", description: "Track input tax credit availability and use." },
              { icon: <MdBarChart />, title: "Reports", description: "Access purchase, sales, tax, and inventory reports." }
            ].map((feature, index) => (
              <Col
                key={index}
                xs={12}
                md={6}
                lg={4}
                className="mb-4"
                data-aos="fade-up"
                data-aos-delay={index * 100}
              >
                <div
                  className="App-bg-white p-4 rounded shadow-sm h-100 text-center"
                  style={{ transition: "transform 0.4s ease" }}
                  onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-8px)"}
                  onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0px)"}
                >
                  <div className="mb-3 App-text-primary" style={{ fontSize: "48px" }}>
                    {feature.icon}
                  </div>
                  <h5 className="fw-bold mb-2">{feature.title}</h5>
                  <p className="App-text-muted small">{feature.description}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Footer CTA */}
      <section
        className="py-4 py-md-5 mx-3 mx-md-5 mb-4"
        style={{
          background: 'linear-gradient(to right, var(--primary), var(--primary-hover))',
          color: "#ffffff",
          position: "relative",
          overflow: "hidden",
          borderRadius: "20px"
        }}
      >
        <Container className="text-center position-relative" style={{ zIndex: 1 }} data-aos="zoom-in">
          <h2
            className="display-6 fw-bold mb-3"
            style={{ letterSpacing: "1px" }}
            data-aos="fade-down"
            data-aos-delay="100"
          >
            Ready for Fast & Smart Accounting?
          </h2>
          <h3
            className="fw-light mb-4"
            style={{ fontSize: "1.5rem", opacity: 0.9 }}
            data-aos="fade-down"
            data-aos-delay="200"
          >
            Let’s Get Started Together!
          </h3>
          <Button
            as={Link}
            to="/contact"
            className="btn-cta-premium"
            style={{
              display: 'inline-block',
              backgroundColor: '#ffffff',
              color: 'var(--text-main)',
              padding: '14px 40px',
              fontWeight: '700',
              borderRadius: '50px',
              boxShadow: '0 8px 15px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              border: 'none',
              textDecoration: 'none',
              fontSize: '1.1rem',
              whiteSpace: 'nowrap'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 12px 20px rgba(0,0,0,0.15)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 15px rgba(0,0,0,0.1)";
            }}
            data-aos="fade-up"
            data-aos-delay="300"
          >
            Contact Now
          </Button>
        </Container>
      </section>

    </div>
  );
};

export default Features;