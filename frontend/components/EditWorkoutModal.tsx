import { useState, useEffect } from "react";
import { X } from "lucide-react";

const WORKOUT_TYPES = [
  { value: "easy_run", label: "Easy Run" },
  { value: "speed", label: "Speed" },
  { value: "intervals", label: "Intervals" },
  { value: "tempo", label: "Tempo" },
  { value: "long_run", label: "Long Run" },
  { value: "hill", label: "Hill" },
  { value: "recovery", label: "Recovery" },
  { value: "rest", label: "Rest" },
  { value: "walk_run", label: "Walk/Run" },
];

// Convert dd.mm.YYYY (API format) to YYYY-MM-DD (input format)
const toInputDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split(".");
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  return `${year}-${month}-${day}`;
};

// Convert YYYY-MM-DD (input format) to dd.mm.YYYY (API format)
const toApiDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}.${month}.${year}`;
};

interface WorkoutData {
  id: number;
  date: string;
  type: string;
  duration: string;
  description: string;
}

interface EditWorkoutModalProps {
  workout: WorkoutData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: WorkoutData) => void;
  onDelete: (id: number) => void;
}

export function EditWorkoutModal({
  workout,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: EditWorkoutModalProps) {
  const [formData, setFormData] = useState({
    date: "",
    type: workout.type,
    duration: workout.duration,
    description: workout.description,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form when modal opens or workout changes
  useEffect(() => {
    if (workout) {
      setFormData({
        date: toInputDate(workout.date),
        type: workout.type,
        duration: workout.duration,
        description: workout.description,
      });
      setShowDeleteConfirm(false);
    }
  }, [workout, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    const apiDate = toApiDate(formData.date);
    await onSave({ ...workout, date: apiDate, type: formData.type, duration: formData.duration, description: formData.description });
    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    await onDelete(workout.id);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Edit Workout</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl bg-secondary border-0 focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl bg-secondary border-0 focus:ring-2 focus:ring-primary"
            >
              {WORKOUT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-2">Duration</label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: e.target.value })
              }
              placeholder="e.g., 45 min"
              className="w-full px-4 py-3 rounded-xl bg-secondary border-0 focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-secondary border-0 focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {/* Delete button */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-500 font-semibold hover:bg-red-500/30 transition-colors"
              >
                Delete
              </button>
            ) : (
              <div className="flex-1 flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                >
                  {saving ? "Deleting..." : "Confirm Delete"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-secondary font-semibold hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}