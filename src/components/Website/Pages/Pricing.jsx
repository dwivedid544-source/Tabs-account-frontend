import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Modal,
  Form,
  InputGroup,
  Spinner,
  Alert,
} from "react-bootstrap";
import { FaCheck, FaCrown, FaPhoneAlt } from "react-icons/fa";
import AOS from "aos";
import "aos/dist/aos.css";
import "./Pages.css";
import axiosInstance from "../../../api/axiosInstance";
import GetCompanyId from "../../../api/GetCompanyId";
import toast from "react-hot-toast";

const Pricing = () => {
  const companyId = GetCompanyId(); // Get the company ID
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false); // New state for form submission

  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingDuration, setBillingDuration] = useState("Yearly");
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    startDate: "",
    phone: "",
    address: "",
  });
  const [logoFile, setLogoFile] = useState(null);

  // ✅ Helper: Calculate total monthly price (base + modules)
  const calculateTotalMonthlyPrice = (basePrice, modules = []) => {
    const base = parseFloat(basePrice) || 0;
    const moduleTotal = (modules || []).reduce((sum, mod) => {
      return sum + (parseFloat(mod.module_price) || 0); // Fixed: use module_price instead of price
    }, 0);
    return base + moduleTotal;
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setError(null);
        setLoading(true);
        const response = await axiosInstance.get('plans');

        const apiPlans = Array.isArray(response.data) ? response.data :
          (response.data && response.data.data) ? response.data.data : [];

        const mappedPlans = apiPlans.map((plan) => {
          const basePrice = parseFloat(plan.basePrice) || 0;
          const totalPrice = plan.totalPrice || basePrice;
          const currency = plan.currency || "USD";

          const nameLower = (plan.name || "").toLowerCase();
          let buttonColor = "#1e293b";
          if (nameLower.includes("basic") || nameLower.includes("bronze")) buttonColor = "#cd7f32";
          else if (nameLower.includes("silver")) buttonColor = "#c0c0c0";
          else if (nameLower.includes("gold") || nameLower.includes("pro")) buttonColor = "#ffc107";
          else if (nameLower.includes("platinum")) buttonColor = "#e5e4e2";

          const featuresList = [];

          // Limits
          featuresList.push({ text: `Invoice Limit: ${plan.invoiceLimit || "Standard"}`, isLimit: true });
          featuresList.push({ text: `User Limit: ${plan.userLimit || "Standard"}`, isLimit: true });
          featuresList.push({ text: `Storage: ${plan.storageCapacity || "Standard"}`, isLimit: true });

          // Descriptions/Bullet points
          if (Array.isArray(plan.descriptions)) {
            plan.descriptions.forEach(desc => {
              if (desc && desc.trim()) featuresList.push({ text: desc, isPoint: true });
            });
          }

          // Modules
          const moduleList = [];
          if (Array.isArray(plan.modules)) {
            plan.modules.forEach((mod) => {
              moduleList.push({
                name: mod.name || mod.module_name,
                enabled: mod.enabled !== false,
                price: mod.price
              });
            });
          }

          return {
            id: plan.id,
            name: plan.name,
            totalPrice,
            basePrice,
            currency,
            duration: plan.billingCycle || "Monthly",
            buttonColor,
            btnText: `Get ${plan.name}`,
            features: featuresList,
            modules: moduleList
          };
        });

        setPlans(mappedPlans);
      } catch (err) {
        console.error("API Error:", err);
        setError("Failed to load pricing plans.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
    AOS.init({ duration: 1000 });
  }, []);

  // --- Helper Functions ---
  const calculatePrice = () => {
    if (!selectedPlan) return 0;
    return billingDuration === "Monthly"
      ? Math.round(selectedPlan.price / 12)
      : selectedPlan.price;
  };

  const handleBuyClick = (plan) => {
    setSelectedPlan(plan);
    // Use the plan's own duration (billing cycle) instead of hardcoded logic
    setBillingDuration(plan.duration || "Monthly");
    setShowModal(true);
  };

  const handleDurationChange = (e) => setBillingDuration(e.target.value);
  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Updated handleSubmit function to make API call
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('companyName', formData.companyName);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('address', formData.address);
      data.append('planId', selectedPlan.id);
      data.append('planName', selectedPlan.name);
      data.append('billingCycle', billingDuration);
      data.append('startDate', formData.startDate);
      if (logoFile) {
        data.append('logo', logoFile);
      }

      // Make API call to request plan
      const response = await axiosInstance.post('/plan-requests', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data) {
        toast.success("Plan request submitted successfully! We'll contact you shortly.");
        handleCloseModal();
      } else {
        toast.error("Failed to submit plan request. Please try again.");
      }
    } catch (err) {
      console.error("API Error:", err);
      toast.error(err.response?.data?.error || "An error occurred while submitting your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPlan(null);
    setFormData({ companyName: "", email: "", startDate: "", phone: "", address: "" });
    setLogoFile(null);
  };

  // --- UI Rendering ---
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Loading pricing plans...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger" className="text-center">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <div className="py-3" style={{ background: "#fff" }}>
      <Container>
        <Row className="justify-content-center my-4">
          {plans.map((plan, idx) => (
            <Col
              md={6}
              lg={4}
              key={idx}
              className="mb-4"
              data-aos="zoom-in"
              data-aos-delay={idx * 150}
            >
              <div
                className="border rounded p-4 h-100 shadow-sm position-relative"
                style={{
                  backgroundColor: "#fff",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
                }}
              >
                {/* Crown + Plan Name */}
                <div className="text-center mb-3">
                  <FaCrown size={28} style={{ color: plan.buttonColor }} className="mb-2" />
                  <h4 className="fw-bold mb-1">{plan.name}</h4>
                  <div className="d-flex align-items-center justify-content-center gap-1 mt-2">
                    <span className="h3 fw-bold mb-0">{plan.currency === 'EUR' ? '€' : plan.currency === 'USD' ? '$' : plan.currency}</span>
                    <span className="display-5 fw-bold mb-0">{plan.totalPrice}</span>
                  </div>
                  <small className="App-text-muted d-block mt-1">{plan.duration}</small>
                </div>

                {/* Buy Button */}
                <div className="d-grid gap-2 mb-4">
                  <Button
                    style={{
                      backgroundColor: plan.buttonColor,
                      border: "none",
                      borderRadius: "12px",
                      fontWeight: "700",
                      padding: "0.8rem 1rem",
                      fontSize: "16px",
                      boxShadow: `0 4px 10px ${plan.buttonColor}40`
                    }}
                    onClick={() => handleBuyClick(plan)}
                  >
                    {plan.btnText}
                  </Button>
                </div>

                {/* Plan Highlights */}
                <div className="mb-4">
                  <h6 className="fw-bold small text-uppercase App-text-muted mb-3">Plan Details</h6>
                  <ul className="list-unstyled mb-0">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="d-flex align-items-center mb-2">
                        <FaCheck className="App-text-success me-2 flex-shrink-0" size={14} />
                        <span className={feat.isLimit ? "fw-bold" : ""}>{feat.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Modules Status */}
                <div>
                  <h6 className="fw-bold small text-uppercase App-text-muted mb-3">Modules</h6>
                  <ul className="list-unstyled mb-0">
                    {plan.modules.map((mod, i) => (
                      <li key={i} className="d-flex align-items-center mb-2" style={{ opacity: mod.enabled ? 1 : 0.5 }}>
                        <div className={`me-2 rounded-circle d-flex align-items-center justify-content-center ${mod.enabled ? 'bg-success' : 'bg-secondary'}`} style={{ width: '18px', height: '18px' }}>
                          {mod.enabled ? <FaCheck color="white" size={10} /> : <span style={{ color: 'white', fontSize: '12px' }}>×</span>}
                        </div>
                        <span className={mod.enabled ? "text-dark" : "App-text-muted text-decoration-line-through"}>
                          {mod.name} {mod.price > 0 && mod.enabled ? `(+${mod.price})` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Col>
          ))}

          {/* Enterprise Plan */}
          {/* <Col md={12} lg={4} className="mb-4" data-aos="fade-left" data-aos-delay="650">
            <div
              className="border rounded p-4 h-100 shadow-lg position-relative"
              style={{
                backgroundColor: "#ffffff",
                borderLeft: "8px solid #2b2e4a",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
              }}
            >
              <div className="text-center mb-3">
                <FaPhoneAlt size={20} className="text-dark mb-2" />
                <h5 className="fw-bold text-dark mt-2 mb-1">Enterprise Version</h5>
                <p className="App-text-muted mb-2" style={{ fontSize: "0.95rem" }}>
                  Tailored solutions. High volume access. Premium support.
                </p>
              </div>
              <div className="d-grid">
                <a
                  href="tel:+919999999999"
                  className="btn btn-sm"
                  style={{
                    backgroundColor: "#2b2e4a",
                    color: "#ffffff",
                    fontWeight: "600",
                    padding: "0.5rem 1.2rem",
                    fontSize: "14px",
                    borderRadius: "30px",
                    textAlign: "center",
                  }}
                >
                  <FaPhoneAlt className="me-2" /> Contact Sales
                </a>
              </div>
            </div>
          </Col> */}
        </Row>

        <hr data-aos="fade-in" />
        <div className="mt-4 text-center" data-aos="fade-right">
          <p className="App-text-muted">
            For custom plans, call:{" "}
            <a href="tel:+919999999999" className="App-text-primary">
              +91-99999-99999
            </a>
          </p>
        </div>
      </Container>

      {/* Purchase Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="md" centered>
        <Modal.Header closeButton>
          <Modal.Title>Complete Your Purchase</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPlan && (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Selected Plan</Form.Label>
                <Form.Control value={selectedPlan.name} disabled />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Company Name</Form.Label>
                <Form.Control
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Email Address</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter Contact Number"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter Company Address"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Company Logo</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files[0])}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Billing Duration</Form.Label>
                <div>
                  <Form.Check
                    inline
                    type="radio"
                    label="Monthly"
                    name="billingDuration"
                    value="Monthly"
                    checked={billingDuration === "Monthly"}
                    onChange={handleDurationChange}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label="Yearly"
                    name="billingDuration"
                    value="Yearly"
                    checked={billingDuration === "Yearly"}
                    onChange={handleDurationChange}
                  />
                </div>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
              <Button
                type="submit"
                style={{
                  backgroundColor: selectedPlan.buttonColor,
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  width: "100%",
                  padding: "0.75rem 1rem",
                }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Submitting...
                  </>
                ) : (
                  "Confirm Purchase"
                )}
              </Button>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Pricing;