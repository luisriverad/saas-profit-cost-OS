export default function Panel({ title, meta, actions, children, scrollX = false }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>{title}</h3>
        {(meta || actions) && (
          <div className="panel-header-right">
            {meta && <span className="panel-meta">{meta}</span>}
            {actions}
          </div>
        )}
      </div>
      {scrollX ? <div className="scroll-x">{children}</div> : children}
    </div>
  );
}
