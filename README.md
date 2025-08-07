# 🏨 Hotel Reservation System - Django + React

A full-stack hotel reservation system built with Django REST Framework backend and React frontend, featuring JWT authentication, password reset, bulk operations, and modern UI.

**Developed by:** [@mohammadarif-github](https://github.com/mohammadarif-github)

---

## ✅ Deployment Status

The project has been successfully deployed on **Render**.

### 🌐 Live Demo

- 🔗 **Frontend (React)**: https://book-nest-55ku.onrender.com  
- 🖥️ **Backend (Django REST API)**: https://booknest-jhw4.onrender.com

You can now access the full application online, including the hotel booking features, admin dashboard, and API documentation.

---

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
  - [Mac/Linux Setup](#-maclinux-setup)
  - [Windows Setup](#-windows-setup)
- [Running the Project](#-running-the-project)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Features Guide](#-features-guide)
- [Troubleshooting](#-troubleshooting)

## ✨ Features

- **🔐 Authentication System**
  - User registration and login
  - JWT token-based authentication
  - Password reset via email
  - Profile management

- **🏨 Hotel Management**
  - Room categories and management
  - Booking system
  - Room availability tracking
  - Featured rooms

- **📊 Admin Features**
  - Bulk operations (CSV upload/download)
  - User management
  - Booking management
  - Analytics dashboard

- **🎨 Modern UI**
  - Responsive design with Bootstrap 5
  - Interactive components
  - Professional styling
  - Mobile-friendly

## 🔧 Prerequisites

### Required Software:

- **Python 3.8+** (3.12+ recommended)
- **Node.js 16+** (18+ recommended)
- **npm** or **yarn**
- **Git**

### Check if you have them installed:

**Mac/Linux:**
```bash
python3 --version
node --version
npm --version
git --version
```

**Windows:**
```cmd
python --version
node --version
npm --version
git --version
```

## 🚀 Installation

### 🍎 Mac/Linux Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/mohammadarif-github/Hotel-Reservation-Django-React.git
cd Hotel-Reservation-Django-React
```

#### 2. Set up Python Virtual Environment
```bash
# Create virtual environment
python3 -m venv hotel_env

# Activate virtual environment
source hotel_env/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

#### 3. Set up Django Backend
```bash
# Run database migrations
python manage.py migrate

# Create superuser (admin account)
python manage.py createsuperuser

# Load sample data (optional)
python manage.py loaddata sample_data.json  # if exists
```

#### 4. Set up React Frontend
```bash
# Install Node.js dependencies
npm install

# Or if you prefer yarn
yarn install
```

#### 5. Environment Configuration
```bash
# The .env file should already exist with basic settings
# Update email settings if needed for password reset functionality
```

### 🪟 Windows Setup

#### 1. Clone the Repository
```cmd
git clone https://github.com/mohammadarif-github/Hotel-Reservation-Django-React.git
cd Hotel-Reservation-Django-React
```

#### 2. Set up Python Virtual Environment
```cmd
# Create virtual environment
python -m venv hotel_env

# Activate virtual environment
hotel_env\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

#### 3. Set up Django Backend
```cmd
# Run database migrations
python manage.py migrate

# Create superuser (admin account)
python manage.py createsuperuser

# Load sample data (optional)
python manage.py loaddata sample_data.json
```

#### 4. Set up React Frontend
```cmd
# Install Node.js dependencies
npm install

# Or if you prefer yarn
yarn install
```

#### 5. Environment Configuration
```cmd
# The .env file should already exist with basic settings
# Update email settings if needed for password reset functionality
```

## 🎯 Running the Project

### Development Mode

#### Start Backend Server

**Mac/Linux:**
```bash
# Activate virtual environment
source hotel_env/bin/activate

# Start Django development server
python manage.py runserver

# Server will run at: http://127.0.0.1:8000
```

**Windows:**
```cmd
# Activate virtual environment
hotel_env\Scripts\activate

# Start Django development server
python manage.py runserver

# Server will run at: http://127.0.0.1:8000
```

#### Start Frontend Server

**Both Mac/Linux and Windows:**
```bash
# In a new terminal/command prompt
npm start

# Or with yarn
yarn start

# Server will run at: http://localhost:3000
```

### 🌐 Access the Application

- **Frontend (React)**: http://localhost:3000
- **Backend API**: http://127.0.0.1:8000
- **Admin Panel**: http://127.0.0.1:8000/admin
- **API Documentation (Swagger)**: http://127.0.0.1:8000/swagger/
- **API Documentation (ReDoc)**: http://127.0.0.1:8000/redoc/

## 📁 Project Structure

```
Hotel-Reservation-Django-React/
├── 🐍 Backend (Django)
│   ├── hotel_reservation_site/    # Main Django project
│   ├── hotel_app/                 # Hotel management app
│   ├── accounts/                  # User authentication app
│   ├── manage.py                  # Django management script
│   ├── requirements.txt           # Python dependencies
│   └── db.sqlite3                 # SQLite database
│
├── ⚛️ Frontend (React)
│   ├── src/
│   │   ├── components/            # Reusable React components
│   │   ├── pages/                 # Page components
│   │   ├── utils/                 # Utility functions
│   │   └── assets/                # Static assets
│   ├── public/                    # Public assets
│   ├── package.json               # Node.js dependencies
│   └── yarn.lock / package-lock.json
│
├── 📊 Data & Config
│   ├── sample_csv_files/          # Sample data for bulk operations
│   ├── media/                     # User uploaded files
│   ├── .env                       # Environment variables
│   └── .gitignore                # Git ignore rules
│
└── 🐳 Environment
    └── hotel_env/                 # Python virtual environment
```

## 🔗 API Documentation

The project includes comprehensive API documentation with interactive testing capabilities:

- **Swagger UI**: http://127.0.0.1:8000/swagger/ - Interactive API documentation with testing interface
- **ReDoc**: http://127.0.0.1:8000/redoc/ - Clean, responsive API documentation

### 📖 Documentation Features:
- **Interactive Testing**: Test API endpoints directly from the browser
- **Request/Response Examples**: See real examples of API calls
- **Authentication**: Test authenticated endpoints with JWT tokens
- **Schema Validation**: View request/response schemas and validation rules

Once the backend is running, you can access:

- **Swagger UI**: http://127.0.0.1:8000/swagger/
- **ReDoc**: http://127.0.0.1:8000/redoc/

### Main API Endpoints:

```
🔐 Authentication:
POST /accounts/login/              # User login
POST /accounts/register/           # User registration
POST /accounts/password-reset/     # Request password reset
POST /accounts/password-reset/confirm/  # Confirm password reset

🏨 Hotel Management:
GET  /hotel/rooms/                 # List all rooms
POST /hotel/rooms/                 # Create new room
GET  /hotel/categories/            # List room categories
POST /hotel/bookings/              # Create booking

📊 Admin Operations:
POST /hotel/bulk-upload/           # Bulk data upload
GET  /hotel/bulk-download/         # Bulk data download
```

## 🎮 Features Guide

### 1. User Registration & Login
- Navigate to http://localhost:3000/register
- Create an account
- Login at http://localhost:3000/login

### 2. Browse Rooms
- View available rooms on the homepage
- Filter by category and features
- Check room details and pricing

### 3. Make Bookings
- Select desired room
- Choose check-in/check-out dates
- Complete booking form

### 4. Admin Features
- Access admin panel: http://127.0.0.1:8000/admin
- Upload bulk data via CSV files
- Manage users, rooms, and bookings

### 5. Password Reset
- Click "Forgot Password" on login page
- Enter your email address
- Check terminal output for reset link (development mode)
- Follow the link to reset your password

## 🔧 Environment Configuration

### Email Setup (Optional)
For password reset functionality, update `.env`:

```env
# Gmail configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
```

### Database Configuration
By default, the project uses SQLite. For PostgreSQL:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/hotel_db
```

## 🛠 Troubleshooting

### Common Issues:

#### 1. **Virtual Environment Issues**
```bash
# Mac/Linux
source hotel_env/bin/activate

# Windows
hotel_env\Scripts\activate
```

#### 2. **Port Already in Use**
```bash
# Kill process on port 8000 (Django)
lsof -ti:8000 | xargs kill -9

# Kill process on port 3000 (React)
lsof -ti:3000 | xargs kill -9
```

#### 3. **Module Not Found Errors**
```bash
# Reinstall Python dependencies
pip install -r requirements.txt

# Reinstall Node dependencies
npm install
```

#### 4. **Database Issues**
```bash
# Reset database
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

#### 5. **Permission Errors (Windows)**
```cmd
# Run as Administrator
# Or use PowerShell with execution policy:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Getting Help:

1. **Check the console logs** for error messages
2. **Verify all dependencies** are installed correctly
3. **Ensure both servers** (Django + React) are running
4. **Check firewall settings** if you can't access the servers

## 📝 Additional Notes

### Sample Data
The project includes sample CSV files for testing bulk operations:
- `sample_csv_files/rooms_sample.csv`
- `sample_csv_files/categories_sample.csv`
- `sample_csv_files/users_sample.csv`
- `sample_csv_files/bookings_sample.csv`

### Development Tips
- Use Django admin panel for quick data management
- Check browser developer tools for frontend debugging
- Monitor Django console for backend logs
- Use Swagger UI for API testing

### Production Deployment
For production deployment, consider:
- Setting `DEBUG=False` in Django settings
- Using PostgreSQL or MySQL instead of SQLite
- Configuring proper email backend
- Setting up static file serving
- Using environment variables for sensitive data

---

## 🎉 You're All Set!

Your hotel reservation system should now be running at:
- **Frontend**: http://localhost:3000
- **Backend**: http://127.0.0.1:8000
- **API Documentation**: http://127.0.0.1:8000/swagger/

**Developed by:** [@mohammadarif-github](https://github.com/mohammadarif-github)

Happy coding! 🚀
