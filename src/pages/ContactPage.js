import React, { useState } from 'react';
import { useFormValidation } from '../hooks/useCustomHooks';

const ContactPage = () => {
  const [submitStatus, setSubmitStatus] = useState(null);

  const validationRules = {
    name: {
      required: 'Name is required',
    },
    email: {
      required: 'Email is required',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
    subject: {
      required: 'Subject is required',
    },
    message: {
      required: 'Message is required',
      custom: (value) => {
        if (value && value.length < 10) {
          return 'Message must be at least 10 characters long';
        }
        return null;
      },
    },
  };

  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    reset,
  } = useFormValidation(
    {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    },
    validationRules
  );

  const onSubmit = async (formData) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSubmitStatus('success');
      reset();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSubmitStatus(null), 5000);
    } catch (error) {
      setSubmitStatus('error');
    }
  };

  return (
    <div className="contact-page">
      {/* Header Section */}
      <section className="contact-header py-5 bg-primary text-white">
        <div className="container text-center">
          <h1 className="display-4 mb-3">Contact Us</h1>
          <p className="lead">
            We'd love to hear from you. Get in touch with our friendly team.
          </p>
        </div>
      </section>

      <div className="container py-5">
        <div className="row">
          {/* Contact Information */}
          <div className="col-lg-4 mb-5">
            <div className="contact-info">
              <h3 className="mb-4">Get in Touch</h3>
              
              <div className="contact-item mb-4">
                <div className="d-flex align-items-start">
                  <div className="contact-icon me-3">
                    <i className="fas fa-map-marker-alt fa-2x text-primary"></i>
                  </div>
                  <div>
                    <h5>Address</h5>
                    <p className="text-muted mb-0">
                      123 Hotel Street<br />
                      Downtown City, DC 12345<br />
                      United States
                    </p>
                  </div>
                </div>
              </div>

              <div className="contact-item mb-4">
                <div className="d-flex align-items-start">
                  <div className="contact-icon me-3">
                    <i className="fas fa-phone fa-2x text-primary"></i>
                  </div>
                  <div>
                    <h5>Phone</h5>
                    <p className="text-muted mb-1">
                      <a href="tel:+1234567890" className="text-decoration-none">
                        +1 (234) 567-890
                      </a>
                    </p>
                    <p className="text-muted mb-0 small">
                      24/7 Customer Support
                    </p>
                  </div>
                </div>
              </div>

              <div className="contact-item mb-4">
                <div className="d-flex align-items-start">
                  <div className="contact-icon me-3">
                    <i className="fas fa-envelope fa-2x text-primary"></i>
                  </div>
                  <div>
                    <h5>Email</h5>
                    <p className="text-muted mb-1">
                      <a href="mailto:nestbook.mail@gmail.com" className="text-decoration-none">
                        nestbook.mail@gmail.com
                      </a>
                    </p>
                    <p className="text-muted mb-0 small">
                      General Inquiries
                    </p>
                  </div>
                </div>
              </div>

              <div className="contact-item mb-4">
                <div className="d-flex align-items-start">
                  <div className="contact-icon me-3">
                    <i className="fas fa-clock fa-2x text-primary"></i>
                  </div>
                  <div>
                    <h5>Office Hours</h5>
                    <p className="text-muted mb-0">
                      Monday - Friday: 9:00 AM - 6:00 PM<br />
                      Saturday: 10:00 AM - 4:00 PM<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="social-media mt-4">
                <h5 className="mb-3">Follow Us</h5>
                <div className="d-flex gap-3">
                  <a href="#" className="social-link">
                    <i className="fab fa-facebook-f"></i>
                  </a>
                  <a href="#" className="social-link">
                    <i className="fab fa-twitter"></i>
                  </a>
                  <a href="#" className="social-link">
                    <i className="fab fa-instagram"></i>
                  </a>
                  <a href="#" className="social-link">
                    <i className="fab fa-linkedin-in"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="col-lg-8">
            <div className="contact-form">
              <h3 className="mb-4">Send us a Message</h3>
              
              {submitStatus === 'success' && (
                <div className="alert alert-success alert-dismissible fade show">
                  <i className="fas fa-check-circle me-2"></i>
                  Thank you for your message! We'll get back to you soon.
                </div>
              )}
              
              {submitStatus === 'error' && (
                <div className="alert alert-danger alert-dismissible fade show">
                  <i className="fas fa-exclamation-circle me-2"></i>
                  Sorry, there was an error sending your message. Please try again.
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="name" className="form-label">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      id="name"
                      name="name"
                      value={values.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <div className="invalid-feedback">{errors.name}</div>
                    )}
                  </div>
                  
                  <div className="col-md-6 mb-3">
                    <label htmlFor="email" className="form-label">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      id="email"
                      name="email"
                      value={values.email}
                      onChange={handleChange}
                      placeholder="Enter your email address"
                    />
                    {errors.email && (
                      <div className="invalid-feedback">{errors.email}</div>
                    )}
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="phone" className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      id="phone"
                      name="phone"
                      value={values.phone}
                      onChange={handleChange}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  
                  <div className="col-md-6 mb-3">
                    <label htmlFor="subject" className="form-label">
                      Subject <span className="text-danger">*</span>
                    </label>
                    <select
                      className={`form-select ${errors.subject ? 'is-invalid' : ''}`}
                      id="subject"
                      name="subject"
                      value={values.subject}
                      onChange={handleChange}
                    >
                      <option value="">Choose a subject</option>
                      <option value="general">General Inquiry</option>
                      <option value="booking">Booking Assistance</option>
                      <option value="complaint">Complaint</option>
                      <option value="suggestion">Suggestion</option>
                      <option value="partnership">Partnership</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.subject && (
                      <div className="invalid-feedback">{errors.subject}</div>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="message" className="form-label">
                    Message <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className={`form-control ${errors.message ? 'is-invalid' : ''}`}
                    id="message"
                    name="message"
                    rows="6"
                    value={values.message}
                    onChange={handleChange}
                    placeholder="Type your message here..."
                  ></textarea>
                  {errors.message && (
                    <div className="invalid-feedback">{errors.message}</div>
                  )}
                  <div className="form-text">
                    Minimum 10 characters. {values.message.length}/500
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane me-2"></i>
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section (Placeholder) */}
      <section className="contact-map">
        <div className="container-fluid p-0">
          <div className="map-placeholder bg-light text-center py-5">
            <i className="fas fa-map-marked-alt fa-4x text-muted mb-3"></i>
            <h4 className="text-muted">Interactive Map Coming Soon</h4>
            <p className="text-muted">Find us at 123 Hotel Street, Downtown City</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2>Frequently Asked Questions</h2>
            <p className="lead text-muted">Quick answers to common questions</p>
          </div>
          
          <div className="row">
            <div className="col-lg-8 mx-auto">
              <div className="accordion" id="faqAccordion">
                <div className="accordion-item">
                  <h2 className="accordion-header" id="headingOne">
                    <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne">
                      What are your check-in and check-out times?
                    </button>
                  </h2>
                  <div id="collapseOne" className="accordion-collapse collapse show" data-bs-parent="#faqAccordion">
                    <div className="accordion-body">
                      Check-in is from 3:00 PM and check-out is until 11:00 AM. Early check-in and late check-out may be available upon request.
                    </div>
                  </div>
                </div>
                
                <div className="accordion-item">
                  <h2 className="accordion-header" id="headingTwo">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo">
                      Do you offer free WiFi?
                    </button>
                  </h2>
                  <div id="collapseTwo" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                    <div className="accordion-body">
                      Yes, we provide complimentary high-speed WiFi throughout the hotel for all guests.
                    </div>
                  </div>
                </div>
                
                <div className="accordion-item">
                  <h2 className="accordion-header" id="headingThree">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree">
                      What is your cancellation policy?
                    </button>
                  </h2>
                  <div id="collapseThree" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                    <div className="accordion-body">
                      You can cancel your reservation up to 24 hours before check-in without any penalty. Cancellations made within 24 hours may incur a one-night charge.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
