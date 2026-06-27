// components/feed/FeedPage.jsx
import { useState, useEffect, useRef } from "react";
import GlassCard from "../ui/GlassCard";
import StreakBadge from "../ui/StreakBadge";
import XPBar from "../ui/XPBar";
import { Camera, Heart, Zap, X, Loader2 } from "lucide-react";
import { getFeedPosts, createPost, getUserTasks } from "../../lib/firestore";
import { db } from "../../lib/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { generateDailyPlan } from "../../lib/gemini";

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

function formatTimeAgo(timestamp) {
  if (!timestamp) return "just now";
  
  const date = typeof timestamp.toDate === "function" 
    ? timestamp.toDate() 
    : (timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp));
    
  if (isNaN(date.getTime())) return "just now";
  
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function FeedPost({ post, onLike }) {
  return (
    <GlassCard hover className="p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar name={post.displayName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="font-display font-semibold text-sm" style={{ color: "#f0eeff" }}>
              {post.displayName}
            </span>
            <span className="text-[11px]" style={{ color: "#7a7a9a" }}>
              {formatTimeAgo(post.createdAt)}
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed" style={{ color: "#c8c4e8" }}>
            ✅ {post.taskTitle}
          </p>
        </div>
      </div>

      {post.photoURL && (
        <div 
          className="relative w-full rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)] bg-black" 
          style={{ maxHeight: 320 }}
        >
          <img 
            src={post.photoURL} 
            alt="Proof snap" 
            className="w-full object-cover" 
            style={{ maxHeight: 320 }}
          />
        </div>
      )}

      <div className="flex items-center gap-4 pt-1">
        <button 
          onClick={() => onLike(post.id)}
          className="flex items-center gap-1.5 text-xs transition-colors hover:text-pink-400 group active:scale-125" 
          style={{ color: "#7a7a9a" }}
        >
          <Heart size={13} className="group-hover:fill-pink-400 group-hover:text-pink-400 transition-colors" />
          <span>{post.likes || 0}</span>
        </button>
      </div>
    </GlassCard>
  );
}

