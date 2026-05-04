export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <div className="page-title">{title}</div>
        <div className="page-subtitle">{subtitle}</div>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
