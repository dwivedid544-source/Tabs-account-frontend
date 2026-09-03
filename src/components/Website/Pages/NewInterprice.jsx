import React from 'react';
import { Container, Row, Col, Button, Badge } from 'react-bootstrap';


// Image imports
const promoImage = "https://images.unsplash.com/photo-1554224155-1696413575b9?auto=format&fit=crop&w=800&q=80";
const feature1 = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=500&q=80";
const feature2 = "https://images.unsplash.com/photo-1551288049-bbdac8a28a1e?auto=format&fit=crop&w=500&q=80";
const feature3 = "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=500&q=80";
const reportImage = "https://images.unsplash.com/photo-1543269664-56d93c1b41a6?auto=format&fit=crop&w=500&q=80";
const landedCost = "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=500&q=80";
const inventoryReport = "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=500&q=80";
const listSearch = "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=500&q=80";
import { Link } from 'react-router-dom';


const NewInterprice = () => {
  return (
    <>
      {/* Top Hero Section */}
      <Container fluid className="px-4 py-5 App-bg-white">
        <Row className="align-items-center justify-content-between  p-4">
          <Col md={6} className="text-start ">
            <h1 className="fw-bold display-5 mb-4 text-dark">
              New features help <br /> you work even <br /> more efficiently
            </h1>

            <p className="mb-3 fs-5 text-secondary">
              The latest features in zirakBook Desktop Enterprise improve the sales order process, inventory management, and more.
            </p>

            <p className="mb-4 fs-6 text-secondary">
              To learn more about how we can help your business, call{' '}
              <span className="fw-bold text-dark">1-833-207-6537</span> or{' '}
              <a href="#" className="text-decoration-underline">contact sales</a>.
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
            <div
              className="mx-auto"
              style={{
                width: "100%",               // Take full column width
                maxWidth: "500px",           // Set a max size for large screens
                aspectRatio: "1 / 1",        // Keep square shape
                overflow: "hidden",
                borderRadius: "50%",
                border: "5px solid #ccc",    // Optional border
                margin: "0 auto",
              }}
            >
              <img
                src={promoImage}
                alt="zirakBook Promo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          </Col>

        </Row>
      </Container>

      {/* What's New Feature Section */}
      <Container className="py-5">
        <h2 className="text-center fw-bold mb-5">See what’s new in <br /> zirakBook Desktop Enterprise</h2>

        {/* Feature 1 */}
        <Row className="align-items-center mb-5 gx-5">
          <Col md={6} className="text-center mb-4 mb-md-0">
            <div className="green-circle-bg mx-auto">
              <img src={feature1} alt="Feature 1" className="img-fluid" />
            </div>
          </Col>
          <Col md={6}>
            <Badge bg="primary" className="mb-2">UPDATED</Badge>
            <h4 className="fw-bold">Customer prepayments on sales orders and estimates*</h4>
            <p className="text-secondary">
              Save time by easily recording and tracking customer prepayments on estimates and sales orders. Then automatically apply the payments when sales orders are converted to invoices and reconcile them as a current liability instead of as negative accounts receivable. Easily view and keep track of all customer prepayments associated with your projects in a single report. And give customers peace of mind with proof of payment via print or email.
            </p>
          </Col>
        </Row>

        {/* Feature 2 */}
        <Row className="align-items-center flex-md-row-reverse mb-5 gx-5">
          <Col md={6} className="text-center mb-4 mb-md-0">
            <div className="green-circle-bg mx-auto">
              <img src={feature2} alt="Feature 2" className="img-fluid" />
            </div>
          </Col>
          <Col md={6}>
            <Badge bg="warning" text="dark" className="mb-2">NEW</Badge>
            <h4 className="fw-bold">Inventory Turnover report</h4>
            <p className="text-secondary">
              Improve your profitability by gaining clear insight into what’s selling and when. Leverage key metrics like Turnover Ratio and Turnover Days to understand your inventory performance so you can make timely decisions to optimize quantities on hand, sales prices, and reorders. Sort and filter to get a quick snapshot of where your inventory turnover stands.
            </p>
          </Col>
        </Row>

        {/* Feature 3 */}
        <Row className="align-items-center gx-5">
          <Col md={6} className="text-center mb-4 mb-md-0">
            <div className="green-circle-bg mx-auto">
              <img src={feature3} alt="Feature 3" className="img-fluid" />
            </div>
          </Col>
          <Col md={6}>
            <Badge bg="warning" text="dark" className="mb-2">NEW</Badge>
            <h4 className="fw-bold">Linked sales orders with purchase orders</h4>
            <p className="text-secondary">
              Get orders to customers faster and track products purchased more efficiently by linking sales orders to purchase orders. Enhance customer satisfaction by providing product delivery timeframes through a consolidated report. Manage your inventory more efficiently by quickly identifying inbound delivery dates for sales order items.
            </p>
          </Col>
        </Row>
      </Container>

      {/* Final CTA Section */}
      {/* <div className="cta-green-section text-center py-5">
        <h2 className="fw-bold text-white mb-4">Get started with <br />  Desktop Enterprise</h2>
        <Button variant="dark" className="fw-bold px-4 py-2">Buy now</Button>
      </div> */}

      {/* New Features Layout Section (Screenshot-based) */}
      <Container fluid className="py-5 feature-section App-bg-white">
        <Row className="align-items-center justify-content-center px-3 mb-5">
          <Col md={5} className="text-md-start text-center order-2 order-md-1">
            <Badge bg="primary" className="mb-2">UPDATED</Badge>
            <h4 className="fw-bold">Improved readability in reports</h4>
            <p className="text-secondary">
              Save time by easily viewing key reports with zoom functionality that improves readability.
              Optional printed grid lines also make reports easier to view. Plus, you can use both of
              these features on a specific report without impacting global settings for all reports.
            </p>
          </Col>
          <Col md={5} className="text-center position-relative order-1 order-md-2 mb-4 mb-md-0">
            <div className="green-circle-bg mx-auto">
              <img src={reportImage} alt="Report Feature" className="img-fluid" />
            </div>

          </Col>
        </Row>

        <Row className="align-items-center justify-content-center px-3">
          <Col md={5} className="text-center position-relative mb-4 mb-md-0">
            <div className="green-circle-bg mx-auto">
              <img src={landedCost} alt="Landed Cost" className="img-fluid" />
            </div>

          </Col>
          <Col md={5} className="text-md-start text-center">
            <Badge bg="warning" text="dark" className="mb-2">NEW</Badge>
            <h4 className="fw-bold">Landed cost calculator</h4>
            <p className="text-secondary">
              Help boost your profits by using landed cost and the new built-in calculator to establish
              competitive sales prices.*
            </p>
          </Col>
        </Row>
      </Container>

      {/* Inventory & Reporting Enhancements Section */}
      <Container fluid className="py-5 App-bg-white">
        <Row className="align-items-center justify-content-center px-3 mb-5">
          <Col md={6} className="text-md-start text-center order-1 order-md-1 mb-4 mb-md-0">
            <Badge bg="primary" className="mb-2">UPDATED</Badge>
            <h4 className="fw-bold">Inventory and reporting enhancements*</h4>
            <p className="text-secondary">
              Gain better insight and manage your inventory more effectively by tracking and reporting at more detailed levels.
              Now you can use product expiration dates, lot, and category specifics. Keep track of all inventory reports in the Reports Center.
            </p>
          </Col>
          <Col md={5} className="text-center position-relative order-2 order-md-2">
            <div className="green-circle-bg mx-auto">
              <img src={inventoryReport} alt="Inventory Report" className="img-fluid" />
            </div>
          </Col>
        </Row>

        {/* Improved List Search Section */}
        <Row className="align-items-center justify-content-center px-3">
          <Col md={5} className="text-center position-relative order-1 order-md-1 mb-4 mb-md-0">
            <div className="green-circle-bg mx-auto">
              <img src={listSearch} alt="Improved List Search" className="img-fluid" />
            </div>
          </Col>
          <Col md={6} className="text-md-start text-center order-2 order-md-2">
            <Badge bg="primary" className="mb-2">UPDATED</Badge>
            <h4 className="fw-bold">Improved list search</h4>
            <p className="text-secondary">
              Save time with new find, search, and edit functionality for all lists containing Classes, Price Rules, Payroll Schedules,
              Other Names, Templates, and all Customer and Vendor profiles. Efficiently edit lists with keyword searches.
            </p>
          </Col>
        </Row>
      </Container>

      {/* New Curved CTA Section */}
      <div className="py-4 green-banner text-center">
        <div className="curve-top"></div>
        <Container className="position-relative z-1 py-5">
          <h2 className="fw-bold mb-4">
            Get your all-in-one business solution now: <br />
            zirakBook Desktop Enterprise
          </h2>
          <Button
            variant="dark"
            size="lg"
            as={Link}
            to="/pricing"
          >
            Buy now
          </Button>
          {/* <p className="text-dark small mb-0">
      *Important pricing details and product information
      <span className="ms-2">&#x25BC;</span>
    </p> */}
        </Container>
      </div>



    </>
  );
};

export default NewInterprice;
