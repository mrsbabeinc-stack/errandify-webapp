import React, { useState, useEffect } from 'react';
import { scheduleOptimizer, SchedulePlan, CalendarEvent } from '../utils/scheduleOptimizer';

interface ScheduleCalendarProps {
  contentType: 'email' | 'blog';
  targetAudience: string;
  contentTopic: string;
  onScheduleSelect?: (date: string, time: string) => void;
}

export default function ScheduleCalendar({
  contentType,
  targetAudience,
  contentTopic,
  onScheduleSelect,
}: ScheduleCalendarProps) {
  const [period, setPeriod] = useState<'3-months' | '6-months'>('3-months');
  const [plan, setPlan] = useState<SchedulePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const generateSchedule = async () => {
    setLoading(true);
    const generatedPlan = await scheduleOptimizer.getOptimalSchedule(
      contentType,
      targetAudience,
      contentTopic,
      ''
    );

    if (generatedPlan) {
      generatedPlan.period = period;
      setPlan(generatedPlan);
      const events = scheduleOptimizer.generateCalendarEvents(generatedPlan);
      setCalendarEvents(events);
      scheduleOptimizer.savePlan(`${contentType}_${Date.now()}`, generatedPlan);
    }
    setLoading(false);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateForComparison = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const eventsForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarEvents.filter(e => e.date === dateStr);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
      <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '16px' }}>
        📅 Smart Posting Calendar
      </div>

      {/* Period Selection */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {(['3-months', '6-months'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '10px',
              background: period === p ? '#FF6B35' : '#fff',
              color: period === p ? 'white' : '#333',
              border: `2px solid ${period === p ? '#FF6B35' : '#FFD9B3'}`,
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {p === '3-months' ? '📆 3-Month Plan' : '📅 6-Month Plan'}
          </button>
        ))}
      </div>

      <button
        onClick={generateSchedule}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          background: loading ? '#ccc' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: '600',
          cursor: loading ? 'wait' : 'pointer',
          fontSize: '14px',
          marginBottom: '16px',
        }}
      >
        {loading ? '⏳ Analyzing engagement patterns...' : '🤖 Generate Optimal Schedule'}
      </button>

      {/* Schedule Plan Summary */}
      {plan && (
        <>
          <div style={{ padding: '12px', background: 'white', borderRadius: '6px', marginBottom: '16px', border: '1px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#333', marginBottom: '8px' }}>
              <strong>📊 Engagement Score:</strong> {plan.engagementScore}% predicted
            </div>
            <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
              <strong>📌 Recommendation:</strong> {plan.frequencyRecommendation}
            </div>
          </div>

          {/* Calendar View */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                ←
              </button>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </div>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                →
              </button>
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '12px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  style={{
                    textAlign: 'center',
                    fontWeight: '600',
                    fontSize: '11px',
                    color: '#666',
                    padding: '6px 0',
                  }}
                >
                  {day}
                </div>
              ))}

              {days.map((day, idx) => {
                const dayEvents = day ? eventsForDay(day) : [];
                return (
                  <div
                    key={idx}
                    onClick={() => day && dayEvents.length > 0 && setSelectedEvent(dayEvents[0])}
                    style={{
                      padding: '8px',
                      background: day ? (dayEvents.length > 0 ? '#FFE4C4' : 'white') : '#f5f5f5',
                      border: dayEvents.length > 0 ? '2px solid #FF6B35' : '1px solid #ddd',
                      borderRadius: '4px',
                      minHeight: '60px',
                      cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                      fontSize: '12px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    {day && (
                      <>
                        <div style={{ fontWeight: '600', color: '#333' }}>{day}</div>
                        {dayEvents.length > 0 && (
                          <div style={{ fontSize: '10px', color: '#FF6B35', fontWeight: '600' }}>
                            📧 {dayEvents.length} post{dayEvents.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Event Details */}
          {selectedEvent && (
            <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '2px solid #FF6B35', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                ✓ Scheduled Post
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                <strong>📅 Date & Time:</strong> {scheduleOptimizer.formatPostDate(selectedEvent.date, selectedEvent.time)}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                <strong>💬 Why:</strong> {selectedEvent.description}
              </div>
              <div style={{ fontSize: '12px', color: '#FF6B35', marginBottom: '8px' }}>
                <strong>📊 Expected Engagement:</strong> {selectedEvent.engagement}%
              </div>
              <button
                onClick={() => {
                  onScheduleSelect?.(selectedEvent.date, selectedEvent.time);
                  setSelectedEvent(null);
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✅ Use This Schedule
              </button>
            </div>
          )}

          {/* Upcoming Posts List */}
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
            📋 Upcoming Posts ({calendarEvents.length})
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'grid', gap: '6px' }}>
            {calendarEvents.map(event => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                style={{
                  padding: '8px 12px',
                  background: selectedEvent?.id === event.id ? '#FFD9B3' : '#f9f9f9',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: `1px solid ${selectedEvent?.id === event.id ? '#FF6B35' : '#ddd'}`,
                  fontSize: '12px',
                }}
              >
                <div style={{ fontWeight: '600', color: '#333', marginBottom: '2px' }}>
                  📅 {scheduleOptimizer.formatPostDate(event.date, event.time)}
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  {event.description}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
