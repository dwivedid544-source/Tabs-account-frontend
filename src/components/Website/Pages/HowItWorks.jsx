import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faUserShield,
  faTasks,
  faFileInvoiceDollar
} from '@fortawesome/free-solid-svg-icons';

const HowItWorks = () => {
  return (
    <div className="min-vh-100  App-bg-white py-5 px-4" style={{ minHeight: '1024px' }}>
      <div className="p-5">
        {/* Header Section */}
        <div className="text-center mb-5">
          <h1 className="display-4 font-weight-bold mb-4" style={{ color: 'var(--text-main)' }}>How It Works</h1>
          <p className="lead mx-auto" style={{ color: 'var(--text-muted)', maxWidth: '800px' }}>
            Our streamlined 3-step process makes managing your business finances simple and efficient
          </p>
        </div>

        {/* Process Steps */}
        <div className="p-5">
          <div className="row gy-5 justify-content-center">
            {/* Step 1 */}
            <div className="col-12 col-md-4 d-flex">
              <div className="d-flex flex-column align-items-center text-center w-100">
                <div className="position-relative mb-4">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: '192px',
                      height: '192px',
                      backgroundColor: 'var(--secondary)',
                    }}
                  >
                    <div
                      className="rounded-circle overflow-hidden"
                      style={{ width: '160px', height: '160px' }}
                    >
                      <img
                        src="https://readdy.ai/api/search-image?query=A%20stylish%20form%20or%20document%20with%20a%20prominent%20checkmark%2C%20minimalist%20design%20with%20warm%20brown%20tones%2C%20professional%20business%20context%2C%20clean%20and%20modern%20illustration%20style%2C%20perfect%20for%20sign-up%20process%20visualization%2C%20simple%20background&width=400&height=400&seq=1&orientation=squarish"
                        alt="Sign Up"
                        className="w-100 h-100 object-fit-cover"
                      />
                    </div>
                  </div>
                  <div
                    className="position-absolute top-0 end-0 rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: 'var(--primary)',
                      transform: 'translate(25%, -25%)',
                    }}
                  >
                    <span
                      className="text-white fw-bold"
                      style={{ fontSize: '1.5rem' }}
                    >
                      1
                    </span>
                  </div>
                </div>
                <h2 className="h4 fw-bold mb-3" style={{ color: 'var(--text-main)' }}>
                  Sign Up
                </h2>
                <p className="text-center px-2" style={{ color: 'var(--text-muted)', maxWidth: '350px' }}>
                  Create your account in minutes. Our simple registration process gets you started quickly with just basic information about your business.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="col-12 col-md-4 d-flex">
              <div className="d-flex flex-column align-items-center text-center w-100">
                <div className="position-relative mb-4">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: '192px',
                      height: '192px',
                      backgroundColor: 'var(--secondary)',
                    }}
                  >
                    <div
                      className="rounded-circle overflow-hidden"
                      style={{ width: '160px', height: '160px' }}
                    >
                      <img
                        src="https://readdy.ai/api/search-image?query=Business%20profile%20cards%20and%20item%20list%20icons%20arranged%20neatly%2C%20warm%20brown%20color%20palette%2C%20professional%20business%20context%2C%20clean%20modern%20illustration%20style%2C%20minimalist%20design%20showing%20client%20management%20and%20inventory%2C%20simple%20background&width=400&height=400&seq=2&orientation=squarish"
                        alt="Add Clients & Items"
                        className="w-100 h-100 object-fit-cover"
                      />
                    </div>
                  </div>
                  <div
                    className="position-absolute top-0 end-0 rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: 'var(--primary)',
                      transform: 'translate(25%, -25%)',
                    }}
                  >
                    <span
                      className="text-white fw-bold"
                      style={{ fontSize: '1.5rem' }}
                    >
                      2
                    </span>
                  </div>
                </div>
                <h2 className="h4 fw-bold mb-3" style={{ color: 'var(--text-main)' }}>
                  Add Clients & Items
                </h2>
                <p className="text-center px-2" style={{ color: 'var(--text-muted)', maxWidth: '350px' }}>
                  Easily add your clients and inventory items to the system. Organize your business contacts and products in one centralized location.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="col-12 col-md-4 d-flex">
              <div className="d-flex flex-column align-items-center text-center w-100">
                <div className="position-relative mb-4">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: '192px',
                      height: '192px',
                      backgroundColor: 'var(--secondary)',
                    }}
                  >
                    <div
                      className="rounded-circle overflow-hidden"
                      style={{ width: '160px', height: '160px' }}
                    >
                      <img
                        src="https://readdy.ai/api/search-image?query=Professional%20invoice%20with%20GST%20calculation%20and%20filing%20symbols%2C%20calculator%20and%20financial%20documents%2C%20warm%20brown%20color%20palette%2C%20business%20accounting%20visualization%2C%20clean%20modern%20illustration%20style%2C%20simple%20background&width=400&height=400&seq=3&orientation=squarish"
                        alt="Start Billing & GST Filing"
                        className="w-100 h-100 object-fit-cover"
                      />
                    </div>
                  </div>
                  <div
                    className="position-absolute top-0 end-0 rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: 'var(--primary)',
                      transform: 'translate(25%, -25%)',
                    }}
                  >
                    <span
                      className="text-white fw-bold"
                      style={{ fontSize: '1.5rem' }}
                    >
                      3
                    </span>
                  </div>
                </div>
                <h2 className="h4 fw-bold mb-3" style={{ color: 'var(--text-main)' }}>
                  Start Billing & GST Filing
                </h2>
                <p className="text-center px-2" style={{ color: 'var(--text-muted)', maxWidth: '350px' }}>
                  Generate professional invoices and manage your GST filings with ease. Our automated system handles calculations and compliance for you.
                </p>
              </div>
            </div>
          </div>
        </div>




      </div>
    </div>
  );
}

export default HowItWorks;