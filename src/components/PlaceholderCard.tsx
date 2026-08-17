export function PlaceholderCard({ title, description, fase }: { title: string; description: string; fase: string }) {
  return (
    <div className="placeholder-card">
      <h2>{title}</h2>
      <p>{description}</p>
      <p>
        <small>{fase}</small>
      </p>
    </div>
  );
}
