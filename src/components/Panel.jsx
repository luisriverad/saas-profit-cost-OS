export default function Panel({ title, meta, children, scrollX = false }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>{title}</h3>
        {meta && <span className="panel-meta">{meta}</span>}
      </div>
      {scrollX ? <div className="scroll-x">{children}</div> : children}
    </div>
  );
}
