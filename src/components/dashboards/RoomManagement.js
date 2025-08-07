import React, { useState, useEffect } from 'react';
import { buildURL, buildMediaURL, endpoints } from '../../config/api';

const RoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    price_per_night: '',
    capacity: '',
    room_size: '',
    featured: false,
    cover_image: null
  });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchRooms();
    fetchCategories();
  }, []);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('access-token');
      const response = await fetch(buildURL(endpoints.ROOM_MANAGEMENT), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setRooms(result.data);
        } else {
          alert('Failed to fetch rooms: ' + (result.message || 'Unknown error'));
        }
      } else {
        alert('Failed to fetch rooms');
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      alert('Error fetching rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('access-token');
      const response = await fetch(buildURL(endpoints.CATEGORIES_LIST), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setCategories(result.data);
        } else {
          console.error('Failed to fetch categories:', result.message);
        }
      } else {
        console.error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      setFormData(prev => ({
        ...prev,
        [name]: file
      }));
      
      // Create preview URL
      if (file) {
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('access-token');
      const url = editingRoom 
        ? buildURL(endpoints.ROOM_MANAGEMENT_DETAIL(editingRoom.id))
        : buildURL(endpoints.ROOM_MANAGEMENT);
      
      const method = editingRoom ? 'PUT' : 'POST';
      
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('category_id', formData.category_id);
      formDataToSend.append('price_per_night', formData.price_per_night);
      formDataToSend.append('capacity', formData.capacity);
      formDataToSend.append('room_size', formData.room_size);
      formDataToSend.append('featured', formData.featured);
      
      // Only append cover_image if a new file is selected
      if (formData.cover_image) {
        formDataToSend.append('cover_image', formData.cover_image);
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - browser will set it automatically
        },
        body: formDataToSend,
      });
      
      if (response.ok) {
        alert(editingRoom ? 'Room updated successfully' : 'Room created successfully');
        fetchRooms();
        closeModal();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form');
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      title: room.title,
      category_id: room.category?.id || '',
      price_per_night: room.price_per_night,
      capacity: room.capacity,
      room_size: room.room_size,
      featured: room.featured,
      cover_image: null
    });
    // Set current image as preview
    setImagePreview(room.cover_image ? buildMediaURL(room.cover_image) : null);
    setShowModal(true);
  };

  const handleDelete = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete this room?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access-token');
      const response = await fetch(buildURL(endpoints.ROOM_MANAGEMENT_DETAIL(roomId)), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        alert('Room deleted successfully');
        fetchRooms();
      } else {
        alert('Failed to delete room');
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Error deleting room');
    }
  };

  const openModal = () => {
    setEditingRoom(null);
    setFormData({
      title: '',
      category_id: '',
      price_per_night: '',
      capacity: '',
      room_size: '',
      featured: false,
      cover_image: null
    });
    setImagePreview(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRoom(null);
    setImagePreview(null);
    setFormData({
      title: '',
      category_id: '',
      price_per_night: '',
      capacity: '',
      room_size: '',
      featured: false,
      cover_image: null
    });
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-bed me-2"></i>
          Room Management
        </h2>
        <button 
          className="btn btn-primary" 
          onClick={openModal}
        >
          <i className="fas fa-plus me-1"></i>
          Add New Room
        </button>
      </div>

      <div className="row">
        {rooms.length === 0 ? (
          <div className="col-12">
            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>
              No rooms found. Click "Add New Room" to create your first room.
            </div>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="col-md-6 col-lg-4 mb-4">
              <div className="card h-100">
                {/* Room Image */}
                <div className="position-relative">
                  <img 
                    src={room.cover_image ? buildMediaURL(room.cover_image) : buildMediaURL('/default/room_default.jpg')} 
                    className="card-img-top"
                    alt={room.title}
                    style={{ height: '200px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = buildMediaURL('/default/room_default.jpg');
                    }}
                  />
                  {room.featured && (
                    <span className="badge bg-warning position-absolute top-0 end-0 m-2">
                      <i className="fas fa-star"></i> Featured
                    </span>
                  )}
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title">{room.title}</h5>
                  </div>
                  
                  <p className="card-text">
                    <strong>Category:</strong> {room.category?.category_name || 'N/A'}<br/>
                    <strong>Price:</strong> BDT {room.price_per_night}/night<br/>
                    <strong>Capacity:</strong> {room.capacity} guests<br/>
                    <strong>Size:</strong> {room.room_size} sq ft<br/>
                    <strong>Status:</strong> 
                    <span className={`badge ms-1 ${room.is_booked ? 'bg-danger' : 'bg-success'}`}>
                      {room.is_booked ? 'Booked' : 'Available'}
                    </span>
                  </p>
                  
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleEdit(room)}
                    >
                      <i className="fas fa-edit"></i> Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(room.id)}
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Room Modal */}
      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-bed me-2"></i>
                  {editingRoom ? 'Edit Room' : 'Add New Room'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label htmlFor="title" className="form-label">Room Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="col-12 col-md-6">
                      <label htmlFor="category_id" className="form-label">Category *</label>
                      <select
                        className="form-select"
                        id="category_id"
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.category_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-12 col-md-4">
                      <label htmlFor="price_per_night" className="form-label">Price per Night *</label>
                      <div className="input-group">
                        <span className="input-group-text">BDT</span>
                        <input
                          type="number"
                          className="form-control"
                          id="price_per_night"
                          name="price_per_night"
                          value={formData.price_per_night}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="col-12 col-md-4">
                      <label htmlFor="capacity" className="form-label">Capacity *</label>
                      <input
                        type="number"
                        className="form-control"
                        id="capacity"
                        name="capacity"
                        value={formData.capacity}
                        onChange={handleInputChange}
                        min="1"
                        required
                      />
                    </div>
                    
                    <div className="col-12 col-md-4">
                      <label htmlFor="room_size" className="form-label">Room Size (sq ft) *</label>
                      <input
                        type="number"
                        className="form-control"
                        id="room_size"
                        name="room_size"
                        value={formData.room_size}
                        onChange={handleInputChange}
                        min="0"
                        required
                      />
                    </div>
                    
                    {/* Image Upload Section */}
                    <div className="col-12">
                      <label htmlFor="cover_image" className="form-label">Room Image</label>
                      <input
                        type="file"
                        className="form-control"
                        id="cover_image"
                        name="cover_image"
                        onChange={handleInputChange}
                        accept="image/*"
                      />
                      <div className="form-text">Upload a cover image for the room (JPEG, PNG, WebP)</div>
                      
                      {/* Image Preview */}
                      {imagePreview && (
                        <div className="mt-3">
                          <label className="form-label">Current/Preview Image:</label>
                          <div className="text-center">
                            <img 
                              src={imagePreview} 
                              alt="Room preview" 
                              className="img-thumbnail"
                              style={{ maxHeight: '200px', maxWidth: '100%' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="featured"
                          name="featured"
                          checked={formData.featured}
                          onChange={handleInputChange}
                        />
                        <label className="form-check-label" htmlFor="featured">
                          Featured Room (will be displayed prominently)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className={`fas ${editingRoom ? 'fa-save' : 'fa-plus'} me-1`}></i>
                    {editingRoom ? 'Update Room' : 'Create Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagement;
