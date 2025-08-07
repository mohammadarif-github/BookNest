import React, { Component } from "react";
import axios from "axios";
import { buildURL, endpoints } from "./config/api";
import { Navigate } from "react-router-dom";

// Configure axios defaults for CORS
axios.defaults.withCredentials = true;

// Security utilities
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Token validation error:', error);
    return true;
  }
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

export const MyContext = React.createContext();

class Context extends Component {
  constructor(props) {
    super(props);

    this.state = {
      username: "",
      user_id: "",
      isUserAuthenticated: false,
      token: "",
      isAdmin: false,
      userRole: null, // 'admin', 'manager', 'staff', 'guest'
      userPermissions: [],
      userDepartment: null,
      rooms: [],
      sortedRooms: [],
      featuredRooms: [],
      checkedInRooms: [],
      filteredCheckedInRooms: [],
      loading: true,
      category_name: "all",
      capacity: "all",
      price_per_night: 0,
      maxPrice: 0,
      minPrice: 0,
      maxRoomSize: 0,
      minRoomSize: 0,
      reserved: false,
      searchKey: "",
      dateFilteredRoomIds: null, // Store available room IDs from date filter
    };
  }
  componentDidMount() {
    axios
      .get(buildURL(endpoints.ROOMS_LIST))
      .then((response) => {
        // Handle new API response format
        const roomsData = response.data.success ? response.data.data : response.data;
        
        let featured = roomsData.filter((room) => room.featured);
        let minPrice = Math.min(...roomsData.map(room => parseFloat(room.price_per_night.replace(/,/g, ''))));
        let maxPrice = Math.max(...roomsData.map(room => parseFloat(room.price_per_night.replace(/,/g, ''))));
        
        let maxRoomSize = Math.max(...roomsData.map(room => {
          const sizeStr = room.room_size.toString();
          return parseInt(sizeStr.replace(/[^\d]/g, '')) || 0;
        }));
        let minRoomSize = Math.min(...roomsData.map(room => {
          const sizeStr = room.room_size.toString();
          return parseInt(sizeStr.replace(/[^\d]/g, '')) || 0;
        }));
        
        // Secure token validation
        let token = localStorage.getItem("access-token");
        let username = "";
        let auth = false;
        let user_id = "";
        let is_admin = false;
        let userRole = localStorage.getItem("user_role");
        let userDepartment = localStorage.getItem("user_department");
        
        if (token && !isTokenExpired(token)) {
          auth = true;
          username = localStorage.getItem("username");
          user_id = localStorage.getItem("user_id");
          is_admin = localStorage.getItem("is_admin");
          is_admin = is_admin === "true" ? true : false;
          
          // Fetch user role if not in localStorage or if we need to verify it
          if (!userRole) {
            this.fetchUserRole(token).then((fetchedRole) => {
              userRole = fetchedRole;
              this.setState({ userRole: fetchedRole });
            });
          }
        } else if (token && isTokenExpired(token)) {
          // Token expired, clear storage
          this.clearAuthStorage();
        }

        this.setState({
          isUserAuthenticated: auth,
          username: username,
          user_id: user_id,
          token: token,
          isAdmin: is_admin,
          userRole: userRole,
          userDepartment: userDepartment,
          rooms: roomsData,
          sortedRooms: roomsData,
          featuredRooms: featured,
          price_per_night: maxPrice,
          minPrice: minPrice,
          maxPrice: maxPrice,
          maxRoomSize: maxRoomSize,
          minRoomSize: minRoomSize,
          loading: false,
        });
      })
      .then((response) => {
        if (this.state.isAdmin) {
          this.setCheckedInRooms();
        }
      })
      .catch((error) => {
        // Handle error silently or show user-friendly message
        this.setState({ loading: false });
      });
  }

  // Clear authentication storage
  clearAuthStorage = () => {
    localStorage.removeItem("access-token");
    localStorage.removeItem("username");
    localStorage.removeItem("user_id");
    localStorage.removeItem("is_admin");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_department");
  };

  // Fetch user role from backend
  fetchUserRole = async (token) => {
    try {
      const axiosConfig = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      };
      
      const response = await axios.get(buildURL(endpoints.PROFILE), axiosConfig);
      
      if (response.data.success && response.data.data.booknest_role) {
        const roleData = response.data.data.booknest_role;
        const role = roleData.role;
        const department = roleData.department;
        
        localStorage.setItem("user_role", role);
        localStorage.setItem("user_department", department || "");
        
        this.setState({
          userRole: role,
          userDepartment: department,
        });
        
        return role;
      } else {
        // Fallback to guest role if no booknest role found
        localStorage.setItem("user_role", "guest");
        this.setState({ userRole: "guest" });
        return "guest";
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      // Set guest role as fallback
      localStorage.setItem("user_role", "guest");
      this.setState({ userRole: "guest" });
      return "guest";
    }
  };

  // Check if user has specific role
  hasRole = (role) => {
    return this.state.userRole === role;
  };

