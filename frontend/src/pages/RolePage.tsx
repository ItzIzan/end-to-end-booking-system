export default function RolePage({ title }: { title: string }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p>This role-specific page is now protected by the user role.</p>
    </div>
  );
}