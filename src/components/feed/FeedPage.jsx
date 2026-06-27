// components/feed/FeedPage.jsx
import GlassCard from "../ui/GlassCard";
import StreakBadge from "../ui/StreakBadge";
import XPBar from "../ui/XPBar";
import { Camera, Heart, MessageCircle, Zap } from "lucide-react";

// Mock data — replace with Firestore queries
const MOCK_POSTS = [
  {
    id: 1,
    user: { name: "Rhea", avatar: null },
    task: "Finished OS assignment",
    time: "2 min ago",
    photo: null,
    likes: 4,
    comments: 1,
  },
  {
    id: 2,
    user: { name: "Arjun", avatar: null },
    task: "Deep work session — 2 hrs",
    time: "34 min ago",
    photo: null,
    likes: 7,
    comments: 2,
  },
  {
    id: 3,
    user: { name: "Meera", avatar: null },
    task: "Sent internship application",
    time: "1 hr ago",
    photo: null,
    likes: 12,
    comments: 3,
  },
];

function Avatar({ name, size = 36 }) {
  const initials = name?.slice(0, 1).toUpperCase() ?? "?";
  const colors = ["#3dd68c", "#a8f0c6", "#6af7c2", "#f76a6a"];
  const color = colors[name?.charCodeAt(0) % colors.length] ?? colors[0];
  return (
    <div
      className="rounded-full flex items-center justify-center font-display font-semibold flex-shrink-0"
      style={{ width: size, height: size, background: `${color}22`, color, border: `1.5px solid ${color}44`, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

function FeedPost({ post }) {
  return (
    <GlassCard hover className="p-4">
      <div className="flex items-start gap-3">
        <Avatar name={post.user.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-semibold text-sm" style={{ color: "#f0eeff" }}>
              {post.user.name}
            </span>
            <span className="text-xs" style={{ color: "#7a7a9a" }}>
              {post.time}
            </span>
          </div>
          <p className="text-sm mb-3" style={{ color: "#c8c4e8" }}>
            ✅ {post.task}
          </p>

          {/* Photo placeholder */}
          {post.photo ? (
            <img src={post.photo} alt="proof" className="w-full rounded-lg mb-3 object-cover" style={{ maxHeight: 200 }} />
          ) : (
            <div
              className="w-full rounded-lg mb-3 flex items-center justify-center"
              style={{ height: 80, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}
            >
              <span className="text-xs" style={{ color: "#3a3a5a" }}>No snap attached</span>
            </div>
          )}

          {/* Reactions */}
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-xs transition-colors hover:text-pink-400" style={{ color: "#7a7a9a" }}>
              <Heart size={13} />
              <span>{post.likes}</span>
            </button>
            <button className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: "#7a7a9a" }}>
              <MessageCircle size={13} />
              <span>{post.comments}</span>
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default function FeedPage({ user, userContext, isActive }) {
  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* User header */}
      <GlassCard className="p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={user?.displayName ?? "You"} size={42} />
          <div>
            <p className="font-display font-semibold" style={{ color: "#f0eeff" }}>
              {user?.displayName ?? "You"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <StreakBadge streak={userContext?.streak ?? 0} />
            </div>
          </div>
        </div>
        <XPBar xp={userContext?.xp ?? 0} level={userContext?.level ?? 1} />
      </GlassCard>

      {/* BeReal prompt banner */}
      <GlassCard className="p-4 mb-6 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(168,240,198,0.12)" }}
        >
          <Camera size={18} style={{ color: "#a8f0c6" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: "#f0eeff" }}>
            Time to Mosaic Up 📸
          </p>
          <p className="text-xs" style={{ color: "#7a7a9a" }}>
            Show your friends what you're working on right now
          </p>
        </div>
        <button className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
          <Zap size={12} />
          Snap
        </button>
      </GlassCard>

      {/* Feed */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "#7a7a9a" }}>
          Friends' wins
        </p>
        {MOCK_POSTS.map((post) => (
          <FeedPost key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
