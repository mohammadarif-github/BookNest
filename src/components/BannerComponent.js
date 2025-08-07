import React from "react";
import { Link } from "react-router-dom";
import { getSmartRoomImage } from '../utils/imageUtils';

export default function BannerComponent({ room }) {
  return (
    <>
      <div
        className="room-detail-banner"
        style={{
          backgroundImage: `url("${getSmartRoomImage(room, 'hero')}")`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="banner-overlay">
          <div className="container">
            <div className="banner-content">
              <h1 className="banner-title">{room.title}</h1>
              <div className="banner-price">
                <span className="price-label">Starting from</span>
                <div className="price-amount">{room.price_per_night} BDT<span className="price-period">/night</span></div>
              </div>
              <div className="banner-actions">
                {room.is_booked ? (
                  <div className="btn btn-danger btn-lg disabled touch-target">
                    <i className="fas fa-ban me-2"></i>
                    <span className="mobile-only">Reserved</span>
                    <span className="desktop-only">Room Reserved</span>
                  </div>
                ) : (
                  <Link
                    to={`/book/${room.id}`}
                    state={{ room }}
                    className="btn btn-primary btn-lg banner-cta touch-target"
                  >
                    <i className="fas fa-calendar-check me-2"></i>
                    <span className="mobile-only">Book Now</span>
                    <span className="desktop-only">Book This Room</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
