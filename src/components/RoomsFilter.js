import React, { useContext, useState } from "react";
import { MyContext } from "../Context";
import axios from 'axios';

export const getUniqueValues = (rooms, type) => {
  return [...new Set(rooms.map((room) => room[type]))];
};

export default function RoomsFilter() {
  const contextData = useContext(MyContext);
  const {
    rooms,
    category_name,
    handleChange,
    capacity,
    price_per_night,
    maxPrice,
    minPrice,
    // minRoomSize,
    // maxRoomSize,
    reserved,
    clearAllFilters,
    filterByDateAvailability
  } = contextData;

  const [dateFilter, setDateFilter] = useState({
    checkIn: '',
    checkOut: '',
    isFiltering: false
  });

  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const checkRoomAvailability = async () => {
    if (!dateFilter.checkIn || !dateFilter.checkOut) {
      alert('Please select both check-in and check-out dates');
      return;
    }

    if (new Date(dateFilter.checkIn) >= new Date(dateFilter.checkOut)) {
      alert('Check-out date must be after check-in date');
      return;
    }

    try {
      setAvailabilityLoading(true);
      setDateFilter(prev => ({ ...prev, isFiltering: true }));

      const response = await axios.get(
        `https://booknest-jhw4.onrender.com/hotel/room-availability/?check_in=${dateFilter.checkIn}&check_out=${dateFilter.checkOut}`
      );

      if (response.data.success) {
        const availableRoomIds = response.data.data.available_rooms.map(room => room.id);
        
        // Call context method to filter rooms by availability
        if (filterByDateAvailability) {
          filterByDateAvailability(availableRoomIds);
        }
      } else {
        alert('Error checking room availability');
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      alert('Error checking room availability');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const clearDateFilter = () => {
    setDateFilter({
      checkIn: '',
      checkOut: '',
      isFiltering: false
    });
    
    // Reset date availability filter
    if (filterByDateAvailability) {
      filterByDateAvailability(null);
    }
  };

  let roomTypes = ["all", ...getUniqueValues(rooms, "category_name")];
  const selectTypes = roomTypes.map((cat, index) => (
    <option key={index} value={cat}>
      {cat}
    </option>
  ));

  let capacityValues = ["all", ...getUniqueValues(rooms, "capacity")];
  const sleectCapacity = capacityValues.sort().map((cap, index) => (
    <option key={index} value={cap}>
      {cap === "all" ? "Any Capacity" : `${cap} ${cap === 1 ? 'Guest' : 'Guests'}`}
    </option>
  ));

  // Count active filters
  const activeFiltersCount = [
    category_name !== "all",
    capacity !== "all", 
    price_per_night < maxPrice,
    reserved,
    dateFilter.isFiltering
  ].filter(Boolean).length;
  return (
    <>
      <div className="card shadow-sm mb-4 border-0">
        <div className="card-header bg-gradient text-white" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="fas fa-filter me-2"></i>
              Filter Rooms
              {activeFiltersCount > 0 && (
                <span className="badge bg-light text-dark ms-2">
                  {activeFiltersCount} active
                </span>
              )}
            </h5>
            <button 
              type="button" 
              className="btn btn-outline-light btn-sm"
              onClick={clearAllFilters}
              title="Clear all filters"
            >
              <i className="fas fa-times me-1"></i>
              Clear All
            </button>
          </div>
        </div>
        <div className="card-body p-4">
          <form className="rooms-filter">
            {/* Category Filter */}
            <div className="form-group mb-4">
              <label htmlFor="inputCategory" className="form-label fw-bold text-dark mb-2">
                <i className="fas fa-bed me-2 text-primary"></i>
                Room Category
              </label>
              <select
                id="inputCategory"
                className="form-select form-select-lg shadow-sm border-2"
                name="category_name"
                value={category_name}
                onChange={handleChange}
                style={{borderColor: '#e3f2fd'}}
              >
                {selectTypes}
              </select>
            </div>

            {/* Capacity Filter */}
            <div className="form-group mb-4">
              <label htmlFor="inputCapacity" className="form-label fw-bold text-dark mb-2">
                <i className="fas fa-users me-2 text-success"></i>
                Guest Capacity
              </label>
              <select
                id="inputCapacity"
                className="form-select form-select-lg shadow-sm border-2"
                name="capacity"
                value={capacity}
                onChange={handleChange}
                style={{borderColor: '#e8f5e8'}}
              >
                {sleectCapacity}
              </select>
            </div>

            {/* Price Range Filter */}
            <div className="form-group mb-4">
              <label htmlFor="customRange3" className="form-label fw-bold text-dark mb-2">
                <i className="fas fa-coins me-2 text-warning"></i>
                Maximum Price: <span className="badge bg-warning text-dark fs-6">{price_per_night} BDT</span>
              </label>
              <div className="price-slider-container">
                <input
                  name="price_per_night"
                  value={price_per_night}
                  type="range"
                  className="form-range price-slider"
                  min={minPrice}
                  max={maxPrice}
                  step="10"
                  id="customRange3"
                  onChange={handleChange}
                />
                <div className="d-flex justify-content-between text-muted small mt-1">
                  <span>{minPrice} BDT</span>
                  <span>{maxPrice} BDT</span>
                </div>
              </div>
            </div>

            {/* Availability Filter */}
            <div className="form-group mb-3">
              <div className="form-check form-switch form-check-lg">
                <input
                  name="reserved"
                  checked={reserved}
                  type="checkbox"
                  className="form-check-input shadow-sm"
                  id="reserved"
                  onChange={handleChange}
                  style={{transform: 'scale(1.2)'}}
                />
                <label className="form-check-label fw-bold text-dark ms-2" htmlFor="reserved">
                  <i className="fas fa-check-circle me-2 text-info"></i>
                  Show Available Rooms Only
                </label>
              </div>
            </div>

            {/* Date Availability Filter */}
            <div className="form-group mb-4">
              <div className="card border-0 bg-light">
                <div className="card-body">
                  <h6 className="card-title mb-3 text-primary fw-bold">
                    <i className="fas fa-calendar-alt me-2"></i>
                    Check Room Availability by Dates
                  </h6>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-dark">Check-in Date</label>
                      <input
                        type="date"
                        name="checkIn"
                        className="form-control border-2 shadow-sm"
                        value={dateFilter.checkIn}
                        onChange={handleDateChange}
                        min={new Date().toISOString().split('T')[0]}
                        style={{borderColor: '#e3f2fd'}}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold text-dark">Check-out Date</label>
                      <input
                        type="date"
                        name="checkOut"
                        className="form-control border-2 shadow-sm"
                        value={dateFilter.checkOut}
                        onChange={handleDateChange}
                        min={dateFilter.checkIn || new Date().toISOString().split('T')[0]}
                        style={{borderColor: '#e3f2fd'}}
                      />
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={checkRoomAvailability}
                      disabled={availabilityLoading || !dateFilter.checkIn || !dateFilter.checkOut}
                    >
                      {availabilityLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Checking...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-search me-2"></i>
                          Check Availability
                        </>
                      )}
                    </button>
                    {dateFilter.isFiltering && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={clearDateFilter}
                      >
                        <i className="fas fa-times me-2"></i>
                        Clear Date Filter
                      </button>
                    )}
                  </div>
                  {dateFilter.isFiltering && (
                    <div className="alert alert-info mt-3 mb-0">
                      <i className="fas fa-info-circle me-2"></i>
                      Showing available rooms for {new Date(dateFilter.checkIn).toLocaleDateString()} to {new Date(dateFilter.checkOut).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="mt-4 pt-3 border-top">
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
                  {activeFiltersCount > 0 ? `${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} applied` : 'No filters applied'}
                </small>
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={clearAllFilters}
                  disabled={activeFiltersCount === 0}
                >
                  <i className="fas fa-redo me-1"></i>
                  Reset Filters
                </button>
              </div>
              
              {/* Active Filter Tags */}
              {activeFiltersCount > 0 && (
                <div className="mt-3">
                  <div className="d-flex flex-wrap gap-2">
                    {category_name !== "all" && (
                      <span className="badge bg-primary">
                        Category: {category_name}
                      </span>
                    )}
                    {capacity !== "all" && (
                      <span className="badge bg-success">
                        Min Capacity: {capacity}
                      </span>
                    )}
                    {price_per_night < maxPrice && (
                      <span className="badge bg-warning text-dark">
                        Max Price: {price_per_night} BDT
                      </span>
                    )}
                    {reserved && (
                      <span className="badge bg-info">
                        Available Only
                      </span>
                    )}
                    {dateFilter.isFiltering && (
                      <span className="badge bg-secondary">
                        Date Filter: {new Date(dateFilter.checkIn).toLocaleDateString()} - {new Date(dateFilter.checkOut).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
