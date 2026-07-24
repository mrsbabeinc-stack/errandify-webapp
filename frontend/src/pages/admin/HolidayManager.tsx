import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { holidayAPI } from '../../services/adminAPI';

interface Holiday {
  id?: number;
  date: string;
  name: string;
  emoji?: string;
  holiday_type?: string;
  description?: string;
  apply_to_staff?: string;
  created_at?: string;
  last_modified?: string;
}

const HolidayManager: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, public_holidays: 0, company_holidays: 0, special_events: 0 });

  const [formData, setFormData] = useState({
    date: '',
    name: '',
    emoji: '🎉',
    holiday_type: 'Public Holiday',
    description: '',
    apply_to_staff: 'all',
  });

  // Load holidays from API
  useEffect(() => {
    const loadHolidays = async () => {
      try {
        setLoading(true);
        const response = await holidayAPI.getAll(filterYear, filterType === 'all' ? undefined : filterType);
        if (response.success) {
          setHolidays(response.data || []);
        }

        const statsResponse = await holidayAPI.getStats();
        if (statsResponse.success) {
          setStats(statsResponse.data);
        }
      } catch (error) {
        console.error('Failed to load holidays:', error);
        showToast('⚠️ Error loading holidays', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadHolidays();
  }, [filterYear, filterType]);

  const handleAddHoliday = async () => {
    if (!formData.date || !formData.name) {
      showToast('❌ Please fill in all required fields', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await holidayAPI.create({
        date: formData.date,
        name: formData.name,
        emoji: formData.emoji,
        holiday_type: formData.holiday_type,
        description: formData.description,
        apply_to_staff: formData.apply_to_staff,
      });

      if (response.success) {
        setHolidays([...holidays, response.data]);
        showToast(`✅ Holiday "${formData.name}" added on ${new Date(formData.date).toLocaleDateString('en-SG')}`, 'success');
        resetForm();
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
      showToast('❌ Failed to add holiday', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateHoliday = async () => {
    if (!selectedHoliday || !selectedHoliday.id || !formData.date || !formData.name) {
      showToast('❌ Please fill in all required fields', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await holidayAPI.update(selectedHoliday.id, {
        date: formData.date,
        name: formData.name,
        emoji: formData.emoji,
        holiday_type: formData.holiday_type,
        description: formData.description,
        apply_to_staff: formData.apply_to_staff,
      });

      if (response.success) {
        setHolidays(holidays.map(h => h.id === selectedHoliday.id ? response.data : h));
        showToast(`✅ Holiday "${formData.name}" updated`, 'success');
        resetForm();
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Error updating holiday:', error);
      showToast('❌ Failed to update holiday', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (id: number | undefined) => {
    const holiday = holidays.find(h => h.id === id);
    if (!holiday || !id || !window.confirm(`Delete ${holiday.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await holidayAPI.delete(id);
      if (response.success) {
        setHolidays(holidays.filter(h => h.id !== id));
        showToast(`✅ Holiday deleted`, 'success');
        setSelectedHoliday(null);
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      showToast('❌ Failed to delete holiday', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHoliday = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setFormData({
      date: holiday.date,
      name: holiday.name,
      emoji: holiday.emoji || '🎉',
      holiday_type: holiday.holiday_type || 'Public Holiday',
      description: holiday.description || '',
      apply_to_staff: holiday.apply_to_staff || 'all',
    });
    setActiveTab('edit');
  };

  const resetForm = () => {
    setFormData({
      date: '',
      name: '',
      emoji: '🎉',
      holiday_type: 'Public Holiday',
      description: '',
      apply_to_staff: 'all',
    });
    setSelectedHoliday(null);
  };

  const filteredHolidays = holidays.filter(h => {
    if (filterType !== 'all' && h.type !== filterType) return false;
    const year = parseInt(h.date.split('-')[0]);
    if (year !== filterYear) return false;
    return true;
  });

  const getTypeLabel = (type: string) => {
    if (type.includes('Public')) return '🇸🇬 Public Holiday';
    if (type.includes('Company')) return '🏢 Company Holiday';
    if (type.includes('Event')) return '🎉 Special Event';
    return type;
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              📅 Holiday Manager
            </h1>
            <button
              onClick={() => navigate(-1)}
              style={{
                fontSize: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#FF6B35',
                fontWeight: '700',
              }}
              title="Go back"
            >
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: '8px 0 0 0' }}>
            Manage public holidays, company holidays, and special events
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '12px', background: '#E8F5E9', borderRadius: '8px', border: '2px solid #4CAF50' }}>
            <div style={{ fontSize: '11px', color: '#2E7D32', marginBottom: '4px' }}>Total Holidays</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4CAF50' }}>{stats.total}</div>
          </div>
          <div style={{ padding: '12px', background: '#FCE4EC', borderRadius: '8px', border: '2px solid #E91E63' }}>
            <div style={{ fontSize: '11px', color: '#880E4F', marginBottom: '4px' }}>Public Holidays</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#E91E63' }}>{stats.public_holidays}</div>
          </div>
          <div style={{ padding: '12px', background: '#FCEDE9', borderRadius: '8px', border: '2px solid #E2736B' }}>
            <div style={{ fontSize: '11px', color: '#4A148C', marginBottom: '4px' }}>Company Holidays</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#E2736B' }}>{stats.company_holidays}</div>
          </div>
          <div style={{ padding: '12px', background: '#FFF3E0', borderRadius: '8px', border: '2px solid #FF9800' }}>
            <div style={{ fontSize: '11px', color: '#E65100', marginBottom: '4px' }}>Special Events</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#FF9800' }}>{stats.special_events}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['list', 'add', 'edit'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                background: activeTab === tab ? '#FFD9B3' : 'transparent',
                color: activeTab === tab ? '#333' : '#999',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #FF6B35' : 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'list' && '📋 Holidays'}
              {tab === 'add' && '➕ Add Holiday'}
              {tab === 'edit' && selectedHoliday && `✏️ Edit ${selectedHoliday.name}`}
              {tab === 'edit' && !selectedHoliday && '✏️ Edit Holiday'}
            </button>
          ))}
        </div>

        {/* LIST TAB */}
        {activeTab === 'list' && (
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Filter by Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Holidays</option>
                  <option value="Public Holiday">Public Holidays</option>
                  <option value="Company Holiday">Company Holidays</option>
                  <option value="Special Event">Special Events</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Filter by Year
                </label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(parseInt(e.target.value))}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {[2024, 2025, 2026, 2027, 2028].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('add');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#FF6B35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  + Add Holiday
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {filteredHolidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(holiday => (
                <div
                  key={holiday.id}
                  onClick={() => handleSelectHoliday(holiday)}
                  style={{
                    padding: '16px',
                    background: 'white',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '16px',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#FFF8F5';
                    e.currentTarget.style.borderColor = '#FF6B35';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#FFD9B3';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '20px' }}>{holiday.emoji}</span>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
                        {holiday.name}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      📅 {new Date(holiday.date).toLocaleDateString('en-SG', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {getTypeLabel(holiday.holiday_type)} • {holiday.apply_to_staff === 'all-staff' ? 'All Staff' : 'Specific Staff'}
                      {holiday.description && ` • ${holiday.description}`}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteHoliday(holiday.id);
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#FFEBEE',
                      color: '#C62828',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '11px',
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {filteredHolidays.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', background: '#F5F5F5', borderRadius: '8px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>No Holidays Found</div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                    Add holidays to manage company and public holidays
                  </div>
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab('add');
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#FF6B35',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    + Add Holiday
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADD/EDIT TAB */}
        {(activeTab === 'add' || activeTab === 'edit') && (
          <div style={{ maxWidth: '600px', padding: '20px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>
              {selectedHoliday ? `✏️ Edit Holiday` : '➕ Add New Holiday'}
            </h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Holiday Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Christmas Day, Company Anniversary"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => setFormData({ ...formData, emoji: e.target.value.slice(0, 2) })}
                    maxLength={2}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #FFD9B3',
                      borderRadius: '6px',
                      fontSize: '18px',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                    Quick: 🎉 🇸🇬 🧧 🌙 🎄 🏢
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Holiday Type
                  </label>
                  <select
                    value={formData.holiday_type}
                    onChange={(e) => setFormData({ ...formData, holiday_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #FFD9B3',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Public Holiday">Public Holiday</option>
                    <option value="Company Holiday">Company Holiday</option>
                    <option value="Special Event">Special Event</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Description (Optional)
                </label>
                <textarea
                  placeholder="e.g., Company founding anniversary, Special celebration"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '13px',
                    minHeight: '60px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Applies To
                </label>
                <select
                  value={formData.apply_to_staff}
                  onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="all-staff">All Staff</option>
                  <option value="specific-staff">Specific Staff (Coming Soon)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={() => {
                    if (selectedHoliday) {
                      handleUpdateHoliday();
                    } else {
                      handleAddHoliday();
                    }
                  }}
                  style={{
                    padding: '12px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ✓ {selectedHoliday ? 'Update' : 'Add'} Holiday
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('list');
                  }}
                  style={{
                    padding: '12px',
                    background: '#f5f5f5',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default HolidayManager;
