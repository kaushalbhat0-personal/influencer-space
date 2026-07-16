import { TimelineForm } from "../_components/timeline-form";

export default function NewTimelinePage() {
  return (
    <div>
      <h1 className="admin-gradient-text mb-6 text-2xl font-bold font-display">Add New Timeline Event</h1>
      <div className="max-w-2xl">
        <TimelineForm mode="create" />
      </div>
    </div>
  );
}
