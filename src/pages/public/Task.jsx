import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../firebase/Firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";

export default function Task() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // UI States
  const [activeTab, setActiveTab] = useState("all"); // all, today, upcoming, completed
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("Study");
  const [reminderTime, setReminderTime] = useState("");

  // Real-time Firestore sync bound strictly to authenticated user UID
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "tasks"),
        where("userId", "==", currentUser.uid)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedTasks = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          setTasks(fetchedTasks);
          setLoading(false);
          setError("");
        },
        (err) => {
          console.error("Firestore tasks listener error:", err);
          setError("Unable to load tasks. Please check your connection and try again.");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error initializing tasks subscription:", err);
      setError("Unable to load tasks.");
      setLoading(false);
    }
  }, [currentUser?.uid]);

  // Handle Create or Update Task
  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!title.trim() || !currentUser?.uid) return;

    // Resolve due date text/value
    let resolvedDate = dueDate;
    if (dueDate === "custom") {
      resolvedDate = customDate || "Today";
    } else if (dueDate === "today") {
      resolvedDate = "Today";
    } else if (dueDate === "tomorrow") {
      resolvedDate = "Tomorrow";
    }

    try {
      if (editingTask) {
        // Update existing task
        const taskRef = doc(db, "tasks", editingTask.id);
        await updateDoc(taskRef, {
          title: title.trim(),
          description: description.trim(),
          dueDate: resolvedDate,
          priority,
          category,
          reminderTime,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new task
        await addDoc(collection(db, "tasks"), {
          userId: currentUser.uid,
          title: title.trim(),
          description: description.trim(),
          completed: false,
          dueDate: resolvedDate,
          priority,
          category,
          reminderTime,
          createdAt: serverTimestamp(),
        });
      }
      closeModal();
    } catch (err) {
      console.error("Error saving task:", err);
      setError("Failed to save task. Please try again.");
    }
  };

  // Toggle Completion Status
  const toggleComplete = async (task) => {
    try {
      const taskRef = doc(db, "tasks", task.id);
      await updateDoc(taskRef, {
        completed: !task.completed,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error updating task completion:", err);
      setError("Failed to update task status.");
    }
  };

  // Confirm and Execute Deletion
  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteDoc(doc(db, "tasks", taskToDelete));
      setTaskToDelete(null);
    } catch (err) {
      console.error("Error deleting task:", err);
      setError("Failed to delete task.");
    }
  };

  // Open modal for editing
  const openEditModal = (task) => {
    setEditingTask(task);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setDueDate(task.dueDate === "Today" || task.dueDate === "Tomorrow" ? task.dueDate.toLowerCase() : "custom");
    setCustomDate(task.dueDate !== "Today" && task.dueDate !== "Tomorrow" ? task.dueDate : "");
    setPriority(task.priority || "medium");
    setCategory(task.category || "Study");
    setReminderTime(task.reminderTime || "");
    setIsModalOpen(true);
  };

  // Reset and close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setDueDate("today");
    setCustomDate("");
    setPriority("medium");
    setCategory("Study");
    setReminderTime("");
  };

  // Calculations for Summary Cards & Progress
  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const remainingCount = totalTasks - completedCount;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Filter Tasks based on tabs
  const filteredTasks = tasks.filter((task) => {
    if (activeTab === "today") {
      return task.dueDate === "Today" && !task.completed;
    }
    if (activeTab === "upcoming") {
      return task.dueDate !== "Today" && !task.completed;
    }
    if (activeTab === "completed") {
      return task.completed;
    }
    return true; // "all"
  });

  // Category Icon helper
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case "Study": return "📚";
      case "Assignment": return "📝";
      case "Project": return "💻";
      case "Personal": return "👤";
      default: return "📌";
    }
  };

  // Priority Dot Color helper
  const getPriorityColor = (p) => {
    switch (p) {
      case "high": return "#d9534f";
      case "medium": return "#f0ad4e";
      case "low": return "#5cb85c";
      default: return "#5cb85c";
    }
  };

  return (
    <div className="task-page-wrapper">
      <style>{`
        .task-page-wrapper {
          background-color: #f4f7f5;
          color: #2b3a32;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          min-height: 100vh;
          padding: 30px 20px;
          display: flex;
          justify-content: center;
        }
        .task-container {
          max-width: 840px;
          width: 100%;
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .task-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
          background: #ffffff;
          padding: 24px;
          border-radius: 14px;
          border: 1px solid #d4e2dc;
          box-shadow: 0 4px 12px rgba(45, 106, 79, 0.04);
        }
        .task-header-row h1 {
          font-size: 1.6rem;
          color: #1b382b;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .task-header-row p {
          color: #5a7a6b;
          font-size: 0.92rem;
        }
        .add-task-main-btn {
          background: #2d6a4f;
          color: #ffffff;
          padding: 10px 18px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 2px 6px rgba(45, 106, 79, 0.2);
          white-space: nowrap;
        }
        .add-task-main-btn:hover {
          background: #224d38;
          transform: translateY(-1px);
        }
        .error-banner {
          background: #fdf2f2;
          color: #d9534f;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #f5c6cb;
          margin-bottom: 20px;
          font-size: 0.9rem;
        }
        .loading-state, .empty-state {
          text-align: center;
          padding: 50px 20px;
          background: #ffffff;
          border-radius: 12px;
          border: 1px dashed #d4e2dc;
          color: #6b8a7a;
          margin-bottom: 20px;
        }
        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 10px;
        }
        .empty-state h3 {
          color: #1b382b;
          font-size: 1.1rem;
          margin-bottom: 6px;
        }
        .empty-state p {
          font-size: 0.9rem;
          margin-bottom: 16px;
        }
        
        /* Summary & Progress Section */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        @media (max-width: 600px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }
          .task-header-row {
            flex-direction: column;
            gap: 16px;
          }
          .add-task-main-btn {
            width: 100%;
            text-align: center;
          }
        }
        .summary-card {
          background: #ffffff;
          border: 1px solid #d4e2dc;
          border-radius: 10px;
          padding: 16px;
          text-align: center;
          box-shadow: 0 2px 6px rgba(45, 106, 79, 0.02);
        }
        .summary-card span {
          display: block;
          font-size: 0.82rem;
          color: #6b8a7a;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .summary-card h3 {
          font-size: 1.5rem;
          color: #1b382b;
          font-weight: 700;
        }
        .progress-box {
          background: #ffffff;
          border: 1px solid #d4e2dc;
          border-radius: 10px;
          padding: 16px 20px;
          margin-bottom: 25px;
        }
        .progress-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.88rem;
          font-weight: 600;
          color: #2b3a32;
          margin-bottom: 8px;
        }
        .progress-bar-bg {
          background: #eaf3ee;
          height: 10px;
          border-radius: 5px;
          overflow: hidden;
        }
        .progress-bar-fill {
          background: #2d6a4f;
          height: 100%;
          border-radius: 5px;
          transition: width 0.4s ease;
        }

        /* Filter Tabs */
        .task-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .task-tabs button {
          background: #eaf3ee;
          border: 1px solid #bce1ce;
          color: #224d38;
          padding: 8px 16px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .task-tabs button:hover {
          background: #d8ece2;
        }
        .task-tabs button.active {
          background: #2d6a4f;
          color: #ffffff;
          border-color: #2d6a4f;
        }

        /* Task Cards List */
        .task-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .task-card {
          background: #ffffff;
          border: 1px solid #d4e2dc;
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .task-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(45, 106, 79, 0.05);
        }
        .task-main-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .task-left-info {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex: 1;
        }
        .task-checkbox {
          appearance: none;
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border: 2px solid #2d6a4f;
          border-radius: 5px;
          background: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
          transition: background 0.2s, border-color 0.2s;
        }
        .task-checkbox:checked {
          background: #2d6a4f;
          border-color: #2d6a4f;
        }
        .task-checkbox:checked::after {
          content: '✓';
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        .task-title-area h4 {
          font-size: 1.02rem;
          font-weight: 600;
          color: #1b382b;
          margin-bottom: 3px;
        }
        .task-title-area h4.completed-text {
          text-decoration: line-through;
          color: #8fa89b;
        }
        .task-title-area p {
          font-size: 0.88rem;
          color: #5a7a6b;
          line-height: 1.4;
        }
        .priority-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.78rem;
          font-weight: 600;
          text-transform: capitalize;
          background: #f4f7f5;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid #d4e2dc;
          white-space: nowrap;
        }
        .priority-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .task-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #edf2ef;
          padding-top: 10px;
          margin-top: 4px;
        }
        .task-meta-tags {
          display: flex;
          gap: 10px;
          font-size: 0.8rem;
          color: #6b8a7a;
          align-items: center;
        }
        .category-tag {
          background: #eaf3ee;
          color: #2d6a4f;
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 600;
        }
        .task-action-btns {
          display: flex;
          gap: 6px;
        }
        .task-edit-btn, .task-delete-btn {
          background: none;
          border: 1px solid transparent;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.78rem;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s;
        }
        .task-edit-btn {
          color: #2d6a4f;
          background: #eaf3ee;
        }
        .task-edit-btn:hover {
          background: #d8ece2;
        }
        .task-delete-btn {
          color: #d9534f;
          background: #fdf2f2;
        }
        .task-delete-btn:hover {
          background: #fae1e1;
        }

        /* Modal / Form Styles */
        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(27, 56, 43, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(2px);
          animation: fadeIn 0.2s ease-in-out;
          padding: 20px;
        }
        .modal-card {
          background: #ffffff;
          padding: 24px;
          border-radius: 14px;
          max-width: 480px;
          width: 100%;
          border: 1px solid #d4e2dc;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-card h3 {
          font-size: 1.2rem;
          color: #1b382b;
          margin-bottom: 16px;
          font-weight: 700;
        }
        .form-group {
          margin-bottom: 14px;
        }
        .form-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #2b3a32;
          margin-bottom: 5px;
        }
        .form-group input, .form-group textarea, .form-group select {
          width: 100%;
          padding: 10px 12px;
          background: #ffffff;
          border: 1px solid #d4e2dc;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.9rem;
          color: #2b3a32;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
          border-color: #2d6a4f;
        }
        .form-group textarea {
          resize: vertical;
          min-height: 70px;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }
        .modal-cancel-btn {
          background: #eaf3ee;
          color: #2b3a32;
          border: none;
          padding: 9px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.88rem;
        }
        .modal-cancel-btn:hover {
          background: #d8ece2;
        }
        .modal-save-btn {
          background: #2d6a4f;
          color: #ffffff;
          border: none;
          padding: 9px 18px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.88rem;
        }
        .modal-save-btn:hover {
          background: #224d38;
        }
        
        /* Delete Confirm Specific */
        .confirm-modal-content {
          background: #ffffff;
          padding: 24px;
          border-radius: 12px;
          max-width: 360px;
          width: 90%;
          border: 1px solid #d4e2dc;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          text-align: center;
        }
        .confirm-modal-content h3 {
          font-size: 1.1rem;
          color: #1b382b;
          margin-bottom: 8px;
        }
        .confirm-modal-content p {
          font-size: 0.88rem;
          color: #5a7a6b;
          margin-bottom: 20px;
        }
        .confirm-delete-btn {
          background: #d9534f;
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.85rem;
        }
        .confirm-delete-btn:hover {
          background: #c9302c;
        }
      `}</style>

      <div className="task-container">
        {/* Header */}
        <div className="task-header-row">
          <div>
            <h1>Mini Tasks</h1>
            <p>Manage your daily to-dos and stay organized.</p>
          </div>
          <button className="add-task-main-btn" onClick={() => setIsModalOpen(true)}>
            + Add Task
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Loading State */}
        {loading ? (
          <div className="loading-state">Loading your tasks...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="summary-grid">
              <div className="summary-card">
                <span>Total Tasks</span>
                <h3>{totalTasks}</h3>
              </div>
              <div className="summary-card">
                <span>Completed</span>
                <h3>{completedCount}</h3>
              </div>
              <div className="summary-card">
                <span>Remaining</span>
                <h3>{remainingCount}</h3>
              </div>
            </div>

            {/* Today's Progress Bar */}
            <div className="progress-box">
              <div className="progress-label-row">
                <span>Today's Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="task-tabs">
              <button 
                className={activeTab === "all" ? "active" : ""} 
                onClick={() => setActiveTab("all")}
              >
                All ({totalTasks})
              </button>
              <button 
                className={activeTab === "today" ? "active" : ""} 
                onClick={() => setActiveTab("today")}
              >
                Today ({tasks.filter(t => t.dueDate === "Today" && !t.completed).length})
              </button>
              <button 
                className={activeTab === "upcoming" ? "active" : ""} 
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming ({tasks.filter(t => t.dueDate !== "Today" && !t.completed).length})
              </button>
              <button 
                className={activeTab === "completed" ? "active" : ""} 
                onClick={() => setActiveTab("completed")}
              >
                Completed ({completedCount})
              </button>
            </div>

            {/* Task List / Empty State */}
            {filteredTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">{activeTab === "today" ? "☀️" : "✓"}</div>
                <h3>{activeTab === "today" ? "Nothing planned for today." : "You're all caught up!"}</h3>
                <p>{activeTab === "today" ? "Enjoy your free time or add a new task." : "No tasks to show in this view."}</p>
                <button className="add-task-main-btn" onClick={() => setIsModalOpen(true)}>
                  + Add Task
                </button>
              </div>
            ) : (
              <div className="task-list">
                {filteredTasks.map((task) => (
                  <div className="task-card" key={task.id}>
                    <div className="task-main-row">
                      <div className="task-left-info">
                        <input 
                          type="checkbox" 
                          className="task-checkbox"
                          checked={task.completed}
                          onChange={() => toggleComplete(task)}
                        />
                        <div className="task-title-area">
                          <h4 className={task.completed ? "completed-text" : ""}>
                            {task.title}
                          </h4>
                          {task.description && <p>{task.description}</p>}
                        </div>
                      </div>

                      <div className="priority-indicator">
                        <span 
                          className="priority-dot" 
                          style={{ backgroundColor: getPriorityColor(task.priority) }}
                        />
                        {task.priority}
                      </div>
                    </div>

                    <div className="task-footer-row">
                      <div className="task-meta-tags">
                        <span className="category-tag">
                          {getCategoryIcon(task.category)} {task.category}
                        </span>
                        <span>📅 {task.dueDate}</span>
                        {task.reminderTime && <span>⏰ {task.reminderTime}</span>}
                      </div>

                      <div className="task-action-btns">
                        <button className="task-edit-btn" onClick={() => openEditModal(task)}>
                          ✏ Edit
                        </button>
                        <button className="task-delete-btn" onClick={() => setTaskToDelete(task.id)}>
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Add / Edit Task Modal */}
        {isModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <h3>{editingTask ? "Edit Task" : "Add New Task"}</h3>
              <form onSubmit={handleSaveTask}>
                <div className="form-group">
                  <label>Task Title *</label>
                  <input 
                    type="text" 
                    placeholder="What do you need to do?" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea 
                    placeholder="Add a short description..." 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label>Due Date</label>
                  <select value={dueDate} onChange={(e) => setDueDate(e.target.value)}>
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="custom">Custom Date</option>
                  </select>
                </div>

                {dueDate === "custom" && (
                  <div className="form-group">
                    <label>Specify Date</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 12 Aug, Next Monday..." 
                      value={customDate} 
                      onChange={(e) => setCustomDate(e.target.value)} 
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Study">Study</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Project">Project</option>
                    <option value="Personal">Personal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Reminder Time (Optional)</label>
                  <input 
                    type="time" 
                    value={reminderTime} 
                    onChange={(e) => setReminderTime(e.target.value)} 
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="modal-cancel-btn" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="modal-save-btn">
                    {editingTask ? "Save Changes" : "Add Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {taskToDelete && (
          <div className="modal-backdrop">
            <div className="confirm-modal-content">
              <h3>Delete this task?</h3>
              <p>This task will be permanently removed.</p>
              <div className="modal-actions" style={{ justifyContent: "center" }}>
                <button className="modal-cancel-btn" onClick={() => setTaskToDelete(null)}>
                  Cancel
                </button>
                <button className="confirm-delete-btn" onClick={confirmDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}