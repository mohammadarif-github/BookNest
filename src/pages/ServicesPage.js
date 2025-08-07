import React from 'react';
import HeroComponent from '../components/HeroComponent';
import Services from '../components/Services';

const ServicesPage = () => {
  return (
    <div>
      <HeroComponent 
        hero="servicesHero"
        title="Our Services"
        subtitle="Discover the premium amenities and services that make your stay exceptional"
      />
      <div className="container my-5">
        <Services />
      </div>
    </div>
  );
};

export default ServicesPage;
