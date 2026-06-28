// components/ui/GlassCard.jsx
export default function GlassCard({ children, className = "", hover = false, onClick, style }) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`glass-card ${hover ? "glass-card-hover cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
