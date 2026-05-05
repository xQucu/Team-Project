import { useState, useEffect } from "react";
import { X, User, Scale, Ruler, Trophy, Activity, Calendar, AlertCircle } from "lucide-react";

interface ProfileData {
  name: string;
  age: number | "";
  weight: number | "";
  height: number | "";
  fitness_goal: string;
  experience_level: string;
  training_days_per_week: number | "";
  injuries: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProfileData;
  onSave: (updated: ProfileData) => Promise<void>;
}

export function ProfileModal({ isOpen, onClose, data, onSave }: ProfileModalProps) {
  const [formData, setFormData] = useState<ProfileData>(data);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(data);
    }
  }, [isOpen, data]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(formData);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-card rounded-3xl p-6 shadow-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto chat-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Your Profile</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 ml-1">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-secondary border-0 focus:ring-2 focus:ring-primary transition-all"
              placeholder="Your name"
            />
          </div>

          {/* Physical Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
                <Activity className="h-3 w-3" /> Age
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value === "" ? "" : parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-2xl bg-secondary border-0 focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
                <Scale className="h-3 w-3" /> Weight
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 rounded-2xl bg-secondary border-0 focus:ring-2 focus:ring-primary transition-all pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">kg</span>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
                <Ruler className="h-3 w-3" /> Height
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value === "" ? "" : parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-2xl bg-secondary border-0 focus:ring-2 focus:ring-primary transition-all pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">cm</span>
              </div>
            </div>
          </div>

          {/* Training Info */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
                <Trophy className="h-3 w-3" /> Fitness Goal
              </label>
              <select
                value={formData.fitness_goal}
                onChange={(e) => setFormData({ ...formData, fitness_goal: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-secondary border-0 focus:ring-2 focus:ring-primary transition-all appearance-none"
              >
                <option value="first_5k">Run First 5K</option>
                <option value="improve_speed">Improve Speed</option>
                <option value="marathon">Marathon Training</option>
                <option value="endurance">Build Endurance</option>
                <option value="weight_loss">Weight Loss</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
                <Activity className="h-3 w-3" /> Experience Level
              </label>
              <select
                value={formData.experience_level}
                onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-secondary border-0 focus:ring-2 focus:ring-primary transition-all appearance-none"
              >
                <option value="beginner">Beginner</option>
                <option value="short_distance">Short Distance</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
                <Calendar className="h-3 w-3" /> Training Days Per Week
              </label>
              <input
                type="range"
                min="1"
                max="7"
                step="1"
                value={formData.training_days_per_week || 3}
                onChange={(e) => setFormData({ ...formData, training_days_per_week: parseInt(e.target.value) })}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between mt-2 px-1 text-xs font-bold text-primary">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <span key={d} className={formData.training_days_per_week === d ? "scale-125" : "opacity-40"}>{d}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Injuries */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
              <AlertCircle className="h-3 w-3" /> Injuries / Limitations
            </label>
            <textarea
              value={formData.injuries}
              onChange={(e) => setFormData({ ...formData, injuries: e.target.value })}
              rows={3}
              placeholder="Any pain or issues to consider?"
              className="w-full px-4 py-3 rounded-2xl bg-secondary border-0 focus:ring-2 focus:ring-primary transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-primary text-primary-foreground text-lg font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {saving ? "Saving Changes..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