  // Check if user has any of the specified roles
  hasAnyRole = (roles) => {
    return roles.includes(this.state.userRole);
  };

  // Check if user can access management features
  canAccessManagement = () => {
    return this.hasAnyRole(['admin', 'manager']);
  };

  // Check if user can access admin features
  canAccessAdmin = () => {
    return this.hasRole('admin');
  };

  handleChange = (event) => {
    const name = event.target.name;
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    // filterRooms is a call back function. This will be called only afer the state changes.
    this.setState(
      {
        [name]: value,
      },
      this.filterRooms
    );
  };
  filterRooms = () => {
    let {
      rooms,
      category_name,
      capacity,
      price_per_night,
      minRoomSize,
      maxRoomSize,
      reserved,
      dateFilteredRoomIds,
    } = this.state;
    
    let filtredRooms = [...rooms];
    
    // Filter by date availability first if date filter is active
    if (dateFilteredRoomIds !== null) {
      filtredRooms = filtredRooms.filter(room => 
        dateFilteredRoomIds.includes(room.id)
      );
    }
    
    // Filter by category
    if (category_name !== "all") {
      filtredRooms = filtredRooms.filter(
        (room) => room.category_name === category_name
      );
    }
    
    // Filter by capacity (minimum capacity required)
    if (capacity && capacity !== "all") {
      filtredRooms = filtredRooms.filter(
        (room) => room.capacity >= parseInt(capacity)
      );
    }

    // Filter by price (maximum price)
    if (price_per_night) {
      filtredRooms = filtredRooms.filter((room) => {
        // Parse price string like "250.000" to number
        const roomPrice = parseFloat(room.price_per_night.replace(/,/g, ''));
        const maxPrice = parseFloat(price_per_night);
        return roomPrice <= maxPrice;
      });
    }
    
    // Filter by room size (parse room size strings like "50m²" or "50")
    if (minRoomSize && maxRoomSize) {
      filtredRooms = filtredRooms.filter((room) => {
        // Extract numeric value from room size string
        const roomSizeStr = room.room_size.toString();
        const roomSizeNum = parseInt(roomSizeStr.replace(/[^\d]/g, '')) || 0;
        const minSize = parseInt(minRoomSize) || 0;
        const maxSize = parseInt(maxRoomSize) || 999;
        return roomSizeNum >= minSize && roomSizeNum <= maxSize;
      });
    }

    // Filter by availability (show only available rooms)
    if (reserved) {
      filtredRooms = filtredRooms.filter((room) => room.is_booked === false);
    }
    
    this.setState({
      sortedRooms: filtredRooms,
    });
  };

  // Filter rooms by date availability
  filterByDateAvailability = (availableRoomIds) => {
    this.setState({
      dateFilteredRoomIds: availableRoomIds
    }, this.filterRooms);
  };

  clearAllFilters = () => {
    this.setState({
      category_name: "all",
      capacity: "all", 
      price_per_night: this.state.maxPrice,
      reserved: false,
      dateFilteredRoomIds: null
    }, this.filterRooms); // Call filterRooms after state update
  };

  createAlert(message, type, id_of_alert_tag) {
    let alert_location = document.querySelector(`#${id_of_alert_tag}`);
    alert_location.setAttribute("class", `alert alert-${type}`);
    let link = document.createElement("a");
    let link_id = "close-alert";
    let link_text = document.createTextNode(`  X`);
    link.setAttribute("href", "#");
    link.setAttribute("id", link_id);
    link.appendChild(link_text);
    alert_location.innerHTML = message;
    alert_location.appendChild(link);
    alert_location.style.display = "block";
    let link_action = document.querySelector(`#${link_id}`);
    link_action.addEventListener(
      "click",
      () =>
        (document.querySelector("#login-error-header").style.display = "none")
    );
  }

  // Secure login method with input sanitization
  handleLogin = (event, data, navigate) => {
    return new Promise((resolve, reject) => {
      event.preventDefault();
      
      // Sanitize inputs
      const sanitizedUsername = sanitizeInput(data.username);
      const sanitizedPassword = data.password; // Don't sanitize password as it might contain special chars

      if (!sanitizedUsername || !sanitizedPassword) {
        reject(new Error("Please enter both username and password"));
        return;
      }

      const loginData = {
        username: sanitizedUsername,
        password: sanitizedPassword,
      };

      axios
        .post(buildURL(endpoints.LOGIN), loginData)
        .then((response) => {
          if (response.data.message === "login successful") {
            const { access, username, user_id, is_admin } = response.data;
            
            // Validate token before storing
            if (access && !isTokenExpired(access)) {
              localStorage.setItem("access-token", access);
              localStorage.setItem("user_id", user_id);
              localStorage.setItem("username", username);
              localStorage.setItem("is_admin", is_admin);

              this.setState({
                username: username,
                user_id: user_id,
                isUserAuthenticated: true,
                token: access,
                isAdmin: is_admin,
              });

              // Fetch user role after successful login
              this.fetchUserRole(access).then((role) => {
                // Navigate based on role
                if (role && ['admin', 'manager', 'staff'].includes(role)) {
                  navigate("/dashboard");
                } else {
                  navigate("/");
                }
                resolve(response);
              });
            } else {
              reject(new Error("Invalid token received. Please try again."));
            }
          } else {
            reject(new Error(response.data.message || "Login failed"));
          }
        })
        .catch((err) => {
          console.error("Login error:", err);
          if (err.response?.status === 429) {
            reject(new Error("Too many login attempts. Please wait before trying again."));
          } else if (err.response?.status === 401) {
            reject(new Error("Invalid username or password"));
          } else {
            reject(new Error("Login failed. Please check your connection and try again."));
          }
        });
    });
  };

