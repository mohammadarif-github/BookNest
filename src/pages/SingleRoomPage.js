import React, { useContext, useState } from "react";
import { MyContext } from "../Context";
import BannerComponent from "../components/BannerComponent";
import ImageGalleryModal from "../components/ImageGalleryModal";
import { Link, useParams } from "react-router-dom";
import { getSmartRoomImage, getFallbackImage } from '../utils/imageUtils';

export default function SingleRommPage() {
  const context = useContext(MyContext);
  const { room_slug } = useParams();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const room = context.rooms.find(
    (room) => room.room_slug === room_slug
  );

  // Create display images array for thumbnails
  const displayImages = room ? [
    room.cover_image || getSmartRoomImage(room, 'large'),
    getSmartRoomImage(room, 'medium'),
    getSmartRoomImage(room, 'small')
  ] : [];
  
  if (!room) {
    return (
      <div className="container text-center py-5">
        <h2>Room Not Found</h2>
        <p>The room you're looking for doesn't exist.</p>
        <Link to="/rooms" className="btn btn-primary">Browse All Rooms</Link>
      </div>
    );
  }

  const openGallery = (imageIndex = 0) => {
    setSelectedImageIndex(imageIndex);
    setIsGalleryOpen(true);
  };

  const closeGallery = () => {
    setIsGalleryOpen(false);
  };

  return (
    <>
      <BannerComponent room={room} />
      
      {/* Room Details Section */}
      <div className="container room-details-container">
        <div className="row">
          <div className="col-md-6">
            <div className="room-main-image">
              <img 
                src={room.cover_image || getSmartRoomImage(room, 'large')}
                alt={room.name}
                className="img-fluid rounded shadow-lg clickable-image"
                onClick={() => openGallery(0)}
              />
            </div>
            
            {/* Room Gallery Thumbnails */}
            <div className="room-thumbnails mt-3">
              <div className="row g-2">
                {displayImages.map((image, index) => (
                  <div key={index} className="col-4">
                    <img 
                      src={image}
                      alt={`${room.name} - ${index + 1}`}
                      className="img-fluid thumbnail-image rounded clickable-image"
                      onClick={() => openGallery(index)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Room Images Gallery */}
          <div className="col-lg-8">
            <div className="room-gallery">
              <h3 className="section-title">Room Gallery</h3>
              
              <div className="gallery-grid">
                <div className="main-image" onClick={() => openGallery(0)}>
                  <img 
                    src={getSmartRoomImage(room, 'large')} 
                    alt={`${room.title} - Main View`}
                    className="img-fluid rounded gallery-image"
                    onError={(e) => {
                      e.target.src = getFallbackImage('large');
                    }}
                  />
                  <div className="image-overlay">
                    <i className="fas fa-search-plus"></i>
                    <span>View Gallery</span>
                  </div>
                </div>
                <div className="gallery-thumbnails">
                  <div className="thumbnail-item" onClick={() => openGallery(1)}>
                    <img 
                      src={getSmartRoomImage(room, 'medium')} 
                      alt={`${room.title} - View 2`}
                      className="img-fluid rounded gallery-image"
                      onError={(e) => {
                        e.target.src = getFallbackImage('medium');
                      }}
                    />
                    <div className="image-overlay">
                      <i className="fas fa-search-plus"></i>
                    </div>
                  </div>
                  <div className="thumbnail-item" onClick={() => openGallery(2)}>
                    <img 
                      src={getSmartRoomImage(room, 'small')} 
                      alt={`${room.title} - View 3`}
                      className="img-fluid rounded gallery-image"
                      onError={(e) => {
                        e.target.src = getFallbackImage('small');
                      }}
                    />
                    <div className="image-overlay">
                      <i className="fas fa-search-plus"></i>
                    </div>
                  </div>
                </div>
              </div>
              <p className="gallery-hint">
                <i className="fas fa-info-circle"></i>
                <span className="mobile-only">Tap any image for full view</span>
                <span className="desktop-only">Click on any image to view in full size gallery</span>
              </p>
            </div>

            {/* Room Description */}
            <div className="room-description">
              <h3 className="section-title">About This Room</h3>
              <p className="description-text">
                Experience luxury and comfort in our beautifully appointed {room.title.toLowerCase()}. 
                This elegantly designed space features modern amenities and stunning views, perfect for 
                both business and leisure travelers. Each room is thoughtfully decorated with premium 
                furnishings and state-of-the-art technology to ensure your stay is nothing short of exceptional.
              </p>
              <p className="description-text">
                Our commitment to excellence means every detail has been carefully considered to provide 
                you with the ultimate hospitality experience. From the moment you enter, you'll feel 
                the warmth and sophistication that defines our hotel's character.
              </p>
            </div>

            {/* Room Amenities */}
            <div className="room-amenities">
              <h3 className="section-title">Room Amenities</h3>
              <div className="amenities-grid">
                <div className="amenity-item">
                  <i className="fas fa-wifi"></i>
                  <span>Free High-Speed WiFi</span>
                </div>
                <div className="amenity-item">
                  <i className="fas fa-tv"></i>
                  <span>55" Smart TV</span>
                </div>
                <div className="amenity-item">
                  <i className="fas fa-snowflake"></i>
                  <span>Climate Control</span>
                </div>
                <div className="amenity-item">
                  <i className="fas fa-coffee"></i>
                  <span>Coffee & Tea Station</span>
                </div>
                <div className="amenity-item">
                  <i className="fas fa-bath"></i>
                  <span>Luxury Bathroom</span>
                </div>
                <div className="amenity-item">
                  <i className="fas fa-concierge-bell"></i>
                  <span>24/7 Room Service</span>
                </div>
                <div className="amenity-item">
                  <i className="fas fa-shield-alt"></i>
                  <span>In-Room Safe</span>
                </div>
                <div className="amenity-item">
                  <i className="fas fa-dumbbell"></i>
                  <span>Fitness Center Access</span>
                </div>
              </div>
            </div>
          </div>

          {/* Room Info Sidebar */}
          <div className="col-lg-4">
            <div className="room-info-card">
              <div className="price-section">
                <h3 className="room-price">{parseFloat(room.price_per_night).toLocaleString()} BDT<span className="price-period">/night</span></h3>
                <p className="price-note">Includes taxes & fees</p>
              </div>

              <div className="room-specs">
                <h4>Room Specifications</h4>
                <div className="spec-item">
                  <i className="fas fa-ruler-combined"></i>
                  <div>
                    <span className="spec-label">Room Size</span>
                    <span className="spec-value">{room.room_size} sq ft</span>
                  </div>
                </div>
                <div className="spec-item">
                  <i className="fas fa-users"></i>
                  <div>
                    <span className="spec-label">Maximum Occupancy</span>
                    <span className="spec-value">{room.capacity} {room.capacity === 1 ? 'Guest' : 'Guests'}</span>
                  </div>
                </div>
                <div className="spec-item">
                  <i className="fas fa-bed"></i>
                  <div>
                    <span className="spec-label">Bed Type</span>
                    <span className="spec-value">{room.capacity === 1 ? 'Queen Bed' : room.capacity === 2 ? 'King Bed' : 'Multiple Beds'}</span>
                  </div>
                </div>
                <div className="spec-item">
                  <i className="fas fa-utensils"></i>
                  <div>
                    <span className="spec-label">Meals</span>
                    <span className="spec-value">Breakfast Included</span>
                  </div>
                </div>
              </div>

              <div className="booking-actions">
                {room.is_booked ? (
                  <div className="btn btn-danger btn-lg w-100 disabled touch-target">
                    <i className="fas fa-ban me-2"></i>
                    <span className="mobile-only">Reserved</span>
                    <span className="desktop-only">Room Reserved</span>
                  </div>
                ) : (
                  <>
                    <Link
                      to={`/book/${room.id}`}
                      state={{ room }}
                      className="btn btn-primary btn-lg w-100 mb-3 touch-target"
                    >
                      <i className="fas fa-calendar-check me-2"></i>
                      <span className="mobile-only">Book Now</span>
                      <span className="desktop-only">Book This Room</span>
                    </Link>
                    <Link
                      to="/rooms"
                      className="btn btn-outline-secondary w-100 touch-target"
                    >
                      <i className="fas fa-search me-2"></i>
                      <span className="mobile-only">Browse Rooms</span>
                      <span className="desktop-only">Browse Other Rooms</span>
                    </Link>
                  </>
                )}
              </div>

              <div className="contact-info">
                <h5>Need Help?</h5>
                <p>
                  <i className="fas fa-phone"></i>
                  <span>Call us: +1 (555) 123-4567</span>
                </p>
                <p>
                  <i className="fas fa-envelope"></i>
                  <span>Email: reservations@hotel.com</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        room={room}
        isOpen={isGalleryOpen}
        onClose={closeGallery}
        initialImageIndex={selectedImageIndex}
      />
    </>
  );
}
