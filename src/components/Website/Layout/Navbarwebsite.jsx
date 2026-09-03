// src/components/Navbar.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Container, Nav, Button } from "react-bootstrap";
import "./Navbar.css";
import logo from "../../../assets/tab-accounts-logo.png";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="custom-navbar navbar-animate App-bg-white" style={{ position: 'sticky', top: 0, zIndex: 1030 }}>
      {/* Top bar: Logo + Toggle */}
      <Container fluid className="d-flex align-items-center py-3">
        {/* Logo - Left */}
        <Link to="/" className="d-flex align-items-center fw-semibold fs-5 text-decoration-none">
          <img
            src={logo}
            alt="TAB ACCOUNTS Logo"
            width={160}
            height={45}
            className="navbar-logo-img"
            style={{ objectFit: 'contain' }}
          />
        </Link>

        {/* Hamburger - Right */}
        <button
          className="custom-toggle d-lg-none ms-auto"
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
        >
          <div className="custom-hamburger">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>

        {/* Desktop Menu */}
        <div className="d-none d-lg-flex align-items-center gap-4 ms-auto">
          <Nav className="align-items-center gap-4 navbar-nav-links">
            <Nav.Link as={Link} to="/overview" className="nav-link-strong">Home</Nav.Link>
            <Nav.Link as={Link} to="/features" className="nav-link-strong">Features</Nav.Link>
            <Nav.Link as={Link} to="/pricing" className="nav-link-strong">Pricing</Nav.Link>
            <Nav.Link as={Link} to="/aboutus" className="nav-link-strong">About Us</Nav.Link>
            <Nav.Link as={Link} to="/contact" className="nav-link-strong">Contact</Nav.Link>
          </Nav>
          <div className="d-flex gap-2">
            <Button
              as={Link}
              to="/login"
              size="sm"
              className="btn-brand fw-semibold px-4"
            >
              Login
            </Button>
            {/* <Button
              as={Link}
              to="/signup"
              size="sm"
              className="btn-brand-outline fw-semibold px-4"
            >
              Sign Up
            </Button> */}
          </div>
        </div>
      </Container>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="custom-navbar-collapse d-lg-none">
          <Container fluid>
            <Nav className="flex-column gap-3 navbar-nav-mobile py-2">
              <Nav.Link as={Link} to="/overview" className="nav-link-mobile" onClick={() => setIsMenuOpen(false)}>Home</Nav.Link>
              <Nav.Link as={Link} to="/features" className="nav-link-mobile" onClick={() => setIsMenuOpen(false)}>Features</Nav.Link>
              <Nav.Link as={Link} to="/pricing" className="nav-link-mobile" onClick={() => setIsMenuOpen(false)}>Pricing</Nav.Link>
              <Nav.Link as={Link} to="/aboutus" className="nav-link-mobile" onClick={() => setIsMenuOpen(false)}>About Us</Nav.Link>
              <Nav.Link as={Link} to="/contact" className="nav-link-mobile" onClick={() => setIsMenuOpen(false)}>Contact</Nav.Link>
              <div className="d-flex flex-column gap-2 w-100 mt-2">
                <Button
                  as={Link}
                  to="/login"
                  size="sm"
                  className="btn-brand fw-semibold px-4 w-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Button>
                <Button
                  as={Link}
                  to="/signup"
                  size="sm"
                  className="btn-brand-outline fw-semibold px-4 w-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Button>
              </div>
            </Nav>
          </Container>
        </div>
      )}
    </nav>
  );
};

export default Navbar;