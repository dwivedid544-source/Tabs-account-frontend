import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
const abtimg = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80";
import {
  faCheckCircle,
  faLightbulb,
  faShieldAlt,
  faComments,
  faArrowRight,
  faEnvelope,
  faMapMarkerAlt,
  faPhoneAlt,
  faUserShield,
  faUsers,
  faChartLine
} from '@fortawesome/free-solid-svg-icons';
import { faLinkedin, faTwitter, faGithub, faFacebookF, faInstagram } from '@fortawesome/free-brands-svg-icons';

const Aboutus = () => {
  return (
    <div className="min-vh-100 App-bg-white d-flex flex-column">
      {/* About Us Hero Section */}
      <section
        className="container-fluid py-2 py-md-5 overflow-hidden"
        style={{ backgroundColor: 'var(--secondary)' }}
      >
        <div className=" md-5 px-3 px-md-5">
          <div className="row align-items-center ">
            {/* Left Column - Text Content */}
            <div className="col-lg-6 mb-4 mb-lg-0">
              <h2
                className="display-5 fw-bold mb-3 text-center text-md-start"
                style={{ color: 'var(--primary)' }}
              >
                About Us
              </h2>
              <div
                className="w-25 mb-4 mx-auto mx-md-0"
                style={{ height: '2px', backgroundColor: 'var(--primary)' }}
              ></div>

              <p className="mb-4" style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.6' }}>
                At TAB ACCOUNTS, we’re committed to making business management simple, smart, and seamless for companies of all sizes. Since 2018, we’ve empowered businesses with a powerful, intuitive platform that brings together accounting, inventory, sales, and customer management in one unified system.
              </p>
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="d-flex">
                    <div className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style={{ width: '48px', height: '48px', backgroundColor: 'rgba(133, 72, 54, 0.1)' }}>
                      <FontAwesomeIcon icon={faCheckCircle} style={{ color: 'var(--primary)', fontSize: '1.25rem' }} />
                    </div>
                    <div>
                      <h3 className="h5 fw-semibold mb-1" style={{ color: 'var(--primary)' }}>Accuracy</h3>
                      <p className="small mb-0" style={{ color: '#black' }}>Precise financial tracking and error-free reporting for reliable decision-making.</p>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex">
                    <div className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style={{ width: '48px', height: '48px', backgroundColor: 'rgba(133, 72, 54, 0.1)' }}>
                      <FontAwesomeIcon icon={faLightbulb} style={{ color: 'var(--primary)', fontSize: '1.25rem' }} />
                    </div>
                    <div>
                      <h3 className="h5 fw-semibold mb-1" style={{ color: 'var(--primary)' }}>Simplicity</h3>
                      <p className="small mb-0" style={{ color: '#black' }}>A clean, user-friendly interface with intelligent workflows designed for speed and ease.</p>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex">
                    <div className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style={{ width: '48px', height: '48px', backgroundColor: 'rgba(133, 72, 54, 0.1)' }}>
                      <FontAwesomeIcon icon={faShieldAlt} style={{ color: 'var(--primary)', fontSize: '1.25rem' }} />
                    </div>
                    <div>
                      <h3 className="h5 fw-semibold mb-1" style={{ color: 'var(--primary)' }}>Compliance Ready</h3>
                      <p className="small mb-0" style={{ color: 'black' }}>Built-in tools to stay aligned with evolving business standards and regulatory requirements.</p>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex">
                    <div className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style={{ width: '48px', height: '48px', backgroundColor: 'rgba(133, 72, 54, 0.1)' }}>
                      <FontAwesomeIcon icon={faComments} style={{ color: 'var(--primary)', fontSize: '1.25rem' }} />
                    </div>
                    <div>
                      <h3 className="h5 fw-semibold mb-1" style={{ color: 'var(--primary)' }}>Bilingual Support</h3>
                      <p className="small mb-0" style={{ color: 'black' }}>Full support in multiple languages — because your business deserves to grow without language barriers.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Image */}
            <div className="col-lg-6 position-relative">
              <div className="position-relative">
                <img
                  src={abtimg}
                  alt="GST Accounting Dashboard"
                  className="img-fluid rounded shadow-lg w-100"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Team Section */}
      <section className="container-fluid py-4 py-md-5 bg-light"> {/* 👈 container → container-fluid */}
        <div className="px-3 px-md-5"> {/* 👈 mx-3/mx-md-5 → px-3/px-md-5 for full width with padding */}
          <div className="text-center mb-4"> {/* 👈 mb-5 → mb-4 (reduced vertical gap) */}
            <h2 className="display-5 fw-bold mb-2" style={{ color: '#475569' }}>Our Leadership Team</h2> {/* 👈 mb-3 → mb-2 */}
            <div className="w-25 mx-auto mb-3" style={{ height: '2px', backgroundColor: '#475569' }}></div> {/* 👈 mb-4 → mb-3 */}
            <p className="lead mx-auto" style={{ color: '#black', maxWidth: '800px' }}>
              Meet the experienced professionals behind our innovative GST accounting solutions
            </p>
          </div>
          <div className="row g-4 justify-content-center">
            {/* Team Member 1 */}
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="mx-auto mt-3 overflow-hidden" style={{ width: '200px', height: '200px', borderRadius: '50%' }}> {/* 👈 mt-4 → mt-3 */}
                  <img
                    src="https://readdy.ai/api/search-image?query=Professional%20portrait%20of%20a%20confident%20female%20CEO%20in%20her%2040s%20with%20short%20dark%20hair%2C%20wearing%20a%20brown%20business%20suit%20against%20a%20neutral%20background.%20She%20has%20a%20warm%20smile%20and%20professional%20demeanor.%20High%20quality%2C%20corporate%20photography%20style%20with%20soft%20lighting%20and%20shallow%20depth%20of%20field&width=400&height=400&seq=123457&orientation=squarish"
                    alt="Sarah Johnson, CEO"
                    className="img-fluid w-100 h-100 object-fit-cover"
                  />
                </div>
                <div className="card-body text-center py-3"> {/* 👈 Added py-3 for compact vertical padding */}
                  <h3 className="h4 fw-semibold mb-1" style={{ color: '#475569' }}>Sarah Johnson</h3>
                  <p className="fw-medium mb-2" style={{ color: 'black' }}>Chief Executive Officer</p> {/* 👈 mb-3 → mb-2 */}
                  <p className="card-text mb-3" style={{ color: '#475569' }}> {/* 👈 mb-4 → mb-3 */}
                    With over 15 years in financial technology, Sarah leads our vision for simplified tax compliance.
                  </p>
                  <div className="d-flex justify-content-center">
                    <a href="#" className="mx-2 text-decoration-none" style={{ color: '#475569' }}>
                      <FontAwesomeIcon icon={faLinkedin} size="lg" />
                    </a>
                    <a href="#" className="mx-2 text-decoration-none" style={{ color: '#475569' }}>
                      <FontAwesomeIcon icon={faTwitter} size="lg" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
            {/* Team Member 2 */}
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="mx-auto mt-3 overflow-hidden" style={{ width: '200px', height: '200px', borderRadius: '50%' }}> {/* 👈 mt-4 → mt-3 */}
                  <img
                    src="https://readdy.ai/api/search-image?query=Professional%20portrait%20of%20a%20male%20CTO%20in%20his%2030s%20with%20glasses%20and%20short%20beard%2C%20wearing%20a%20brown%20button-up%20shirt%20against%20a%20neutral%20background.%20He%20has%20a%20thoughtful%20expression%20and%20technical%20demeanor.%20High%20quality%2C%20corporate%20photography%20style%20with%20soft%20lighting%20and%20shallow%20depth%20of%20field&width=400&height=400&seq=123458&orientation=squarish"
                    alt="Michael Chen, CTO"
                    className="img-fluid w-100 h-100 object-fit-cover"
                  />
                </div>
                <div className="card-body text-center py-3"> {/* 👈 Added py-3 */}
                  <h3 className="h4 fw-semibold mb-1" style={{ color: '#475569' }}>Michael Chen</h3>
                  <p className="fw-medium mb-2" style={{ color: 'black' }}>Chief Technology Officer</p> {/* 👈 mb-3 → mb-2 */}
                  <p className="card-text mb-3" style={{ color: '#475569' }}> {/* 👈 mb-4 → mb-3 */}
                    Michael's expertise in AI and machine learning drives our innovative approach to tax automation.
                  </p>
                  <div className="d-flex justify-content-center">
                    <a href="#" className="mx-2 text-decoration-none" style={{ color: '#475569' }}>
                      <FontAwesomeIcon icon={faLinkedin} size="lg" />
                    </a>
                    <a href="#" className="mx-2 text-decoration-none" style={{ color: '#475569' }}>
                      <FontAwesomeIcon icon={faGithub} size="lg" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
            {/* Team Member 3 */}
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="mx-auto mt-3 overflow-hidden" style={{ width: '200px', height: '200px', borderRadius: '50%' }}> {/* 👈 mt-4 → mt-3 */}
                  <img
                    src="https://readdy.ai/api/search-image?query=Professional%20portrait%20of%20a%20female%20CFO%20in%20her%2050s%20with%20shoulder-length%20blonde%20hair%2C%20wearing%20a%20brown%20blazer%20against%20a%20neutral%20background.%20She%20has%20a%20confident%20expression%20and%20professional%20demeanor.%20High%20quality%2C%20corporate%20photography%20style%20with%20soft%20lighting%20and%20shallow%20depth%20of%20field&width=400&height=400&seq=123459&orientation=squarish"
                    alt="Amanda Patel, CFO"
                    className="img-fluid w-100 h-100 object-fit-cover"
                  />
                </div>
                <div className="card-body text-center py-3"> {/* 👈 Added py-3 */}
                  <h3 className="h4 fw-semibold mb-1" style={{ color: '#475569' }}>Amanda Patel</h3>
                  <p className="fw-medium mb-2" style={{ color: 'black' }}>Chief Financial Officer</p> {/* 👈 mb-3 → mb-2 */}
                  <p className="card-text mb-3" style={{ color: '#475569' }}> {/* 👈 mb-4 → mb-3 */}
                    Amanda brings 20+ years of accounting expertise, ensuring our solutions meet real-world financial needs.
                  </p>
                  <div className="d-flex justify-content-center">
                    <a href="#" className="mx-2 text-decoration-none" style={{ color: '#475569' }}>
                      <FontAwesomeIcon icon={faLinkedin} size="lg" />
                    </a>
                    <a href="#" className="mx-2 text-decoration-none" style={{ color: '#475569' }}>
                      <FontAwesomeIcon icon={faEnvelope} size="lg" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="container-fluid py-3 py-md-4"> {/* 👈 container → container-fluid, py-md-5 → py-md-4 */}
        <div className="px-3 px-md-5"> {/* 👈 mx-3/mx-md-5 → px-3/px-md-5 for full width with padding */}
          <div className="row align-items-center g-4">
            <div className="col-lg-6 mt-4 mt-lg-5 order-2 order-lg-1"> {/* 👈 mt-5 → mt-4 for mobile */}
              <img
                src="https://readdy.ai/api/search-image?query=A%20modern%20office%20space%20with%20warm%20brown%20tones%20showing%20a%20diverse%20team%20collaborating%20on%20GST%20accounting%20software.%20The%20scene%20shows%20professionals%20working%20together%20at%20a%20conference%20table%20with%20laptops%20and%20financial%20documents.%20The%20office%20has%20wooden%20elements%20and%20warm%20lighting%20with%20colors%20854836%2C%205C3D2E%2C%20and%202D1810.%20Photorealistic%2C%20professional%20corporate%20photography&width=600&height=400&seq=123460&orientation=landscape"
                alt="Our Company Story"
                className="img-fluid rounded shadow-lg w-100"
              />
            </div>
            <div className="col-lg-6 order-1 order-lg-2">
              <div className="text-center text-md-start mx-2">
                <h2
                  className="fw-bold mb-2"
                  style={{ color: '#475569', fontSize: '2.2rem' }}
                >
                  Our Story
                </h2>

                <div
                  className="w-25 mb-3 mx-auto mx-md-0"
                  style={{ height: '2px', backgroundColor: '#475569' }}
                ></div>
              </div>

              <p className="mb-3" style={{ color: 'black', fontSize: '1rem', lineHeight: '1.6' }}> {/* 👈 mb-4 → mb-3 */}
                Founded in 2018, TAB ACCOUNTS was created with one goal: to simplify how businesses manage their finances and inventory — so owners can focus on growth, not paperwork.
              </p>
              <p className="mb-3" style={{ color: 'black', fontSize: '1rem', lineHeight: '1.6' }}> {/* 👈 mb-4 → mb-3 */}
                Our team of software engineers and business automation experts built a platform that brings accounting, inventory, and customer management together — intelligently, accurately, and effortlessly.
              </p>
              <p className="mb-3" style={{ color: 'black', fontSize: '1rem', lineHeight: '1.6' }}> {/* 👈 mb-4 → mb-3 */}
                Today, over 10,000 businesses — from local shops to growing enterprises — rely on TAB ACCOUNTS to streamline operations, reduce manual work, and make smarter decisions with real-time data.
              </p>
              <div className="d-flex flex-column flex-md-row flex-wrap gap-3">
                <div className="p-3 rounded flex-grow-1 text-center text-md-start" style={{ backgroundColor: 'rgba(133, 72, 54, 0.1)' }}>
                  <div className="h4 fw-bold mb-1" style={{ color: '#475569', fontSize: '1.5rem' }}>7+</div>
                  <div className="small App-text-muted" style={{ color: '#475569', fontWeight: '500' }}>Years of Innovation</div>
                </div>
                <div className="p-3 rounded flex-grow-1 text-center text-md-start" style={{ backgroundColor: 'rgba(133, 72, 54, 0.1)' }}>
                  <div className="h4 fw-bold mb-1" style={{ color: '#475569', fontSize: '1.5rem' }}>10,000+</div>
                  <div className="small App-text-muted" style={{ color: '#475569', fontWeight: '500' }}>Businesses Empowered</div>
                </div>
                <div className="p-3 rounded flex-grow-1 text-center text-md-start" style={{ backgroundColor: 'rgba(133, 72, 54, 0.1)' }}>
                  <div className="h4 fw-bold mb-1" style={{ color: '#475569', fontSize: '1.5rem' }}>98%</div>
                  <div className="small App-text-muted" style={{ color: '#475569', fontWeight: '500' }}>User Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Values Section */}
      <section className="py-3 py-md-4 mb-2" style={{ backgroundColor: '#475569' }}> {/* 👈 py-md-5 → py-md-4 */}
        <div className="container px-3 px-md-4">
          <div className="text-center mb-4"> {/* 👈 mb-5 → mb-4 */}
            <h2 className="display-5 fw-bold text-white">Our Core Values</h2>
            <p className="lead text-white opacity-90">The principles that guide everything we do</p>
          </div>
          <div className="row g-3"> {/* 👈 g-4 → g-3 — card gap reduced */}
            {[
              {
                icon: faUserShield,
                title: "Integrity",
                points: [
                  "Highest standards of honesty",
                  "Transparent operations",
                  "Strong ethical practices"
                ]
              },
              {
                icon: faLightbulb,
                title: "Innovation",
                points: [
                  "Continuous product improvement",
                  "Modern tax tools",
                  "Automation-first mindset"
                ]
              },
              {
                icon: faUsers,
                title: "Customer Focus",
                points: [
                  "Client success is our priority",
                  "Tailored software solutions",
                  "24/7 support"
                ]
              },
              {
                icon: faChartLine,
                title: "Excellence",
                points: [
                  "Best-in-class performance",
                  "Reliable infrastructure",
                  "Dedicated team"
                ]
              }
            ].map((card, index) => (
              <div key={index} className="col-12 col-md-6 col-lg-3">
                <div
                  className="p-3 p-md-4 rounded-4 h-100 shadow-sm" /* 👈 p-4 → p-3 for mobile */
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.15)'
                  }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto rounded-circle"
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      border: '2px solid rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    <FontAwesomeIcon icon={card.icon} className="text-white" />
                  </div>
                  <h5 className="fw-bold text-white text-center mb-2">{card.title}</h5> {/* 👈 mb-3 → mb-2 */}
                  <ul className="list-unstyled ps-2 mb-0" style={{ color: '#e2e8f0' }}> {/* 👈 Added mb-0 */}
                    {card.points.map((pt, i) => (
                      <li key={i} className="mb-1 d-flex align-items-start"> {/* 👈 mb-2 → mb-1 */}
                        <FontAwesomeIcon icon={faCheckCircle} className="me-2 mt-1 flex-shrink-0" style={{ width: '16px' }} />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Aboutus;