"use client";

interface Props {
  name: string;
  onNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  disabled?: boolean;
}

export function ProductGeneralSection({ name, onNameChange, description, onDescriptionChange, disabled }: Props) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-white mb-3">Basic Information</legend>
      <div className="space-y-4">
        <div>
          <label htmlFor="product-name" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            id="product-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="admin-input w-full"
            disabled={disabled}
            required
            placeholder="T-Shirt"
          />
        </div>
        <div>
          <label htmlFor="product-description" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Description
          </label>
          <textarea
            id="product-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="admin-input w-full min-h-[100px] resize-y"
            disabled={disabled}
            rows={4}
            placeholder="Describe your product..."
          />
        </div>
      </div>
    </fieldset>
  );
}
