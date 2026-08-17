import { NavLink } from 'react-router-dom';

export interface TabItem {
  to: string;
  label: string;
  end?: boolean;
}

export function Tabs({ items }: { items: TabItem[] }) {
  return (
    <nav className="tabs">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