export default function FeedPage({ user, userContext, isActive }) {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [battlePlan, setBattlePlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  
  // Camera & Dialog states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [stream, setStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [posting, setPosting] = useState(false);
  
  const videoRef = useRef(null);

  const loadPosts = async () => {
    try {
      const fetched = await getFeedPosts();
      setPosts(fetched);
    } catch (err) {
      console.error("Error loading feed posts:", err);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Fetch posts and Daily Battle Plan when active or user changes
  useEffect(() => {
    if (!isActive) return;
    loadPosts();

    const getPlan = async () => {
      if (!user?.uid) return;
      
      const todayStr = new Date().toDateString();
      const cachedDate = localStorage.getItem("battlePlanDate");
      const cachedText = localStorage.getItem("battlePlanText");
      
      if (cachedDate === todayStr && cachedText) {
        setBattlePlan(cachedText);
        return;
      }
      
      setPlanLoading(true);
      try {
        const tasks = await getUserTasks(user.uid);
        const incomplete = tasks.filter(t => !t.completed);
        const plan = await generateDailyPlan(incomplete, userContext || {});
        setBattlePlan(plan);
        localStorage.setItem("battlePlanDate", todayStr);
        localStorage.setItem("battlePlanText", plan);
      } catch (err) {
        console.error("Error generating daily battle plan:", err);
      } finally {
        setPlanLoading(false);
      }
    };

    getPlan();
  }, [isActive, user?.uid, userContext]);

  // Handle active camera lifecycle
  useEffect(() => {
    let activeStream = null;
    if (showCamera) {
      setCameraError("");
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(s => {
          activeStream = s;
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play().catch(e => console.error("Video play failed:", e));
            };
          }
        })
        .catch(err => {
          console.error("Camera access failed:", err);
          setCameraError("Could not access camera. Please check permissions.");
        });
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera]);

  const handleTakeSnap = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        const base64Img = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedPhoto(base64Img);
        
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
        setShowCamera(false);
        setShowPostDialog(true);
      } catch (err) {
        console.error("Failed to capture image:", err);
        alert("Failed to capture image. Please try again.");
      }
    }
  };

  const handlePost = async (e) => {
    if (e) e.preventDefault();
    if (!taskTitle.trim() || !user?.uid || posting) return;
    
    setPosting(true);
    try {
      await createPost(
        user.uid,
        user.displayName || "Mosaicker",
        taskTitle.trim(),
        capturedPhoto
      );
      
      setCapturedPhoto(null);
      setTaskTitle("");
      setShowPostDialog(false);
      
      await loadPosts();
    } catch (err) {
      console.error("Failed to create post:", err);
      alert("Error posting your win. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        likes: increment(1)
      });
      setPosts(prev =>
        prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p)
      );
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 relative">
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

      {/* Daily Battle Plan */}
      {planLoading && (
        <GlassCard className="p-5 mb-6 animate-pulse border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-[#3dd68c] animate-bounce" />
            <span className="font-display font-semibold text-sm text-[#f0eeff]">Today's Battle Plan</span>
          </div>
          <p className="text-xs font-mono text-[#7a7a9a]">Generating your plan...</p>
        </GlassCard>
      )}

      {!planLoading && battlePlan && (
        <GlassCard className="p-5 mb-6 border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-[#3dd68c]" />
            <span className="font-display font-semibold text-sm text-[#f0eeff]">Today's Battle Plan</span>
          </div>
          <p className="text-sm whitespace-pre-line leading-relaxed text-[#c8c4e8]">
            {battlePlan}
          </p>
        </GlassCard>
      )}

      {/* Snap prompt banner */}
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
        <button 
          onClick={() => setShowCamera(true)}
          className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
        >
          <Zap size={12} />
          Snap
        </button>
      </GlassCard>

      {/* Feed list */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "#7a7a9a" }}>
          Friends' wins
        </p>
        {loadingPosts ? (
          <div className="text-center py-12">
            <Loader2 className="animate-spin mx-auto mb-2 text-[#3dd68c]" size={24} />
            <p className="text-xs font-mono text-slate-500">Loading wins feed…</p>
          </div>
        ) : posts.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-sm mb-1" style={{ color: "#f0eeff" }}>No posts yet</p>
            <p className="text-xs" style={{ color: "#7a7a9a" }}>Be the first to share your snap!</p>
          </GlassCard>
        ) : (
          posts.map(post => (
            <FeedPost key={post.id} post={post} onLike={handleLike} />
          ))
        )}
      </div>

      {/* Camera Modal Overlay */}
      {showCamera && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(10, 10, 15, 0.8)", backdropFilter: "blur(8px)" }}
        >
          <GlassCard className="w-full max-w-md p-6 relative overflow-hidden" style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <button 
              onClick={() => {
                if (stream) {
                  stream.getTracks().forEach(track => track.stop());
                  setStream(null);
                }
                setShowCamera(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            <h3 className="font-display font-semibold text-lg mb-4" style={{ color: "#f0eeff" }}>Take a Snap</h3>
            
            {cameraError ? (
              <div className="text-center py-8 text-red-400 text-sm font-medium">{cameraError}</div>
            ) : (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6 border border-[rgba(255,255,255,0.08)] bg-black shadow-inner">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
              </div>
            )}
            
            <div className="flex gap-3 justify-end">
              <button 
                type="button"
                onClick={() => {
                  if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    setStream(null);
                  }
                  setShowCamera(false);
                }}
                className="btn-ghost px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button 
                disabled={!!cameraError}
                onClick={handleTakeSnap}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                style={{ background: "#3dd68c" }}
              >
                <Camera size={14} /> Take Snap
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Post Modal Overlay */}
      {showPostDialog && capturedPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(10, 10, 15, 0.8)", backdropFilter: "blur(8px)" }}
        >
          <GlassCard className="w-full max-w-md p-6 relative overflow-hidden" style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <button 
              type="button"
              onClick={() => {
                setCapturedPhoto(null);
                setShowPostDialog(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              disabled={posting}
            >
              <X size={18} />
            </button>
            <h3 className="font-display font-semibold text-lg mb-4" style={{ color: "#f0eeff" }}>Share Your Win</h3>
            
            <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-4 border border-[rgba(255,255,255,0.08)] bg-black shadow-lg">
              <img src={capturedPhoto} alt="Captured win" className="w-full h-full object-cover" />
            </div>
            
            <form onSubmit={handlePost}>
              <div className="mb-6">
                <label className="block text-xs font-mono mb-2 uppercase tracking-wide" style={{ color: "#7a7a9a" }}>
                  What did you complete?
                </label>
                <input
                  type="text"
                  required
                  disabled={posting}
                  className="input-glass w-full py-2.5 px-3 text-sm rounded-xl outline-none border border-[rgba(255,255,255,0.08)] focus:border-[#3dd68c] transition-colors text-white"
                  placeholder="e.g., Solved 3 Leetcode questions, Worked on project UI"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button 
                  type="button"
                  disabled={posting}
                  onClick={() => {
                    setCapturedPhoto(null);
                    setShowPostDialog(false);
                    setShowCamera(true);
                  }}
                  className="btn-ghost px-4 py-2 text-xs"
                >
                  Retake
                </button>
                <button 
                  type="submit"
                  disabled={posting || !taskTitle.trim()}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
                  style={{ background: "#3dd68c" }}
                >
                  {posting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Posting…
                    </>
                  ) : (
                    <>
                      <Zap size={14} /> Post Win
                    </>
                  )}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
