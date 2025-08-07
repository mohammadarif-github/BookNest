import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSmartRoomImage, getFallbackImage } from '../utils/imageUtils';

export default function HeroComponent({ data, hero, title, subtitle }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle static hero mode vs carousel mode
  const isCarouselMode = data && Array.isArray(data) && data.length > 0;
  const isStaticMode = !isCarouselMode && (hero || title);

  // Auto-slide functionality
  useEffect(() => {
    if (!isAutoPlaying || !isCarouselMode || isTransitioning) return;
    
    const interval = setInterval(() => {
      goToNextSlide();
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, isCarouselMode, isTransitioning]);

  // Manual navigation functions with smooth transitions
  const goToSlide = (index) => {
    if (isTransitioning || index === currentSlide) return;
    
    setIsTransitioning(true);
    setCurrentSlide(index);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 600); // Match CSS transition duration
  };

  const goToPrevSlide = () => {
    if (isTransitioning || !isCarouselMode) return;
    
    // Use modulo for proper circular navigation
    const prevIndex = (currentSlide - 1 + data.length) % data.length;
    goToSlide(prevIndex);
  };

  const goToNextSlide = () => {
    if (isTransitioning || !isCarouselMode) return;
    
    // Use modulo for proper circular navigation  
    const nextIndex = (currentSlide + 1) % data.length;
    goToSlide(nextIndex);
  };

  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  // Handle left/right click navigation
  const handleLeftClick = (e) => {
    e.stopPropagation();
    goToPrevSlide();
  };

  const handleRightClick = (e) => {
    e.stopPropagation();
    goToNextSlide();
  };

  if (!isCarouselMode && !isStaticMode) return null;

  // Static hero mode rendering
  if (isStaticMode) {
    return (
      <div className="static-hero-section">
        <div className="static-hero-overlay">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-8 text-center">
                {title && <h1 className="static-hero-title">{title}</h1>}
                {subtitle && <p className="static-hero-subtitle">{subtitle}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Carousel mode rendering (existing functionality)

  return (
    <div
      className="carousel slide hero-carousel"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Left and Right Click Zones (15-20% width) */}
      <div 
        className="carousel-click-zone left" 
        onClick={handleLeftClick}
        title="Previous slide"
      ></div>
      <div 
        className="carousel-click-zone right" 
        onClick={handleRightClick}
        title="Next slide"
      ></div>

      {/* Carousel Inner */}
      <div className="carousel-inner">
        {data.map((room, index) => (
          <div 
            key={room.id || index}
            className={`carousel-item ${index === currentSlide ? 'active' : ''}`}
          >
            <img
              className="d-block w-100 hero-image"
              src={getSmartRoomImage(room, 'hero')}
              alt={`${room.title} slide`}
              onError={(e) => {
                e.target.src = getFallbackImage('hero');
              }}
            />
            <div className="carousel-caption d-md-block">
              <div className="hero-overlay-card">
                <div className="hero-card-content">
                  <Link
                    to={`/single-room/${room.room_slug}`}
                    className="text-decoration-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="hero-title">{room.title}</h3>
                  </Link>
                  <div className="hero-price-container">
                    <span className="hero-price-label">Starting from</span>
                    <div className="hero-price">{room.price_per_night} BDT<span className="hero-price-period">/night</span></div>
                  </div>
                  <Link
                    to={`/single-room/${room.room_slug}`}
                    className="hero-btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Carousel Controls - positioned relative to main carousel */}
      <button
        className="carousel-control-prev"
        type="button"
        onClick={goToPrevSlide}
        disabled={isTransitioning}
      >
        <span className="carousel-control-prev-icon" aria-hidden="true"></span>
        <span className="sr-only">Previous</span>
      </button>
      <button
        className="carousel-control-next"
        type="button"
        onClick={goToNextSlide}
        disabled={isTransitioning}
      >
        <span className="carousel-control-next-icon" aria-hidden="true"></span>
        <span className="sr-only">Next</span>
      </button>

      {/* Carousel Indicators */}
      <div className="carousel-indicators">
        {data.map((_, index) => (
          <button
            key={index}
            type="button"
            className={index === currentSlide ? 'active' : ''}
            onClick={() => goToSlide(index)}
            aria-label={`Slide ${index + 1}`}
          ></button>
        ))}
      </div>
    </div>
  );
}
