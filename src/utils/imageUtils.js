// Smart image utility for hotel rooms
// Uses high-quality category-specific images from Unsplash when no custom image is available

export const getSmartRoomImage = (room, size = 'medium') => {
  if (!room) {
    return getSizeUrl('https://images.unsplash.com/photo-1590490360182-c33d57733427', size);
  }
  
  // If the room has a real uploaded image (not the default), use it
  if (room.cover_image && !room.cover_image.includes('default/room_default.jpg')) {
    return room.cover_image;
  }
  
  // Category-specific high-quality images from Unsplash
  const imageMap = {
    'Luxury': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43',
    'Deluxe Suite': 'https://images.unsplash.com/photo-1571896349842-33c89424de2d',
    'Standard Room': 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10',
    'Family Room': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b',
    'Business Suite': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791',
    'Penthouse': 'https://images.unsplash.com/photo-1559599238-9fdc67ce4e7c',
    'Economy Room': 'https://images.unsplash.com/photo-1586611292717-f828b167408c',
    'Luxury Villa': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2'
  };
  
  const baseUrl = imageMap[room.category_name] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427';
  return getSizeUrl(baseUrl, size);
};

// Helper function to get properly sized Unsplash URLs
const getSizeUrl = (baseUrl, size) => {
  const sizeMap = {
    small: 'w=400&h=300',
    medium: 'w=500&h=350',
    large: 'w=800&h=600',
    hero: 'w=1200&h=700'
  };
  
  const params = sizeMap[size] || sizeMap.medium;
  return `${baseUrl}?${params}&fit=crop&crop=center`;
};

// Default fallback image URL
export const getFallbackImage = (size = 'medium') => {
  return getSizeUrl('https://images.unsplash.com/photo-1590490360182-c33d57733427', size);
};

// Image categories with descriptions for reference
export const IMAGE_CATEGORIES = {
  'Luxury': 'Elegant luxury hotel room with modern furnishings',
  'Deluxe Suite': 'Spacious deluxe suite with premium amenities',
  'Standard Room': 'Comfortable standard hotel room',
  'Family Room': 'Family-friendly room with multiple beds',
  'Business Suite': 'Professional business suite with workspace',
  'Penthouse': 'Exclusive penthouse with city views',
  'Economy Room': 'Budget-friendly clean and simple room',
  'Luxury Villa': 'Private luxury villa with outdoor space'
};
