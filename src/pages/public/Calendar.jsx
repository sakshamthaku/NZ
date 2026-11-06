import React, { useState, useEffect } from "react";

export default function CalendarComponent() {
  const STORAGE_KEY = "notez_calendar_marked_dates";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Initialize events safely from localStorage with robust error handling
  const [events, setEvents] = useState(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        return typeof parsed === "object" && parsed !== null ? parsed : {};
      }
    } catch (e) {
      console.error("Error reading marked dates from localStorage:", e);
    }
    return {};
  });

  const [eventInput, setEventInput] = useState("");

  // Save events/marked dates to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.error("Error saving marked dates to localStorage:", e);
    }
  }, [events]);

  // Get current year and month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of the month and total days in the month
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Date formatting key for events dictionary (YYYY-MM-DD)
  const getDateKey = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const activeDateKey = getDateKey(selectedDate);
  const currentDayEvents = events[activeDateKey] || [];

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!eventInput.trim()) return;

    const updatedEvents = {
      ...events,
      [activeDateKey]: [...currentDayEvents, eventInput.trim()]
    };
    setEvents(updatedEvents);
    setEventInput("");
  };

  const handleDeleteEvent = (index) => {
    const updatedList = currentDayEvents.filter((_, i) => i !== index);
    const updatedEvents = {
      ...events,
      [activeDateKey]: updatedList
    };
    // Clean up empty arrays to keep storage clean
    if (updatedList.length === 0) {
      delete updatedEvents[activeDateKey];
    }
    setEvents(updatedEvents);
  };

  return (
    <div className="cal-wrapper">
      <style>{`
        * {
          box-sizing: border-box;
        }
        .cal-wrapper {
          background-color: #f2f7f4;
          color: #1b382b;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 15px;
          width: 100%;
        }
        .cal-container {
          background: #ffffff;
          border: 1px solid #d0dfd6;
          box-shadow: 0 10px 30px rgba(46, 90, 70, 0.08);
          border-radius: 16px;
          max-width: 800px;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 320px;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .cal-container {
            grid-template-columns: 1fr;
          }
          .cal-wrapper {
            padding: 10px;
          }
        }
        .cal-main {
          padding: 25px;
        }
        @media (max-width: 480px) {
          .cal-main {
            padding: 15px;
          }
        }
        .cal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .cal-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #2d6a4f;
          margin: 0;
        }
        .cal-nav-btn {
          background: #eaf3ee;
          border: 1px solid #bce1ce;
          color: #2d6a4f;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
          font-size: 0.95rem;
        }
        .cal-nav-btn:hover {
          background: #2d6a4f;
          color: #ffffff;
        }
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          text-align: center;
        }
        .cal-day-name {
          font-size: 0.75rem;
          font-weight: 600;
          color: #739e88;
          padding-bottom: 8px;
        }
        .cal-day-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 0.85rem;
          cursor: pointer;
          user-select: none;
          transition: all 0.15s ease-in-out;
        }
        .cal-day-cell:hover {
          background-color: #eaf3ee;
        }
        .cal-day-cell.selected {
          background-color: #2d6a4f;
          color: #ffffff;
          font-weight: 600;
        }
        .cal-day-cell.today {
          border: 2px solid #2d6a4f;
        }
        .cal-day-cell.marked::after {
          content: '';
          position: absolute;
          bottom: 4px;
          width: 4px;
          height: 4px;
          background-color: #2d6a4f;
          border-radius: 50%;
        }
        .cal-day-cell {
          position: relative;
        }
        .cal-day-cell.selected.marked::after {
          background-color: #ffffff;
        }
        .cal-day-cell.empty {
          cursor: default;
        }
        .cal-sidebar {
          background: #f7faf8;
          border-left: 1px solid #e1eae4;
          padding: 25px 20px;
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 768px) {
          .cal-sidebar {
            border-left: none;
            border-top: 1px solid #e1eae4;
          }
        }
        .cal-sidebar-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #224d38;
          margin-bottom: 15px;
          word-break: break-word;
        }
        .cal-event-form {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }
        .cal-event-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #cddcd4;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.9rem;
          outline: none;
          min-width: 0;
        }
        .cal-event-input:focus {
          border-color: #2d6a4f;
        }
        .cal-add-btn {
          background: #2d6a4f;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          flex-shrink: 0;
        }
        .cal-add-btn:hover {
          background: #224d38;
        }
        .cal-event-list {
          list-style: none;
          overflow-y: auto;
          max-height: 250px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 0;
          margin: 0;
        }
        .cal-event-item {
          background: #ffffff;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #dce8e1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          word-break: break-word;
          gap: 10px;
        }
        .cal-delete-btn {
          background: none;
          border: none;
          color: #d9534f;
          cursor: pointer;
          font-weight: bold;
          font-size: 1.1rem;
          padding: 0 4px;
        }
        .cal-no-events {
          font-size: 0.85rem;
          color: #739e88;
          text-align: center;
          margin-top: 20px;
        }
      `}</style>

      <div className="cal-container">
        {/* Main Calendar View */}
        <div className="cal-main">
          <div className="cal-header">
            <h2 className="cal-title">
              {monthNames[month]} {year}
            </h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="cal-nav-btn" onClick={handlePrevMonth} aria-label="Previous Month">
                &lt;
              </button>
              <button className="cal-nav-btn" onClick={handleNextMonth} aria-label="Next Month">
                &gt;
              </button>
            </div>
          </div>

          <div className="cal-grid">
            {dayNames.map((d) => (
              <div key={d} className="cal-day-name">
                {d}
              </div>
            ))}

            {/* Empty boxes for offset days */}
            {Array.from({ length: firstDayIndex }).map((_, index) => (
              <div key={`empty-${index}`} className="cal-day-cell empty" />
            ))}

            {/* Actual days of the month */}
            {Array.from({ length: totalDays }).map((_, index) => {
              const dayNum = index + 1;
              const thisDate = new Date(year, month, dayNum);
              const dateKey = getDateKey(thisDate);
              
              const isSelected =
                selectedDate.getDate() === dayNum &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year;

              const isToday =
                new Date().getDate() === dayNum &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              const hasEvents = events[dateKey] && events[dateKey].length > 0;

              return (
                <div
                  key={dayNum}
                  className={`cal-day-cell ${isSelected ? "selected" : ""} ${
                    isToday && !isSelected ? "today" : ""
                  } ${hasEvents ? "marked" : ""}`}
                  onClick={() => setSelectedDate(thisDate)}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar for Events / Interactive Features */}
        <div className="cal-sidebar">
          <h3 className="cal-sidebar-title">
            Events for {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </h3>

          <form className="cal-event-form" onSubmit={handleAddEvent}>
            <input
              type="text"
              className="cal-event-input"
              placeholder="Add event..."
              value={eventInput}
              onChange={(e) => setEventInput(e.target.value)}
            />
            <button type="submit" className="cal-add-btn">
              +
            </button>
          </form>

          {currentDayEvents.length > 0 ? (
            <ul className="cal-event-list">
              {currentDayEvents.map((evt, index) => (
                <li key={index} className="cal-event-item">
                  <span>{evt}</span>
                  <button
                    className="cal-delete-btn"
                    onClick={() => handleDeleteEvent(index)}
                    aria-label="Delete event"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cal-no-events">No events scheduled for this day.</p>
          )}
        </div>
      </div>
    </div>
  );
}