import React, { useState, useEffect } from 'react';
import { getSmartRoomImage, getFallbackImage } from '../utils/imageUtils';

export default function ImageGalleryModal({ room, isOpen, onClose, initialImageIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialImageIndex);
  
  // Generate different image URLs for the gallery
  const galleryImages = [
    { 
      src: getSmartRoomImage(room, 'large'), 
      alt: `${room.title} - Main View`,
      fallback: getFallbackImage('large')
    },
    { 
      src: getSmartRoomImage(room, 'medium'), 
      alt: `${room.title} - Interior View`,
      fallback: getFallbackImage('medium')
    },
    { 
      src: getSmartRoomImage(room, 'small'), 
      alt: `${room.title} - Detail View`,
      fallback: getFallbackImage('small')
    },
    { 
      src: getSmartRoomImage(room, 'hero'), 
      alt: `${room.title} - Panoramic View`,
      fallback: getFallbackImage('hero')
    }
  ];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isOpen) return;
      
      switch(e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentIndex]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Update current index when initialImageIndex changes
  useEffect(() => {
    setCurrentIndex(initialImageIndex);
  }, [initialImageIndex]);

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === galleryImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? galleryImages.length - 1 : prevIndex - 1
    );
  };

  const goToImage = (index) => {
    setCurrentIndex(index);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Move the early return AFTER all hooks
  if (!isOpen) {
    return null;
  }

  const currentImage = galleryImages[currentIndex];

  return (
    <div className="image-gallery-modal" onClick={handleBackdropClick} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="modal-content" style={{ position: 'relative', textAlign: 'center' }}>
        {/* Simple test content */}
        <div style={{ color: 'white', marginBottom: '20px' }}>
          <h2>Gallery Modal Test</h2>
          <p>Room: {room.title}</p>
          <p>Image {currentIndex + 1} of {galleryImages.length}</p>
        </div>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid white',
            color: 'white',
            padding: '10px',
            cursor: 'pointer',
            borderRadius: '50%'
          }}
        >
          ✕
        </button>

        {/* Navigation Arrows */}
        <button 
          onClick={goToPrevious}
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid white',
            color: 'white',
            padding: '15px',
            cursor: 'pointer',
            borderRadius: '50%'
          }}
        >
          ←
        </button>
        
        <button 
          onClick={goToNext}
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid white',
            color: 'white',
            padding: '15px',
            cursor: 'pointer',
            borderRadius: '50%'
          }}
        >
          →
        </button>

        {/* Main Image */}
        <div style={{ maxWidth: '80vw', maxHeight: '70vh' }}>
          <img
            src={currentImage.src}
            alt={currentImage.alt}
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
            onError={(e) => {
              e.target.src = currentImage.fallback;
            }}
          />
        </div>

        {/* Thumbnail Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginTop: '20px',
          justifyContent: 'center'
        }}>
          {galleryImages.map((image, index) => (
            <button
              key={index}
              onClick={() => goToImage(index)}
              style={{
                border: index === currentIndex ? '3px solid #f6ad55' : '2px solid rgba(255,255,255,0.5)',
                borderRadius: '4px',
                padding: '2px',
                cursor: 'pointer',
                background: 'transparent'
              }}
            >
              <img
                src={image.src}
                alt={image.alt}
                style={{
                  width: '60px',
                  height: '45px',
                  objectFit: 'cover',
                  borderRadius: '2px'
                }}
                onError={(e) => {
                  e.target.src = image.fallback;
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
