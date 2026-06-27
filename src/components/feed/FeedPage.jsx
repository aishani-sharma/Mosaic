// components/feed/FeedPage.jsx
import { useState, useEffect, useRef } from "react";
import GlassCard from "../ui/GlassCard";
import StreakBadge from "../ui/StreakBadge";
import XPBar from "../ui/XPBar";
import { Camera, Zap, X, Loader2, Search, Users, UserPlus, UserCheck, Flame } from "lucide-react";
import { getFeedPosts, createPost, getUserTasks, updateUserProfile } from "../../lib/firestore";
import { db } from "../../lib/firebase";
import { doc, updateDoc, increment, collection, getDocs } from "firebase/firestore";
import { generateDailyPlan } from "../../lib/gemini";
import cozyCafeBg from "../../assets/cozy_cafe.png";

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
  if (minutes < 60) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

// Map username and streak to achievements
function getBadge(username, streakVal) {
  if (streakVal >= 7) return `🔥 ${streakVal} Day Streak`;
  const charCode = username?.charCodeAt(0) || 0;
  if (charCode % 3 === 0) return "💻 Builder";
  if (charCode % 3 === 1) return "📚 Learner";
  return "🏸 Athlete";
}

function FeedPost({ post, onReact }) {
  const badge = getBadge(post.displayName, post.streak || 0);
  const rx = post.reactions || { clap: 0, fire: 0, rocket: 0, hundred: 0 };

  return (
    <GlassCard hover className="p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar name={post.displayName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-display font-semibold text-sm text-[#f0eeff] truncate">
                {post.displayName}
              </span>
              {badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-medium border border-white/10 shrink-0">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#7a7a9a] shrink-0">
              {formatTimeAgo(post.createdAt)}
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed text-[#c8c4e8]">
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

      {/* Productivity Reactions Row */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        {[
          { key: "clap", label: "👏" },
          { key: "fire", label: "🔥" },
          { key: "rocket", label: "🚀" },
          { key: "hundred", label: "💯" },
        ].map((r) => (
          <button 
            key={r.key}
            onClick={() => onReact(post.id, r.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/5 bg-white/5 text-xs text-[#7a7a9a] hover:bg-white/10 hover:text-white transition-all cursor-pointer active:scale-125" 
          >
            <span>{r.label}</span>
            <span className="font-mono text-[10px] font-bold text-white/70">{rx[r.key] || 0}</span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

export default function FeedPage({ user, userContext, isActive }) {
  const [activeSection, setActiveSection] = useState("moments"); // moments or friends
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
  
  // Scheduled post alert states (daily post within 2 mins alert)
  const [alertActive, setAlertActive] = useState(false);
  const [alertSeconds, setAlertSeconds] = useState(120);

  // Friends System states
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [followingIds, setFollowingIds] = useState([]);

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

  // Load posts, battle plans, and alert notifications
  useEffect(() => {
    if (!isActive) return;
    loadPosts();

    // Load users list for the Friends system
    getDocs(collection(db, "users")).then((snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllUsers(list);
    });

    // Scheduled Mosaic Moment Alert notification check
    const today = new Date().toDateString();
    const lastAlert = localStorage.getItem("last_alert_date");
    if (lastAlert !== today) {
      setAlertActive(true);
      localStorage.setItem("last_alert_date", today);
    }

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

  // Handle local user's follow state initialization
  useEffect(() => {
    if (userContext) {
      setFollowingIds(userContext.following || []);
    }
  }, [userContext]);

  // Alert 2-min countdown timer ticker
  useEffect(() => {
    let timer = null;
    if (alertActive && alertSeconds > 0) {
      timer = setInterval(() => {
        setAlertSeconds((s) => {
          if (s <= 1) {
            setAlertActive(false);
            return 120;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [alertActive, alertSeconds]);

  // Handle camera stream lifecycles
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
      
      // Stop the 2-minute alert upon posting
      setAlertActive(false);
      
      await loadPosts();
    } catch (err) {
      console.error("Failed to create post:", err);
      alert("Error posting your win. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const handleReact = async (postId, type) => {
    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        [`reactions.${type}`]: increment(1)
      });
      setPosts(prev =>
        prev.map(p => {
          if (p.id === postId) {
            const rx = p.reactions || { clap: 0, fire: 0, rocket: 0, hundred: 0 };
            return {
              ...p,
              reactions: {
                ...rx,
                [type]: (rx[type] || 0) + 1
              }
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.error("Error reacting to post:", err);
    }
  };

  // Follow/Unfollow toggle handles
  const toggleFollow = async (targetUid) => {
    if (!user?.uid) return;
    const isFollowing = followingIds.includes(targetUid);
    const updated = isFollowing
      ? followingIds.filter(id => id !== targetUid)
      : [...followingIds, targetUid];

    setFollowingIds(updated);
    try {
      await updateUserProfile(user.uid, { following: updated });
    } catch (err) {
      console.error("Error saving follow list:", err);
    }
  };

  const filteredSearchUsers = allUsers.filter(u => {
    if (u.id === user?.uid) return false;
    return u.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="relative min-h-screen pb-12">
      {/* Cozy Cafe background scenery */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center transition-all duration-1000"
        style={{ backgroundImage: `url(${cozyCafeBg})`, filter: "brightness(0.55) saturate(0.9)" }}
      />

      <div className="max-w-xl mx-auto px-4 py-6 relative z-10 animate-page-enter">
        {/* Header Title */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div>
            <h1 className="font-display font-bold text-[26px] text-white leading-tight tracking-tight drop-shadow-md">
              Mosaic Moments
            </h1>
            <p className="text-xs font-semibold text-white/70 mt-0.5 font-mono uppercase tracking-wide">
              Connect &amp; Share Wins
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 justify-center">
          <button
            onClick={() => setActiveSection("moments")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeSection === "moments"
                ? "bg-[#3dd68c] text-[#0c0e13]"
                : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            📸 Moments
          </button>
          <button
            onClick={() => setActiveSection("friends")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeSection === "friends"
                ? "bg-[#3dd68c] text-[#0c0e13]"
                : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            👥 Friends
          </button>
        </div>

        {activeSection === "moments" ? (
          /* =======================================================
             MOMENTS FEED TAB
             ======================================================= */
          <div className="flex flex-col gap-4">
            {/* Scheduled posting alert */}
            {alertActive && (
              <div 
                className="p-4 rounded-2xl border flex items-center justify-between animate-pulse shadow-lg"
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  borderColor: "rgba(245, 158, 11, 0.4)",
                  color: "#fef3c7"
                }}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="text-xs font-bold font-mono uppercase tracking-wider text-amber-400">⚠️ Mosaic Moment Alert</p>
                  <p className="text-xs text-amber-200/90 mt-0.5 leading-snug">
                    Post what you are building within the next <strong className="font-mono text-white text-sm">{formatCountdown(alertSeconds)}</strong>!
                  </p>
                </div>
                <button 
                  onClick={() => setShowCamera(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0c0e13] font-bold text-xs cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  Post Now
                </button>
              </div>
            )}

            {/* Daily Battle Plan */}
            {planLoading && (
              <GlassCard className="p-5 animate-pulse border border-[rgba(255,255,255,0.06)] relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "linear-gradient(to bottom, #3dd68c, #a8f0c6)" }} />
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={16} className="text-[#3dd68c] animate-bounce" />
                  <span className="font-display font-semibold text-sm text-[#f0eeff]">Today's Battle Plan</span>
                </div>
                <p className="text-xs font-mono text-[#7a7a9a]">Generating your plan...</p>
              </GlassCard>
            )}

            {!planLoading && battlePlan && (
              <GlassCard className="p-5 border border-[rgba(255,255,255,0.06)] relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "linear-gradient(to bottom, #3dd68c, #a8f0c6)" }} />
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={16} className="text-[#3dd68c]" />
                  <span className="font-display font-semibold text-sm text-[#f0eeff]">Today's Battle Plan</span>
                </div>
                <p className="text-sm whitespace-pre-line leading-relaxed text-[#c8c4e8]">
                  {battlePlan}
                </p>
              </GlassCard>
            )}

            {/* Redesigned Snap Prompt Banner */}
            <GlassCard 
              className="p-5 flex items-center gap-4 relative overflow-hidden transition-all duration-300 hover:border-[rgba(61,214,140,0.4)]"
              style={{
                background: "linear-gradient(135deg, rgba(61,214,140,0.08) 0%, rgba(13,13,20,0.6) 100%)",
                border: "1px solid rgba(61, 214, 140, 0.25)",
                boxShadow: "0 0 20px rgba(61,214,140,0.05)"
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: "rgba(61,214,140,0.15)",
                  border: "1px solid rgba(61,214,140,0.3)",
                  boxShadow: "0 0 12px rgba(61,214,140,0.2)"
                }}
              >
                <Camera size={20} style={{ color: "#3dd68c" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold tracking-wide text-white">
                  📸 Today's Mosaic Moment
                </p>
                <p className="text-xs text-white/70">
                  Share what you're building today.
                </p>
              </div>
              <button 
                onClick={() => setShowCamera(true)}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 font-bold shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
                style={{
                  background: "#3dd68c",
                  color: "#0a0a0f",
                  boxShadow: "0 4px 14px rgba(61,214,140,0.4)"
                }}
              >
                <Zap size={13} fill="#0a0a0f" />
                Snap
              </button>
            </GlassCard>

            {/* Feed list */}
            <div className="flex flex-col gap-4">
              <p className="text-xs font-mono uppercase tracking-widest text-[#7a7a9a]">
                Moments Feed
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
                  <FeedPost key={post.id} post={post} onReact={handleReact} />
                ))
              )}
            </div>
          </div>
        ) : (
          /* =======================================================
             FRIENDS SYSTEM TAB
             ======================================================= */
          <div className="flex flex-col gap-5 animate-page-enter">
            {/* Search users card */}
            <GlassCard className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#3dd68c]" />
                <span className="font-display font-semibold text-sm text-[#f0eeff]">Find Friends</span>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-3.5 text-[#7a7a9a]" />
                <input
                  type="text"
                  placeholder="Search users by name..."
                  className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/40 outline-none border border-white/10 focus:border-[#3dd68c] transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {searchQuery && (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {filteredSearchUsers.length === 0 ? (
                    <p className="text-xs text-[#7a7a9a] text-center py-2">No matching users found</p>
                  ) : (
                    filteredSearchUsers.map(u => {
                      const following = followingIds.includes(u.id);
                      return (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={u.displayName} size={30} />
                            <span className="text-sm font-semibold text-white truncate">{u.displayName}</span>
                          </div>
                          <button
                            onClick={() => toggleFollow(u.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95 ${
                              following
                                ? "bg-white/10 border border-white/10 text-white"
                                : "bg-[#3dd68c] text-[#0c0e13]"
                            }`}
                          >
                            {following ? (
                              <>
                                <UserCheck size={12} />
                                Following
                              </>
                            ) : (
                              <>
                                <UserPlus size={12} />
                                Follow
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </GlassCard>

            {/* Following list */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-mono uppercase tracking-widest text-[#7a7a9a]">
                Following ({followingIds.length})
              </p>
              {followingIds.length === 0 ? (
                <GlassCard className="p-8 text-center bg-white/5 border border-white/5">
                  <p className="text-xs text-[#7a7a9a]">You are not following anyone yet.</p>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {allUsers
                    .filter(u => followingIds.includes(u.id))
                    .map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/10 backdrop-blur-[28px] border border-white/15 shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.displayName} size={32} />
                          <div>
                            <p className="text-sm font-bold text-white leading-tight">{u.displayName}</p>
                            {u.streak > 0 && (
                              <p className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5 mt-0.5">
                                <Flame size={10} className="fill-amber-400" />
                                {u.streak} Day Streak
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleFollow(u.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 border border-white/10 text-white hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 cursor-pointer transition-all"
                        >
                          Unfollow
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
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
