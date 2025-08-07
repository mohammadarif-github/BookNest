import React, { useContext } from "react";
import { MyContext } from "../Context";
import RoomsFilter from "../components/RoomsFilter";
import Title from "../components/Title";
import RoomList from "../components/RoomList";
// import Pagination from '../components/Pagination';s

export default function RoomPage() {
  // const [currentPage, setCurrentPage] = useState(1);
  // const roomsPerpage = 2;
  const contextData = useContext(MyContext);
  const { sortedRooms, rooms } = contextData;
  // let lastRoom = roomsPerpage * currentPage;
  // let firstRoom = lastRoom - roomsPerpage;

  // const paginate = (page) => {
  //   setCurrentPage(page);
  // }
  return (
    <>
      <div className="container">
        <Title title="Filter Rooms" />
        <RoomsFilter />
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Title title="Rooms" />
          <div className="badge bg-primary fs-6">
            {sortedRooms.length} of {rooms.length} rooms
          </div>
        </div>
        <div className="room-list">
          {sortedRooms.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-search fa-3x text-muted mb-3"></i>
              <h3 className="text-muted">No rooms found</h3>
              <p className="text-muted">Try adjusting your filters to see more results</p>
            </div>
          ) : (
            <RoomList rooms={sortedRooms} />
          )}
        </div>
        {/* <Pagination totalNumberofRooms={sortedRooms.length} roomsPerPage={roomsPerpage} paginate={paginate} /> */}
      </div>
    </>
  );
}
