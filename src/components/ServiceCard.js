import React from "react";
export default function ServiceCard({ service, details, title }) {
  return (
    <div className="service-card-wrapper">
      <div className="card service-card">
        <div className="service-icon-container">
          {service}
        </div>
        <div className="card-body text-center">
          <h6 className="card-title">{title}</h6>
          <p className="card-text">
            {details}
          </p>
        </div>
      </div>
    </div>
  );
}
