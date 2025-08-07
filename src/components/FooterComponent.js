import React from 'react';
import { Link } from 'react-router-dom';

const FooterComponent = () => {
  return (
    <footer className="footer mt-5">
      <div className="container footer-content">
        <div className="row">
          {/* Hotel Information */}
          <div className="col-lg-3 col-md-6 mb-4">
            <h5>Luxury Hotel</h5>
            <p>Experience the finest hospitality with world-class amenities and exceptional service in the heart of the city.</p>
            <div className="footer-social">
              <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="https://twitter.com" aria-label="Twitter" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="https://linkedin.com" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-lg-3 col-md-6 mb-4">
            <h5>Quick Links</h5>
            <ul className="list-unstyled">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/rooms">Rooms & Suites</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/services">Services</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div className="col-lg-3 col-md-6 mb-4">
            <h5>Services</h5>
            <ul className="list-unstyled">
              <li><a href="javascript:void(0)">Room Service</a></li>
              <li><a href="javascript:void(0)">Spa & Wellness</a></li>
              <li><a href="javascript:void(0)">Fine Dining</a></li>
              <li><a href="javascript:void(0)">Event Planning</a></li>
              <li><a href="javascript:void(0)">Business Center</a></li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="col-lg-3 col-md-6 mb-4">
            <h5>Contact Info</h5>
            <ul className="footer-contact-info">
              <li>123 Luxury Avenue, City Center</li>
              <li>+1 (555) 123-4567</li>
              <li>nestbook.mail@gmail.com</li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="footer-bottom">
          <p>&copy; 2024 Luxury Hotel. All rights reserved. | Privacy Policy | Terms of Service</p>
        </div>
      </div>
    </footer>
  );
};

export default FooterComponent;
