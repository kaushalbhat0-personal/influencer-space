export default async function AgencyDashboardPage({
  params,
}: {
  params: { agencyId: string };
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-display">
        Welcome to your Agency Dashboard
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Agency ID: <code className="text-s8ul-cyan">{params.agencyId}</code>
      </p>
    </div>
  );
}