  setCheckedInRooms = () => {
    const axiosConfig = {
      headers: {
        Authorization: `Bearer ${this.state.token}`,
      },
      withCredentials: true,
    };
    if (this.state.isAdmin) {
      axios
        .get(
          buildURL(endpoints.CHECKED_IN_ROOMS),
          axiosConfig
        )
        .then((response) => {
          // Handle new API response format
          const checkedInData = response.data.success ? response.data.data : response.data;
          
          this.setState({
            checkedInRooms: checkedInData,
            filteredCheckedInRooms: checkedInData,
          });
        })
        .catch((error) => {
          console.log(error.message);
        });
    }
  };

  handleCheckOut = (room_id) => {
    const axiosConfig = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.state.token}`,
      },
      withCredentials: true,
    };
    axios
      .post(buildURL(endpoints.CHECKOUT), { pk: room_id }, axiosConfig)
      .then((response) => {
        this.state.rooms.forEach((room) => {
          if (room.id === room_id) {
            room.is_booked = false;
          }
        });
        let updateCheckedInRooms = this.state.checkedInRooms.filter(
          (room) => room.room_id !== room_id
        );
        this.setState({
          checkedInRooms: updateCheckedInRooms,
          filteredCheckedInRooms: updateCheckedInRooms,
        });
        
        // Handle new API response format for messages
        const message = response.data.success ? response.data.message : response.data;
        document.getElementById(
          "common-message"
        ).innerHTML = message;
        setTimeout(function () {
          document.getElementById("common-message").innerHTML = "";
        }, 3000);
      })
      .catch((error) => {
        // Handle checkout error gracefully
      });
  };

  handleBook = (id) => {
    this.state.rooms.forEach((room) => {
      if (room.id === id) {
        room.is_booked = true;
      }
    });
  };

  handleLogout = () => {
    this.clearAuthStorage();
    this.setState({
      isUserAuthenticated: false,
      username: "",
      token: "",
      user_id: "",
      isAdmin: false,
      userRole: null,
      userDepartment: null,
      userPermissions: [],
    });
    return <Navigate to="/" replace />;
  };

  handleRegister = (event, data, navigate) => {
    return new Promise((resolve, reject) => {
      event.preventDefault();
      axios
        .post(buildURL(endpoints.REGISTER), data)
        .then((response) => {
          resolve(response);
          // Don't navigate here, let the component handle it
        })
        .catch((error) => {
          // Return structured error information
          let errorMessage = 'Registration failed. Please try again.';
          if (error.response && error.response.data) {
            const errors = [];
            for(let field in error.response.data) {
              if (Array.isArray(error.response.data[field])) {
                errors.push(...error.response.data[field]);
              } else {
                errors.push(error.response.data[field]);
              }
            }
            if (errors.length > 0) {
              errorMessage = errors.join(' ');
            }
          }
          reject(new Error(errorMessage));
        });
    });
  };

  handleSearchKey = (event) => {
    this.setState(
      {
        searchKey: event.target.value,
      },
      this.filterCheckedInRooms
    );
  };

  filterCheckedInRooms = () => {
    if (this.state.searchKey !== "") {
      let searchedRooms = this.state.filteredCheckedInRooms.filter((room) =>
        room.room_slug.toString().includes(this.state.searchKey)
      );
      this.setState({
        filteredCheckedInRooms: searchedRooms,
      });
    } else {
      this.setState({
        filteredCheckedInRooms: this.state.checkedInRooms,
      });
    }
  };

  render() {
    return (
      <MyContext.Provider
        value={{
          ...this.state,
          handleChange: this.handleChange,
          login: this.handleLogin,
          logout: this.handleLogout,
          register: this.handleRegister,
          handleBook: this.handleBook,
          checkout: this.handleCheckOut,
          searchBy: this.handleSearchKey,
          hasRole: this.hasRole,
          hasAnyRole: this.hasAnyRole,
          canAccessManagement: this.canAccessManagement,
          canAccessAdmin: this.canAccessAdmin,
          fetchUserRole: this.fetchUserRole,
          clearAllFilters: this.clearAllFilters,
          filterByDateAvailability: this.filterByDateAvailability,
        }}
      >
        {this.props.children}
      </MyContext.Provider>
    );
  }
}
export default Context;
