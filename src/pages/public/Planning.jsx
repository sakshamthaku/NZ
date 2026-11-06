import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from "../../firebase/Firebase";

const Planning = () => {
  // State management for plans and UI
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);
  
  // Tab filtering: 'today' | 'upcoming' | 'completed'
  const [activeTab, setActiveTab] = useState('today');
  
  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    category: 'Work',
    priority: 'Medium',
    reminderEnabled: true,
    reminder1Time: '',
    reminder2Time: '',
  });

  // Fetch plans from Firestore for the authenticated user
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const plansRef = collection(db, `users/${user.uid}/plans`);
    const unsubscribe = onSnapshot(plansRef, (snapshot) => {
      const plansList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlans(plansList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching plans: ", error);
      showStatus("Failed to load plans.", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper to show temporary status messages
  const showStatus = (msg, type = 'success') => {
    setStatusMessage({ msg, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      category: 'Work',
      priority: 'Medium',
      reminderEnabled: true,
      reminder1Time: '',
      reminder2Time: '',
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (plan) => {
    setEditingId(plan.id);
    setFormData({
      title: plan.title || '',
      description: plan.description || '',
      date: plan.date || new Date().toISOString().split('T')[0],
      startTime: plan.startTime || '09:00',
      endTime: plan.endTime || '10:00',
      category: plan.category || 'Work',
      priority: plan.priority || 'Medium',
      reminderEnabled: plan.reminderEnabled ?? true,
      reminder1Time: plan.reminder1Time || '',
      reminder2Time: plan.reminder2Time || '',
    });
    setIsModalOpen(true);
  };

  // Save Plan (Create or Update)
  const handleSavePlan = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      showStatus("You must be logged in to save plans.", "error");
      return;
    }

    if (!formData.title.trim()) {
      showStatus("Plan title is required.", "error");
      return;
    }

    try {
      const plansRef = collection(db, `users/${user.uid}/plans`);
      if (editingId) {
        const planDocRef = doc(db, `users/${user.uid}/plans`, editingId);
        await updateDoc(planDocRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
        showStatus("Plan updated successfully!");
      } else {
        await addDoc(plansRef, {
          ...formData,
          completed: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        showStatus("Plan created successfully!");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving plan: ", error);
      showStatus("Error saving plan. Please try again.", "error");
    }
  };

  // Toggle Completion Status
  const handleToggleComplete = async (plan) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const planDocRef = doc(db, `users/${user.uid}/plans`, plan.id);
      await updateDoc(planDocRef, {
        completed: !plan.completed,
        updatedAt: serverTimestamp()
      });
      showStatus(plan.completed ? "Plan marked as incomplete." : "Plan marked as completed!");
    } catch (error) {
      console.error("Error updating completion status: ", error);
      showStatus("Failed to update status.", "error");
    }
  };

  // Toggle Individual Reminder Status
  const handleToggleReminder = async (plan) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const planDocRef = doc(db, `users/${user.uid}/plans`, plan.id);
      await updateDoc(planDocRef, {
        reminderEnabled: !(plan.reminderEnabled ?? true),
        updatedAt: serverTimestamp()
      });
      showStatus(`Reminders ${!(plan.reminderEnabled ?? true) ? 'enabled' : 'disabled'} for this plan.`);
    } catch (error) {
      console.error("Error toggling reminder: ", error);
      showStatus("Failed to update reminder setting.", "error");
    }
  };

  // Delete Plan
  const handleDeletePlan = async (id) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteDoc(doc(db, `users/${user.uid}/plans`, id));
      showStatus("Plan deleted successfully.");
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Error deleting plan: ", error);
      showStatus("Failed to delete plan.", "error");
    }
  };

  // Filtering Logic
  const todayStr = new Date().toISOString().split('T')[0];
  
  const filteredPlans = plans.filter(plan => {
    if (activeTab === 'completed') {
      return plan.completed === true;
    }
    if (plan.completed) return false; // Hide completed from 'today' and 'upcoming' tabs for clarity

    if (activeTab === 'today') {
      return plan.date === todayStr;
    }
    if (activeTab === 'upcoming') {
      return plan.date > todayStr;
    }
    return true;
  });

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Planner & Reminders</h1>
          <p style={styles.subtitle}>Organize your schedule, set automated alerts, and track daily goals.</p>
        </div>
        <button style={styles.primaryButton} onClick={handleOpenCreate}>
          + Create New Plan
        </button>
      </div>

      {/* Status Message Toast */}
      {statusMessage && (
        <div style={{
          ...styles.toast, 
          backgroundColor: statusMessage.type === 'error' ? '#EF4444' : '#10B981'
        }}>
          {statusMessage.msg}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={styles.tabsContainer}>
        <button 
          style={{ ...styles.tabButton, ...(activeTab === 'today' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('today')}
        >
          Today's Plans
        </button>
        <button 
          style={{ ...styles.tabButton, ...(activeTab === 'upcoming' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming Plans
        </button>
        <button 
          style={{ ...styles.tabButton, ...(activeTab === 'completed' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
      </div>

      {/* Content Area / List */}
      {loading ? (
        <div style={styles.centerState}>Loading your plans...</div>
      ) : filteredPlans.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📅</div>
          <h3>No plans found</h3>
          <p style={styles.emptyText}>
            {activeTab === 'today' && "You have no plans scheduled for today. Enjoy your free time or add a new task!"}
            {activeTab === 'upcoming' && "No upcoming plans scheduled ahead. Stay ahead by planning early."}
            {activeTab === 'completed' && "No completed plans yet. Check off items as you finish them!"}
          </p>
          <button style={styles.secondaryButton} onClick={handleOpenCreate}>
            Create a Plan Now
          </button>
        </div>
      ) : (
        <div style={styles.gridContainer}>
          {filteredPlans.map(plan => (
            <div key={plan.id} style={{
              ...styles.card,
              opacity: plan.completed ? 0.75 : 1,
              borderLeft: `5px solid ${getPriorityColor(plan.priority)}`
            }}>
              <div style={styles.cardHeader}>
                <span style={styles.categoryBadge}>{plan.category || 'General'}</span>
                <span style={{
                  ...styles.priorityBadge,
                  backgroundColor: getPriorityBg(plan.priority),
                  color: getPriorityColor(plan.priority)
                }}>
                  {plan.priority}
                </span>
              </div>

              <h3 style={{
                ...styles.cardTitle,
                textDecoration: plan.completed ? 'line-through' : 'none'
              }}>
                {plan.title}
              </h3>

              {plan.description && (
                <p style={styles.cardDescription}>{plan.description}</p>
              )}

              <div style={styles.cardMeta}>
                <div style={styles.metaItem}>
                  <span>📅</span> {plan.date}
                </div>
                <div style={styles.metaItem}>
                  <span>⏰</span> {plan.startTime} - {plan.endTime}
                </div>
              </div>

              {/* Reminder Indicators */}
              <div style={styles.reminderInfoBox}>
                <div style={styles.reminderHeader}>
                  <span style={styles.reminderTitleLabel}>🔔 Email Reminders:</span>
                  <button 
                    style={styles.textToggleButton}
                    onClick={() => handleToggleReminder(plan)}
                    title="Toggle reminder status"
                  >
                    {plan.reminderEnabled !== false ? 'Enabled (Disable)' : 'Disabled (Enable)'}
                  </button>
                </div>
                {plan.reminderEnabled !== false && (plan.reminder1Time || plan.reminder2Time) ? (
                  <div style={styles.reminderTimes}>
                    {plan.reminder1Time && <span>1st: {plan.reminder1Time}</span>}
                    {plan.reminder2Time && <span>2nd: {plan.reminder2Time}</span>}
                  </div>
                ) : (
                  <div style={styles.reminderTimes}>No reminder alerts configured</div>
                )}
              </div>

              {/* Card Actions */}
              <div style={styles.cardActions}>
                <button 
                  style={plan.completed ? styles.incompleteButton : styles.completeButton}
                  onClick={() => handleToggleComplete(plan)}
                >
                  {plan.completed ? 'Mark Incomplete' : 'Mark Completed'}
                </button>
                <div style={styles.actionIconGroup}>
                  <button style={styles.iconButton} onClick={() => handleOpenEdit(plan)} title="Edit Plan">
                    ✏️
                  </button>
                  <button style={styles.iconButton} onClick={() => setDeleteConfirmId(plan.id)} title="Delete Plan">
                    🗑️
                  </button>
                </div>
              </div>

              {/* Inline Delete Confirmation Overlay */}
              {deleteConfirmId === plan.id && (
                <div style={styles.deleteConfirmOverlay}>
                  <p style={styles.deleteConfirmText}>Are you sure you want to delete this plan?</p>
                  <div style={styles.deleteConfirmButtons}>
                    <button 
                      style={styles.confirmDeleteBtn} 
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      Yes, Delete
                    </button>
                    <button 
                      style={styles.cancelDeleteBtn} 
                      onClick={() => setDeleteConfirmId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for Create / Edit Plan */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2>{editingId ? 'Edit Plan' : 'Create New Plan'}</h2>
              <button style={styles.closeButton} onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSavePlan} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Plan Title *</label>
                <input 
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Study React Hooks or Team Sync"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description / Notes</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Add details, notes, or links..."
                  style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroupHalf}>
                  <label style={styles.label}>Date</label>
                  <input 
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroupQuarter}>
                  <label style={styles.label}>Start Time</label>
                  <input 
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroupQuarter}>
                  <label style={styles.label}>End Time</label>
                  <input 
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroupHalf}>
                  <label style={styles.label}>Category</label>
                  <select 
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    style={styles.input}
                  >
                    <option value="Work">Work</option>
                    <option value="Study">Study</option>
                    <option value="Personal">Personal</option>
                    <option value="Health">Health</option>
                    <option value="Finance">Finance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={styles.formGroupHalf}>
                  <label style={styles.label}>Priority</label>
                  <select 
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    style={styles.input}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {/* Reminder configuration section */}
              <div style={styles.reminderSection}>
                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input 
                      type="checkbox"
                      name="reminderEnabled"
                      checked={formData.reminderEnabled}
                      onChange={handleChange}
                      style={styles.checkbox}
                    />
                    Enable Automatic Email Reminders
                  </label>
                </div>
                
                <p style={styles.reminderNotice}>
                  💡 Note: These settings will be utilized by the NoteZ backend service to dispatch automated email notifications ahead of your scheduled time (e.g., if scheduled at 10:00 PM, reminders can be set for 9:00 PM and 9:30 PM). No emails are sent directly from this client interface.
                </p>

                {formData.reminderEnabled && (
                  <div style={styles.formRow}>
                    <div style={styles.formGroupHalf}>
                      <label style={styles.label}>Reminder 1 Time</label>
                      <input 
                        type="time"
                        name="reminder1Time"
                        value={formData.reminder1Time}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroupHalf}>
                      <label style={styles.label}>Reminder 2 Time</label>
                      <input 
                        type="time"
                        name="reminder2Time"
                        value={formData.reminder2Time}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.modalFooter}>
                <button 
                  type="button" 
                  style={styles.cancelButtonModal} 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.primaryButton}>
                  {editingId ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper colors for priority
const getPriorityColor = (priority) => {
  switch (priority) {
    case 'High': return '#EF4444';
    case 'Medium': return '#F59E0B';
    case 'Low': return '#3B82F6';
    default: return '#6B7280';
  }
};

const getPriorityBg = (priority) => {
  switch (priority) {
    case 'High': return '#FEE2E2';
    case 'Medium': return '#FEF3C7';
    case 'Low': return '#DBEAFE';
    default: return '#F3F4F6';
  }
};

// Clean Internal CSS Stylesheet matching modern design principles
const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    color: '#1F2937',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 6px 0',
    color: '#111827',
  },
  subtitle: {
    fontSize: '15px',
    color: '#6B7280',
    margin: 0,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  toast: {
    padding: '12px 16px',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: '20px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #E5E7EB',
    marginBottom: '24px',
    overflowX: 'auto',
    paddingBottom: '2px',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '10px 16px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#6B7280',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    whiteSpace: 'nowrap',
  },
  activeTab: {
    color: '#4F46E5',
    borderBottomColor: '#4F46E5',
    fontWeight: '600',
  },
  centerState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6B7280',
    fontSize: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    border: '2px dashed #E5E7EB',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyText: {
    color: '#6B7280',
    maxWidth: '400px',
    margin: '0 auto 20px auto',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    border: '1px solid #E5E7EB',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  categoryBadge: {
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  priorityBadge: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 8px 0',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#4B5563',
    margin: '0 0 16px 0',
    lineHeight: '1.4',
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '13px',
    color: '#6B7280',
    marginBottom: '14px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  reminderInfoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '12px',
    color: '#4B5563',
    marginBottom: '16px',
    border: '1px solid #E5E7EB',
  },
  reminderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  reminderTitleLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  textToggleButton: {
    background: 'none',
    border: 'none',
    color: '#4F46E5',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  },
  reminderTimes: {
    display: 'flex',
    gap: '12px',
    color: '#6B7280',
    marginTop: '2px',
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #F3F4F6',
    paddingTop: '12px',
  },
  completeButton: {
    backgroundColor: '#ECFDF5',
    color: '#059669',
    border: '1px solid #A7F3D0',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  incompleteButton: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    border: '1px solid #FDE68A',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionIconGroup: {
    display: 'flex',
    gap: '6px',
  },
  iconButton: {
    background: '#F3F4F6',
    border: 'none',
    borderRadius: '6px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  deleteConfirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 2,
    textAlign: 'center',
  },
  deleteConfirmText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: '16px',
  },
  deleteConfirmButtons: {
    display: 'flex',
    gap: '10px',
  },
  confirmDeleteBtn: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelDeleteBtn: {
    backgroundColor: '#E5E7EB',
    color: '#374151',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #E5E7EB',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#9CA3AF',
    cursor: 'pointer',
  },
  form: {
    padding: '24px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  formGroupHalf: {
    flex: '1 1 calc(50% - 6px)',
    minWidth: '140px',
  },
  formGroupQuarter: {
    flex: '1 1 calc(25% - 9px)',
    minWidth: '110px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    color: '#1F2937',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#FFFFFF',
  },
  reminderSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid #E5E7EB',
    marginBottom: '20px',
  },
  checkboxGroup: {
    marginBottom: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#4F46E5',
    cursor: 'pointer',
  },
  reminderNotice: {
    fontSize: '12px',
    color: '#6B7280',
    lineHeight: '1.4',
    margin: '0 0 12px 0',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    borderTop: '1px solid #E5E7EB',
    paddingTop: '16px',
  },
  cancelButtonModal: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default Planning;