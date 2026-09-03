import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaWhatsapp
} from "react-icons/fa";
import { motion } from "framer-motion";
import logoziratech from "../../../assets/tab-accounts-logo.png";
import "./Footer.css";

/* ===== Motion Variants ===== */
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.1, delayChildren: 0.3, duration: 0.5 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function Footer() {
  return (
    <motion.footer
      className="site-footer"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <motion.div variants={containerVariants} className="footer-content">
        <Container className="py-5">
          <Row className="gy-4">
            {/* Brand Section */}
            <Col lg={4} md={6}>
              <motion.div variants={itemVariants} className="footer-brand-section">
                <div className="footer-logo-container App-bg-white p-2 rounded mb-3 d-inline-block">
                  <img
                    src={logoziratech}
                    alt="ZirakBook Logo"
                    height="40"
                    className="footer-logo"
                  />
                </div>
                <p className="footer-description">
                  Complete business management solution for accounts, inventory, and financial control.
                </p>
              </motion.div>
            </Col>

            {/* Quick Links Section */}
            <Col lg={4} md={3}>
              <motion.div variants={itemVariants}>
                <h6 className="footer-heading-underline mb-4">Quick Links</h6>
                <ul className="footer-list p-0">
                  <li className="mb-2">
                    <Link to="/aboutus" className="footer-link">About Us</Link>
                  </li>
                  <li className="mb-2">
                    <Link to="/features" className="footer-link">Features</Link>
                  </li>
                  <li className="mb-2">
                    <Link to="/pricing" className="footer-link">Pricing</Link>
                  </li>
                  <li className="mb-2">
                    <Link to="/overview#faq-section" className="footer-link">FAQ</Link>
                  </li>
                </ul>
              </motion.div>
            </Col>

            {/* Follow Section */}
            <Col lg={4} md={3}>
              <motion.div variants={itemVariants}>
                <h6 className="footer-heading-underline mb-4">Follow</h6>
                <div className="footer-social-icons d-flex gap-3 mt-3">
                  <a href="#" className="social-icon facebook"><FaFacebookF /></a>
                  <a href="#" className="social-icon twitter"><FaTwitter /></a>
                  <a href="#" className="social-icon instagram"><FaInstagram /></a>
                  <a href="#" className="social-icon whatsapp"><FaWhatsapp /></a>
                </div>
              </motion.div>
            </Col>
          </Row>

          <hr className="footer-divider-line mt-5 mb-4" />

          {/* Bottom Bar */}
          <Row className="footer-bottom-bar align-items-center">
            <Col md={6} className="text-center text-md-start mb-3 mb-md-0">
              <p className="copyright-text m-0">
                © 2026 TAB ACCOUNTS. All rights reserved.
              </p>
            </Col>
            <Col md={6} className="text-center text-md-end">
              <div className="legal-links App-text-muted">
                <Link to="/privacy-policy" className="legal-link">Privacy Policy</Link>
                <span className="mx-2">|</span>
                <Link to="/terms-conditions" className="legal-link">Terms & Conditions</Link>
              </div>
            </Col>
          </Row>
        </Container>
      </motion.div>
    </motion.footer>
  );
}
