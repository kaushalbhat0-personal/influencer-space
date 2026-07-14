import { TimelineForm } from "../_components/timeline-form";

export default function NewTimelinePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add New Timeline Event</h1>
      <div className="max-w-lg">
        <TimelineForm mode="create" />
      </div>
    </div>
  );
}
