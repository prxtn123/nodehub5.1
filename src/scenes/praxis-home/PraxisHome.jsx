import React from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../../components/Navigation';
import './PraxisHome.css';

/**
 * Praxis GB Ltd — Company Homepage
 * Computer vision built for British industry
 */
const PraxisHome = () => {
  return (
    <div className="praxis-home">
      <Navigation />

      {/* Hero Section */}
      <section className="praxis-hero">
        <div className="praxis-hero-content">
          <h1 className="praxis-hero-title">
            Computer Vision Built for British Industry
          </h1>
          <p className="praxis-hero-subtitle">
            Praxis GB develops edge-deployed AI products that detect risk, protect people,
            and require zero technical expertise from the customer.
          </p>
          <Link to="/node" className="praxis-cta">
            See node →
          </Link>
        </div>
      </section>

      {/* What We Do */}
      <section className="praxis-section">
        <div className="praxis-container">
          <h2 className="praxis-section-title">What We Do</h2>
          <p className="praxis-text-large">
            Praxis GB builds computer vision products that run on-site, on our hardware,
            with no cloud dependency required. We train the models, manage the infrastructure,
            and hand customers a working system. Our products detect what cameras see — people,
            vehicles, PPE, behaviour — and turn that into evidence and action.
          </p>
        </div>
      </section>

      {/* Why Praxis GB */}
      <section className="praxis-section praxis-section-dark">
        <div className="praxis-container">
          <h2 className="praxis-section-title">Why Praxis GB</h2>
          <div className="praxis-benefits-grid">
            <div className="praxis-benefit-card">
              <div className="praxis-benefit-icon">🇬🇧</div>
              <h3 className="praxis-benefit-title">British-built and supported</h3>
              <p className="praxis-benefit-text">
                Designed for UK warehousing and logistics, not retrofitted from US enterprise software
              </p>
            </div>

            <div className="praxis-benefit-card">
              <div className="praxis-benefit-icon">⚡</div>
              <h3 className="praxis-benefit-title">Edge-deployed</h3>
              <p className="praxis-benefit-text">
                Processing happens on-site, not in the cloud. Footage never leaves your building
                unless an incident occurs
              </p>
            </div>

            <div className="praxis-benefit-card">
              <div className="praxis-benefit-icon">🛠️</div>
              <h3 className="praxis-benefit-title">No IT burden</h3>
              <p className="praxis-benefit-text">
                We own the hardware, manage the system, and keep it running. Your team just uses it
              </p>
            </div>

            <div className="praxis-benefit-card">
              <div className="praxis-benefit-icon">💷</div>
              <h3 className="praxis-benefit-title">Transparent pricing</h3>
              <p className="praxis-benefit-text">
                No custom quotes, no hidden costs. One installation fee, one monthly subscription
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Products */}
      <section className="praxis-section">
        <div className="praxis-container">
          <h2 className="praxis-section-title">Our Products</h2>
          <div className="praxis-products-grid">
            <div className="praxis-product-card praxis-product-card-featured">
              <div className="praxis-product-badge">Flagship Product</div>
              <h3 className="praxis-product-title">node</h3>
              <p className="praxis-product-description">
                AI-powered warehouse safety incident monitoring. Detects high-risk events in
                real-time: MHE proximity violations, missing PPE, walkway hazards, and more.
                Deployed on-site with zero cloud dependency.
              </p>
              <div className="praxis-product-stats">
                <div className="praxis-product-stat">
                  <span className="praxis-product-stat-value">24/7</span>
                  <span className="praxis-product-stat-label">Monitoring</span>
                </div>
                <div className="praxis-product-stat">
                  <span className="praxis-product-stat-value">&lt;1s</span>
                  <span className="praxis-product-stat-label">Detection</span>
                </div>
                <div className="praxis-product-stat">
                  <span className="praxis-product-stat-value">100%</span>
                  <span className="praxis-product-stat-label">On-Premise</span>
                </div>
              </div>
              <Link to="/node" className="praxis-product-link">
                Learn more →
              </Link>
            </div>

            <div className="praxis-product-card praxis-product-card-placeholder">
              <div className="praxis-product-placeholder-content">
                <div className="praxis-product-placeholder-icon">🚀</div>
                <p className="praxis-product-placeholder-text">More products coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Work With */}
      <section className="praxis-section praxis-section-dark">
        <div className="praxis-container">
          <h2 className="praxis-section-title">Who We Work With</h2>
          <p className="praxis-text-large">
            Logistics operators, third-party warehousing companies, distribution centres,
            and UK manufacturers who need affordable, effective safety technology that works
            in real environments.
          </p>
        </div>
      </section>

      {/* About / Founder Note */}
      <section className="praxis-section">
        <div className="praxis-container praxis-container-narrow">
          <h2 className="praxis-section-title">About</h2>
          <p className="praxis-text-large">
            Praxis GB was founded in Greater Manchester to solve a problem the founders saw
            firsthand — safety incidents in busy warehouses that were entirely preventable,
            and no affordable technology to stop them. We're building the tools we wish existed.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="praxis-footer">
        <div className="praxis-container">
          <div className="praxis-footer-content">
            <div className="praxis-footer-section">
              <h3 className="praxis-footer-title">Praxis GB Ltd</h3>
              <p className="praxis-footer-text">Greater Manchester, United Kingdom</p>
            </div>
            <div className="praxis-footer-section">
              <h3 className="praxis-footer-title">Products</h3>
              <Link to="/node" className="praxis-footer-link">node</Link>
            </div>
            <div className="praxis-footer-section">
              <h3 className="praxis-footer-title">Contact</h3>
              <p className="praxis-footer-text">info@praxisgb.com</p>
            </div>
          </div>
          <div className="praxis-footer-bottom">
            <p className="praxis-footer-copyright">© {new Date().getFullYear()} Praxis GB Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PraxisHome;
