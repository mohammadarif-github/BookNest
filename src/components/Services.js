import React from "react";
import Title from "./Title";
import ServiceCard from "./ServiceCard";
import { FaUtensils, FaShieldAlt, FaCar, FaWifi } from "react-icons/fa";

export default function Services() {
  const serviceList = [
    {
      serviceName: <FaUtensils />,
      title: "Complimentary Breakfast",
      details:
        "Start your day with our delicious continental breakfast featuring fresh fruits, pastries, coffee, and hot meals served daily from 6:30 AM to 10:00 AM.",
    },
    {
      serviceName: <FaShieldAlt />,
      title: "24/7 Security & Safety",
      details:
        "Your safety is our priority. We provide round-the-clock security monitoring, secure key card access, and emergency assistance for complete peace of mind.",
    },
    {
      serviceName: <FaCar />,
      title: "Airport Transportation",
      details:
        "Convenient airport shuttle service available upon request. We also offer complimentary parking and can arrange local transportation for your convenience.",
    },
    {
      serviceName: <FaWifi />,
      title: "High Speed WiFi",
      details:
        "Stay connected with complimentary high-speed internet access throughout the hotel. Perfect for business travelers and leisure guests alike.",
    },
  ];

  return (
    <React.Fragment>
      <Title title="Premium Services" />
      <div className="services-container">
        <div className="services-grid">
          {serviceList.map((service, index) => 
            <ServiceCard
              service={service.serviceName}
              title={service.title}
              details={service.details}
              key={index}
            />
          )}
        </div>
      </div>
    </React.Fragment>
  );
}
