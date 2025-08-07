import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { MyContext } from "../Context";
export default function NavbarComponent() {
  const context = useContext(MyContext);

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm">
        <div className="container">
          <Link className="navbar-brand font-weight-bold" to="/">
            🏨 BookNest
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <Link to="/" className="nav-link">
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/rooms" className="nav-link">
                  Rooms
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/about" className="nav-link">
                  About
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/contact" className="nav-link">
                  Contact
                </Link>
              </li>
              {context.isUserAuthenticated ? (
                <>
                  <li className="nav-item">
                    <Link to="/profile" className="nav-link">
                      <i className="fas fa-user me-1"></i>
                      Profile
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      to="/"
                      className="nav-link"
                      role="button"
                      onClick={context.logout}
                    >
                      Logout
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link to="/login" className="nav-link">
                      Login
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/register" className="nav-link btn btn-outline-primary ms-2 px-3">
                      Register
                    </Link>
                  </li>
                </>
              )}
              {context.canAccessManagement() && context.isUserAuthenticated ? (
                <li className="nav-item">
                  <Link to="/dashboard" className="nav-link">
                    Dashboard
                  </Link>
                </li>
              ) : (
                ""
              )}
            </ul>
          </div>
        </div>
      </nav>
      <div className="container">
        <div className="row justify-content-center pt-3">
        <p className="success-message font-weight-bold" id="common-message"></p>
      </div>
    </div>
    </>
    
  );
}
