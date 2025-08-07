import React from 'react';
import { Link } from 'react-router-dom';

const AboutPage = () => {
  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container">
          <div className="row align-items-center min-vh-75">
            <div className="col-lg-6">
              <h1 className="display-4 fw-bold text-primary mb-4">
                Welcome to BookNest
              </h1>
              <p className="lead mb-4">
                Experience luxury, comfort, and exceptional service in the heart of the city. 
                BookNest has been providing world-class hospitality for over two decades.
              </p>
              <div className="d-flex gap-3">
                <Link to="/rooms" className="btn btn-primary btn-lg">
                  Explore Rooms
                </Link>
                <Link to="/contact" className="btn btn-outline-primary btn-lg">
                  Contact Us
                </Link>
              </div>
            </div>
            <div className="col-lg-6">
              <img 
                src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&crop=center"
                alt="BookNest Exterior"
                className="img-fluid rounded shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mx-auto text-center">
              <h2 className="h1 mb-4">Our Story</h2>
              <p className="lead">
                Founded in 2001, BookNest began as a vision to create a sanctuary where 
                travelers could experience the perfect blend of luxury and comfort. Over the 
                years, we have grown to become one of the most prestigious hotels in the region.
              </p>
            </div>
          </div>
          
          <div className="row mt-5">
            <div className="col-md-4 mb-4">
              <div className="text-center">
                <div className="feature-icon mb-3">
                  <i className="fas fa-award fa-3x text-primary"></i>
                </div>
                <h4>Award Winning</h4>
                <p>Recognized for excellence in hospitality and service quality.</p>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="text-center">
                <div className="feature-icon mb-3">
                  <i className="fas fa-users fa-3x text-primary"></i>
                </div>
                <h4>Expert Team</h4>
                <p>Professional staff dedicated to making your stay memorable.</p>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="text-center">
                <div className="feature-icon mb-3">
                  <i className="fas fa-leaf fa-3x text-primary"></i>
                </div>
                <h4>Eco-Friendly</h4>
                <p>Committed to sustainable practices and environmental responsibility.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="row text-center">
            <div className="col-md-3 mb-4">
              <div className="stat-item">
                <h3 className="display-4 text-primary fw-bold">150+</h3>
                <p className="text-muted">Luxury Rooms</p>
              </div>
            </div>
            <div className="col-md-3 mb-4">
              <div className="stat-item">
                <h3 className="display-4 text-primary fw-bold">50k+</h3>
                <p className="text-muted">Happy Guests</p>
              </div>
            </div>
            <div className="col-md-3 mb-4">
              <div className="stat-item">
                <h3 className="display-4 text-primary fw-bold">25+</h3>
                <p className="text-muted">Countries Served</p>
              </div>
            </div>
            <div className="col-md-3 mb-4">
              <div className="stat-item">
                <h3 className="display-4 text-primary fw-bold">24/7</h3>
                <p className="text-muted">Customer Service</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-6 mb-4">
              <div className="card h-100 border-0 shadow">
                <div className="card-body p-4">
                  <div className="text-center mb-3">
                    <i className="fas fa-bullseye fa-3x text-primary"></i>
                  </div>
                  <h3 className="text-center mb-3">Our Mission</h3>
                  <p className="text-center">
                    To provide exceptional hospitality experiences that exceed our guests' 
                    expectations while maintaining the highest standards of service, comfort, 
                    and luxury in every interaction.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-lg-6 mb-4">
              <div className="card h-100 border-0 shadow">
                <div className="card-body p-4">
                  <div className="text-center mb-3">
                    <i className="fas fa-eye fa-3x text-primary"></i>
                  </div>
                  <h3 className="text-center mb-3">Our Vision</h3>
                  <p className="text-center">
                    To be the leading hotel destination recognized globally for innovation, 
                    sustainability, and creating unforgettable memories for our guests 
                    from around the world.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="h1">Meet Our Team</h2>
            <p className="lead">The passionate people behind your exceptional experience</p>
          </div>
          
          <div className="row">
            <div className="col-lg-3 col-md-6 mb-4">
              <div className="team-card text-center">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"
                  alt="Team Member"
                  className="rounded-circle mb-3"
                  style={{width: '150px', height: '150px', objectFit: 'cover'}}
                />
                <h5>John Smith</h5>
                <p className="text-muted">General Manager</p>
                <div className="social-links">
                  <a href="#" className="me-2"><i className="fab fa-linkedin"></i></a>
                  <a href="#" className="me-2"><i className="fab fa-twitter"></i></a>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6 mb-4">
              <div className="team-card text-center">
                <img 
                  src="https://randomuser.me/api/portraits/women/68.jpg"
                  alt="Sarah Johnson - Head of Operations"
                  className="rounded-circle mb-3"
                  style={{width: '150px', height: '150px', objectFit: 'cover'}}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/150x150/007bff/ffffff?text=SJ';
                  }}
                />
                <h5>Sarah Johnson</h5>
                <p className="text-muted">Head of Operations</p>
                <div className="social-links">
                  <a href="#" className="me-2"><i className="fab fa-linkedin"></i></a>
                  <a href="#" className="me-2"><i className="fab fa-twitter"></i></a>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6 mb-4">
              <div className="team-card text-center">
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face"
                  alt="Team Member"
                  className="rounded-circle mb-3"
                  style={{width: '150px', height: '150px', objectFit: 'cover'}}
                />
                <h5>Michael Chen</h5>
                <p className="text-muted">Executive Chef</p>
                <div className="social-links">
                  <a href="#" className="me-2"><i className="fab fa-linkedin"></i></a>
                  <a href="#" className="me-2"><i className="fab fa-twitter"></i></a>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6 mb-4">
              <div className="team-card text-center">
                <img 
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face"
                  alt="Team Member"
                  className="rounded-circle mb-3"
                  style={{width: '150px', height: '150px', objectFit: 'cover'}}
                />
                <h5>Emily Davis</h5>
                <p className="text-muted">Guest Relations Manager</p>
                <div className="social-links">
                  <a href="#" className="me-2"><i className="fab fa-linkedin"></i></a>
                  <a href="#" className="me-2"><i className="fab fa-twitter"></i></a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-5 bg-primary text-white">
        <div className="container text-center">
          <h2 className="mb-3">Ready to Experience Our Hospitality?</h2>
          <p className="lead mb-4">
            Book your stay today and discover why thousands of guests choose us for their travels.
          </p>
          <Link to="/rooms" className="btn btn-light btn-lg">
            Book Your Stay
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
