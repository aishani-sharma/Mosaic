// components/ui/GlassCard.jsx
export default function GlassCard({ children, className = "", hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`glass-card ${hover ? "glass-card-hover cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
