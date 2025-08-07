import React from "react";
import { Link } from "react-router-dom";
import { getSmartRoomImage, getFallbackImage } from '../utils/imageUtils';

export default function CarouselItems({ data }) {
  const items = data.map((d, index) => (
    <div className="carousel-item" key={index}>
      <img
        className="d-block w-100 hero-image"
        src={getSmartRoomImage(d, 'hero')}
        alt={d.title}
        onError={(e) => {
          // Fallback if Unsplash image fails to load
          e.target.src = getFallbackImage('hero');
        }}
      />
      <div className="carousel-caption d-md-block">
        <div className="hero-overlay-card">
          <div className="hero-card-content">
            <Link
              to={`/single-room/${d.room_slug}`}
              className="text-decoration-none"
            >
              <h3 className="hero-title">{d.title}</h3>
            </Link>
            <div className="hero-price-container">
              <span className="hero-price-label">Starting from</span>
              <div className="hero-price">{d.price_per_night} BDT<span className="hero-price-period">/night</span></div>
            </div>
            <Link
              to={`/single-room/${d.room_slug}`}
              className="hero-btn"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  ));
  return <>{items}</>;
}
