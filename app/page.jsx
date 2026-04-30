"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

const STORAGE_KEY = "personal-attendance-v1";
const PIN_KEY = "attendance-edit-mode";
const SECRET_PIN = "2004";

const SHIFT_CONFIG = [
  { key: "morning", label: "S" },
  { key: "afternoon", label: "C" },
];
const STATUS_OPTIONS = [
  { value: "present", label: "Đi làm", points: 0.5 },
  { value: "absent", label: "Nghỉ", points: 0 },
];
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const startOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getMonthCells = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date,
      key: formatDateKey(date),
      isCurrentMonth: date.getMonth() === month,
    };
  });
};

const getStatusMeta = (status) => {
  return STATUS_OPTIONS.find((option) => option.value === status);
};

const getSummary = ({ monthDate, entries, fromDate, toDate }) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const hasRange = Boolean(fromDate || toDate);
  let totalWork = 0;
  let present = 0;
  let absent = 0;

  for (const [dateKey, shifts] of Object.entries(entries)) {
    if (hasRange) {
      if (fromDate && dateKey < fromDate) {
        continue;
      }
      if (toDate && dateKey > toDate) {
        continue;
      }
    }

    const date = parseDateKey(dateKey);
    if (
      !hasRange &&
      (date.getFullYear() !== year || date.getMonth() !== month)
    ) {
      continue;
    }

    for (const value of Object.values(shifts)) {
      const meta = getStatusMeta(value);
      if (!meta) continue;

      totalWork += meta.points;
      if (value === "present") present += 0.5;
      else if (value === "absent") absent += 0.5;
    }
  }

  return { totalWork, present, absent };
};

const normalizeEntries = (rawEntries) => {
  const normalized = {};

  for (const [dateKey, shifts] of Object.entries(rawEntries || {})) {
    const fixedShifts = {};
    for (const [shiftKey, value] of Object.entries(shifts || {})) {
      if (value === "late") {
        fixedShifts[shiftKey] = "present";
      } else if (value === "present" || value === "absent") {
        fixedShifts[shiftKey] = value;
      }
    }

    if (Object.keys(fixedShifts).length > 0) {
      normalized[dateKey] = fixedShifts;
    }
  }

  return normalized;
};

function DateInput({ value, onChange }) {
  return (
    <div className="date-input-wrapper">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="native-date-input"
      />
      <div className="date-display">
        {value ? value.split("-").reverse().join("/") : "dd/mm/yyyy"}
      </div>
    </div>
  );
}

