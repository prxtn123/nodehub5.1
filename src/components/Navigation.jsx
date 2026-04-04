import React from 'react';
import { Link } from 'react-router-dom';
import './Navigation.css';

/**
 * Shared navigation bar for Praxis GB and node pages
 * Praxis GB wordmark (left) → homepage, "node" link (right) → product page
 */
const Navigation = () => {
  return (
    <nav className="praxis-nav">
      <div className="praxis-nav-content">
        <Link to="/" className="praxis-wordmark">
          Praxis GB
        </Link>
        <Link to="/node" className="praxis-nav-node">
          node
        </Link>
      </div>
    </nav>
  );
};

export default Navigation;
