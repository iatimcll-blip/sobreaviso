import type { ComponentType } from 'react';

interface Props {
  title: string;
  value: string;
  hint: string;
  icon: ComponentType<{ size?: number }>;
  color: 'blue' | 'purple' | 'green' | 'orange';
}

export function Metric({ title, value, hint, icon: Icon, color }: Props) {
  return (
    <div className="metric card">
      <div className={`metric-icon ${color}`}>
        <Icon size={21} />
      </div>
      <p>{title}</p>
      <h2>{value}</h2>
      <small>{hint}</small>
    </div>
  );
}
