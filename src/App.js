import React from "react";
import "./App.css";
import "./assets/main.css";
import "./assets/payment.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { Routes, Route } from "react-router-dom";
import NavbarComponent from "./components/NavbarComponent";
import FooterComponent from "./components/FooterComponent";
import ErrorBoundary from "./components/ErrorBoundary";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import SingleRoomPage from "./pages/SingleRoomPage";
import BookingPage from "./pages/BookingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import ServicesPage from "./pages/ServicesPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ErrorPage from "./pages/ErrorPage";
import Dashboard from './pages/Dashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailure from './pages/PaymentFailure';
import PaymentProcessing from './pages/PaymentProcessing';

function App() {
  return (
    <ErrorBoundary>
      <div className="d-flex flex-column min-vh-100">
        <NavbarComponent />
        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/rooms" element={<RoomPage />} />
            <Route
              path="/single-room/:room_slug"
              element={<SingleRoomPage />}
            />
            <Route
              path="/book/:room_id"
              element={<BookingPage />}
            />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/register"
              element={<RegisterPage />}
            />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/dashboard" element={<Dashboard />}/>
            <Route path="/payment/process/:bookingId" element={<PaymentProcessing />} />
            <Route path="/payment/success/:transactionId" element={<PaymentSuccess />} />
            <Route path="/payment/failure/:transactionId" element={<PaymentFailure />} />
            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </main>
        <FooterComponent />
      </div>
    </ErrorBoundary>
  );
}

export default App;
