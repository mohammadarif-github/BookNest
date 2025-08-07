import React, { useContext } from "react";
import BookingComponent from "../components/BookingComponent";
import LoginPage from "../pages/LoginPage";
import { MyContext } from "../Context";
import { Navigate, useLocation } from "react-router-dom";

export default function BookingPage() {
  const context = useContext(MyContext);
  const location = useLocation();
  
  if (!location.state) {
    return <Navigate to="/rooms" replace />;
  }
  
  const room = location.state.room;
  
  if (!context.isUserAuthenticated) {
    return <LoginPage />;
  }
  
  return (
    <div className="container">
      <BookingComponent room={room} />
    </div>
  );
}
