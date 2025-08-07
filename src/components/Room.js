import React from "react";
import {Link} from 'react-router-dom';
import { getSmartRoomImage, getFallbackImage } from '../utils/imageUtils';

export default function Room({ room }) {
    const {title, price_per_night, room_slug} = room;

  return (
    <div className="card room room-card">
      <Link to={`/single-room/${room_slug}`}>
        <img 
          className="card-img-top img-fluid room-image" 
          src={getSmartRoomImage(room, 'medium')} 
          alt={title}
          onError={(e) => {
            // Fallback if Unsplash image fails to load
            e.target.src = getFallbackImage('medium');
          }}
        />
      </Link>
      <div className="card-body">
        <h5 className="card-title">{title}</h5>
        <p className="card-text font-weight-bold">{parseFloat(price_per_night).toLocaleString()} BDT</p>
        <Link 
          to={`/single-room/${room_slug}`}
          className="btn btn-outline-primary btn-sm w-100"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