function Modal({ isOpen, dateKey, entries, isEditing, onClose, onSave }) {
  const [localEntry, setLocalEntry] = useState({});

  useEffect(() => {
    if (isOpen && dateKey) {
      setLocalEntry(entries[dateKey] || {});
    }
  }, [isOpen, dateKey, entries]);

  if (!isOpen || !dateKey) return null;

  const date = parseDateKey(dateKey);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = CN, 6 = T7

  const handleChoice = (shiftKey, value) => {
    if (!isEditing) return;
    setLocalEntry((prev) => ({ ...prev, [shiftKey]: value }));
  };

  const handleSave = () => {
    if (!isEditing) return;
    onSave(dateKey, localEntry);
    onClose();
  };

  const handleDelete = () => {
    if (!isEditing) return;
    setLocalEntry({});
  };

  const formatDate = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

  if (isWeekend) {
    return (
      <>
        <div className="modal-backdrop" onClick={onClose} />
        <div className="attendance-modal">
          <div className="attendance-modal__panel">
            <div className="attendance-modal__header">
              <h3>{formatDate}</h3>
              <button onClick={onClose} className="close-btn">
                ✕
              </button>
            </div>
            <div className="weekend-message">
              <div className="weekend-icon">📅</div>
              <h4>Ngày healing</h4>
              <p>Thứ bảy và chủ nhật không cần ghi chú</p>
            </div>
            <div className="modal-actions">
              <button
                className="primary-btn"
                onClick={() => {
                  onClose();
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="attendance-modal">
        <div className="attendance-modal__panel">
          <div className="attendance-modal__header">
            <h3>{formatDate}</h3>
            <button onClick={onClose} className="close-btn">
              ✕
            </button>
          </div>
          <div className="shift-modal-stack">
            {SHIFT_CONFIG.map(({ key: shiftKey, label }) => {
              const status = localEntry[shiftKey];
              const meta = getStatusMeta(status);
              const statusLabel = meta ? meta.label : "Chưa chấm";

              return (
                <div key={shiftKey} className="shift-card">
                  <div className="shift-info">
                    <span className="shift-name">Ca {label}</span>
                    <span className="shift-status">
                      Hiện tại: {statusLabel}
                    </span>
                  </div>
                  <div className="shift-choice-row">
                    {STATUS_OPTIONS.map(({ value }) => (
                      <button
                        key={value}
                        disabled={!isEditing}
                        className={`shift-choice ${
                          status === value ? "is-active" : ""
                        } ${!isEditing ? "is-readonly" : ""}`}
                        data-value={value}
                        onClick={() => handleChoice(shiftKey, value)}
                      >
                        {value === "present" ? "✓" : "✕"}
                      </button>
                    ))}
                  </div>
                  <div className="shift-choice-labels">
                    <span>Đi làm</span>
                    <span>Nghỉ</span>
                  </div>
                </div>
              );
            })}
          </div>
          {isEditing ? (
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleSave}>
                Lưu
              </button>
              <button className="danger-btn" onClick={handleDelete}>
                Xóa
              </button>
            </div>
          ) : (
            <div className="modal-actions">
              <button className="ghost-btn" style={{ gridColumn: 'span 2' }} onClick={onClose}>
                Chế độ chỉ xem
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DayCell({ date, isCurrentMonth, isSelected, entry, onClick }) {
  const total = Object.values(entry).reduce((sum, value) => {
    const meta = getStatusMeta(value);
    return sum + (meta ? meta.points : 0);
  }, 0);

  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = CN, 6 = T7

  if (isWeekend) {
    return (
      <button
        type="button"
        className={`day-cell ${isCurrentMonth ? "" : "is-outside"} ${
          isSelected ? "is-selected" : ""
        } is-weekend`}
        disabled
        aria-disabled="true"
        aria-label={`${date.toLocaleDateString("vi-VN")} ngày healing`}
      >
        <div className="day-topline">
          <span className="day-number">{date.getDate()}</span>
          {isCurrentMonth && (
            <span className="day-total day-total--weekend">Ngày healing</span>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`day-cell ${isCurrentMonth ? "" : "is-outside"} ${
        isSelected ? "is-selected" : ""
      }`}
      onClick={onClick}
      aria-label={date.toLocaleDateString("vi-VN")}
    >
      <div className="day-topline">
        <span className="day-number">{date.getDate()}</span>
        {isCurrentMonth && (
          <span className="day-total">{total.toFixed(1)} ngày</span>
        )}
      </div>
      <div className="day-shift-stack">
        {SHIFT_CONFIG.map(({ key: shiftKey, label }) => {
          const status = entry[shiftKey];
          const meta = getStatusMeta(status);
          const statusLabel = meta ? meta.label : "Chưa chấm";
          const isEmpty = !status;
          const isAbsent = status === "absent";
          const colorClass = isEmpty
            ? "is-empty"
            : isAbsent
              ? "is-absent"
              : "is-working";

          return (
            <div
              key={shiftKey}
              className={`day-shift ${status ? `is-${status}` : "is-empty"} ${colorClass}`}
            >
              <span className="day-shift-label">{label}</span>
              <span className="day-shift-status">{statusLabel}</span>
            </div>
          );
        })}
      </div>
    </button>
  );
}

export default function Home() {
  const [entries, setEntries] = useState({});
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(
    formatDateKey(new Date()),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDateKey, setModalDateKey] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const getDefaultRange = (date) => {
    const now = date || new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // From 28th of last month
    const from = new Date(currentYear, currentMonth - 1, 28);
    // To 27th of this month
    const to = new Date(currentYear, currentMonth, 27);

    return {
      from: formatDateKey(from),
      to: formatDateKey(to)
    };
  };

  const initialRange = getDefaultRange();
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [isEditing, setIsEditing] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState("");

  // Sync with Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "attendance", "main"), (doc) => {
      if (doc.exists()) {
        setEntries(normalizeEntries(doc.data().entries));
      }
    });

    // Check local session for edit mode
    const savedEditMode = localStorage.getItem(PIN_KEY);
    if (savedEditMode === SECRET_PIN) {
      setIsEditing(true);
    }

    setHydrated(true);
    return () => unsub();
  }, []);

  const handleToggleEdit = () => {
    if (isEditing) {
      setIsEditing(false);
      localStorage.removeItem(PIN_KEY);
    } else {
      setShowPinInput(true);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === SECRET_PIN) {
      setIsEditing(true);
      setShowPinInput(false);
      setPin("");
      localStorage.setItem(PIN_KEY, SECRET_PIN);
    } else {
      alert("Mã PIN không chính xác!");
      setPin("");
    }
  };

  const handleOpenModal = (dateKey) => {
    const selectedDate = parseDateKey(dateKey);
    const dayOfWeek = selectedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      return;
    }

    setSelectedDateKey(dateKey);
    setCurrentMonth(startOfMonth(selectedDate));
    setModalDateKey(dateKey);
    setModalOpen(true);
  };

  const handleSaveModal = async (dateKey, shiftData) => {
    if (!isEditing) return;
    
    const newEntries = {
      ...entries,
      [dateKey]: shiftData,
    };
    
    setEntries(newEntries);

    // Save to Firestore
    try {
      await setDoc(doc(db, "attendance", "main"), {
        entries: newEntries,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error saving to Firestore:", err);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalDateKey(null);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const handlePrevYear = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1),
    );
  };

  const handleNextYear = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1),
    );
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    setSelectedDateKey(formatDateKey(today));
  };

  const handleSetCurrentMonthRange = () => {
    const range = getDefaultRange(currentMonth);
    setFromDate(range.from);
    setToDate(range.to);
  };

  const cells = getMonthCells(currentMonth);
  const safeFromDate =
    fromDate && toDate && fromDate > toDate ? toDate : fromDate;
  const safeToDate =
    fromDate && toDate && fromDate > toDate ? fromDate : toDate;

  const summary = getSummary({
    monthDate: currentMonth,
    entries,
    fromDate: safeFromDate,
    toDate: safeToDate,
  });

  if (!hydrated) return null;

  return (
    <div>
      <div className="backdrop backdrop-a" />
      <div className="backdrop backdrop-b" />

      <div className="shell">
        {/* PIN Modal */}
        {showPinInput && (
          <>
            <div className="modal-backdrop" onClick={() => setShowPinInput(false)} />
            <div className="attendance-modal">
              <div className="attendance-modal__panel">
                <h3 style={{ marginBottom: '16px', textAlign: 'center' }}>Nhập mã PIN để chỉnh sửa</h3>
                <form onSubmit={handlePinSubmit} className="shift-modal-stack">
                  <input
                    type="password"
                    autoFocus
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="****"
                    style={{
                      padding: '12px',
                      fontSize: '1.5rem',
                      textAlign: 'center',
                      borderRadius: '12px',
                      border: '1px solid var(--stroke)',
                      letterSpacing: '0.5em',
                      backgroundColor: 'rgba(15, 23, 42, 0.03)',
                      width: '100%'
                    }}
                  />
                  <div className="modal-actions">
                    <button type="submit" className="primary-btn">Xác nhận</button>
                    <button type="button" className="ghost-btn" onClick={() => setShowPinInput(false)}>Hủy</button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Hero Section */}
        <div className="hero">
          <div style={{ position: 'relative' }}>
            <p className="eyebrow">Nguyễn Thùy Dương</p>
            <h1>Số ngày cống hiến</h1>
            <p className="hero-copy">
              Cái thứ này dùng để theo dõi chấm công của D tại công ty V
            </p>
            <button 
              onClick={handleToggleEdit}
              className={`ghost-btn ${isEditing ? 'is-active' : ''}`}
              style={{ 
                marginTop: '12px',
                padding: '4px 10px',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: isEditing ? 'rgba(22, 163, 74, 0.1)' : 'rgba(15, 23, 42, 0.05)',
                color: isEditing ? 'var(--success)' : 'var(--muted)',
                borderColor: isEditing ? 'var(--success)' : 'transparent'
              }}
            >
              {isEditing ? '🔓 Chế độ chỉnh sửa' : '🔒 Chế độ chỉ xem'}
            </button>
          </div>
          <div className="stats">
            <div className="stat-card">
              <span className="stat-label">Tổng ngày đi làm</span>
              <strong>{summary.present}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Tổng ngày nghỉ</span>
              <strong>{summary.absent}</strong>
            </div>
            <label className="date-field">
              <span>Từ ngày</span>
              <DateInput
                value={fromDate}
                onChange={(val) => setFromDate(val)}
              />
            </label>
            <label className="date-field">
              <span>Đến ngày</span>
              <DateInput
                value={toDate}
                onChange={(val) => setToDate(val)}
              />
            </label>
            <div className="stats-filter-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={handleSetCurrentMonthRange}
              >
                📅 Tháng này
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
              >
                🧹 Bỏ lọc
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="month-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <h2>
              Lịch tháng {currentMonth.getMonth() + 1}/
              {currentMonth.getFullYear()}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <button 
                onClick={handleNextYear}
                style={{ background: 'transparent', border: 'none', padding: '0 4px', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                title="Tăng năm"
              >
                ▲
              </button>
              <button 
                onClick={handlePrevYear}
                style={{ background: 'transparent', border: 'none', padding: '0 4px', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                title="Giảm năm"
              >
                ▼
              </button>
            </div>
          </div>
          <div className="toolbar-actions">
            <button className="primary-btn" onClick={handlePrevMonth}>
              ← Trước
            </button>
            <button className="primary-btn" onClick={handleToday}>
              Hôm nay
            </button>
            <button className="primary-btn" onClick={handleNextMonth}>
              Sau →
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="content-grid">
          {/* Calendar */}
          <div className="calendar-card">
            <div className="weekday-row">
              {WEEKDAYS.map((day) => (
                <div key={day} className="weekday">
                  {day}
                </div>
              ))}
            </div>
            <div className="calendar-grid">
              {cells.map(({ date, key, isCurrentMonth }) => (
                <DayCell
                  key={key}
                  date={date}
                  isCurrentMonth={isCurrentMonth}
                  isSelected={key === selectedDateKey}
                  entry={entries[key] || {}}
                  onClick={() => handleOpenModal(key)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        dateKey={modalDateKey}
        entries={entries}
        isEditing={isEditing}
        onClose={handleCloseModal}
        onSave={handleSaveModal}
      />
    </div>
  );
}
