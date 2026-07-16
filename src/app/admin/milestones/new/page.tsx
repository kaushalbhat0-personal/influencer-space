import { TimelineForm } from "../_components/timeline-form";

export default function NewMilestonePage() {
  return (
    <div>
      <h1 className="admin-gradient-text mb-6 text-2xl font-bold font-display">Add New Milestone</h1>
      <div className="max-w-2xl">
        <TimelineForm mode="create" />
      </div>
    </div>
  );
}
