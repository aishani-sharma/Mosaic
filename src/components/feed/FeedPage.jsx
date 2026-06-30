// components/feed/FeedPage.jsx
import { useState, useEffect, useRef } from "react";
import GlassCard from "../ui/GlassCard";
import StreakBadge from "../ui/StreakBadge";
import { Camera, Zap, X, Loader2, Search, Users, UserPlus, UserCheck, Flame, CheckCircle, PartyPopper, Rocket, Trophy, AlertCircle } from "lucide-react";
import { getFeedPosts, createPost, updateUserProfile } from "../../lib/firestore";
import { db, isFirebaseConfigured, storage } from "../../lib/firebase";
import { doc, updateDoc, increment, collection, getDocs } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";

function Avatar({ name, size = 36 }) {
  const initials = name?.slice(0, 1).toUpperCase() ?? "?";
  const colors = ["#64BDE3", "#bdd9fb", "#6af7c2", "#f76a6a"];
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
  if (streakVal >= 7) {
    return (
      <span className="flex items-center gap-1">
        <Flame size={10} className="text-[#7eb8f7]" /> {streakVal} Day Streak
      </span>
    );
  }
  const charCode = username?.charCodeAt(0) || 0;
  if (charCode % 3 === 0) return "Builder";
  if (charCode % 3 === 1) return "Learner";
  return "Athlete";
}

function FeedPost({ post, onReact }) {
  const badge = getBadge(post.displayName, post.streak || 0);
  const rx = post.reactions || { clap: 0, fire: 0, rocket: 0, hundred: 0 };

  return (
    <GlassCard className="flex flex-col gap-3 p-5">
      <div className="flex items-start gap-3">
        <Avatar name={post.displayName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-display font-semibold text-sm truncate" style={{ color: "var(--text-strong)" }}>
                {post.displayName}
              </span>
              {badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: "rgba(255, 250, 244, 0.9)", color: "var(--text-muted)", border: "1px solid rgba(115, 120, 125, 0.12)" }}>
                  {badge}
                </span>
              )}
            </div>
            <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
              {formatTimeAgo(post.createdAt)}
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text)" }}>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle size={14} className="shrink-0" style={{ color: "var(--accent-strong)" }} />
              {post.taskTitle}
            </span>
          </p>
        </div>
      </div>

      {post.photoURL ? (
        <>
          <div
            className="relative w-full rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)] bg-black"
            style={{ maxHeight: 400 }}
          >
            <img
              src={post.photoURL}
              alt="Proof snap"
              className="w-full object-cover"
              style={{ maxHeight: 400 }}
            />
          </div>
          {post.caption ? (
            <p className="text-xs leading-relaxed -mt-1" style={{ color: "var(--text-muted)" }}>
              {post.caption}
            </p>
          ) : null}
        </>
      ) : (
        <div
          className="w-full h-[120px] rounded-xl flex items-center justify-center px-6 text-center select-none"
          style={{
            background: "linear-gradient(135deg, rgba(126,184,211,0.12) 0%, rgba(255,252,247,0.96) 100%)",
            border: "1px solid rgba(115,120,125,0.1)"
          }}
        >
          <span className="text-sm font-semibold tracking-wide leading-relaxed" style={{ color: "var(--text-strong)" }}>
            {post.taskTitle}
          </span>
        </div>
      )}

      {/* Productivity Reactions Row */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        {[
          { key: "clap", label: <PartyPopper size={12} className="text-amber-400" /> },
          { key: "fire", label: <Flame size={12} className="text-[#7eb8f7]" /> },
          { key: "rocket", label: <Rocket size={12} className="text-indigo-400" /> },
          { key: "hundred", label: <Trophy size={12} className="text-yellow-400" /> },
        ].map((r) => (
          <button
            key={r.key}
            onClick={() => {
              onReact(post.id, r.key);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer active:scale-125"
            style={{ border: "1px solid rgba(115,120,125,0.1)", background: "rgba(255,252,247,0.88)", color: "var(--text-muted)" }}
          >
            <span>{r.label}</span>
            <span className="font-mono text-[10px] font-bold" style={{ color: "var(--text)" }}>{rx[r.key] || 0}</span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

export default function FeedPage({ user, userContext, isActive, onNavigate, openCamera, onCameraOpened }) {
  const [activeSection, setActiveSection] = useState("moments"); // moments or friends
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);


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
    if (isFirebaseConfigured && db) {
      getDocs(collection(db, "users")).then((snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllUsers(list);
      }).catch((err) => {
        console.error("Error loading users:", err);
        setAllUsers([]);
      });
    } else {
      setAllUsers([]);
    }

    // Scheduled Mosaic Moment Alert notification check
    const today = new Date().toDateString();
    const lastAlert = localStorage.getItem("last_alert_date");
    if (lastAlert !== today) {
      setAlertActive(true);
      localStorage.setItem("last_alert_date", today);
    }
  }, [isActive, user?.uid, userContext]);

  // Handle local user's follow state initialization
  useEffect(() => {
    if (userContext) {
      setFollowingIds(userContext.following || []);
    }
  }, [userContext]);

  useEffect(() => {
    if (!isActive || !openCamera) return;
    setShowCamera(true);
    onCameraOpened?.();
  }, [isActive, openCamera, onCameraOpened]);

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
      let photoURL = null;
      if (capturedPhoto && storage) {
        const photoRef = ref(storage, `posts/${user.uid}/${Date.now()}.jpg`);
        await uploadString(photoRef, capturedPhoto, "data_url");
        photoURL = await getDownloadURL(photoRef);
      }

      await createPost(
        user.uid,
        user.displayName || "Mosaicker",
        taskTitle.trim(),
        photoURL
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
    if (!isFirebaseConfigured || !db) return;
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
  const suggestedUsers = allUsers.filter(u => u.id !== user?.uid && !followingIds.includes(u.id)).slice(0, 5);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const storyUsers = allUsers.filter(u => u.id !== user?.uid).slice(0, 5);

  return (
    <div className="relative min-h-screen pb-12">
      <div className="flex gap-6 max-w-6xl mx-auto px-4 md:px-8 py-6 relative z-10 animate-page-enter">

        {/* LEFT COLUMN (Main Feed or Friends List) */}
        <div className="flex-1 max-w-[680px] min-w-0 flex flex-col gap-4">

          {/* Top header row with underline tabs and Snap button */}
          <div className="flex items-center justify-between pb-4 mb-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(115,120,125,0.12)" }}>
            <div className="flex gap-6">
              <button
                onClick={() => setActiveSection("moments")}
                className="pb-2 text-sm font-bold tracking-wide relative cursor-pointer outline-none transition-colors bg-transparent border-none"
                style={{ color: activeSection === "moments" ? "var(--accent-strong)" : "var(--text-muted)" }}
              >
                Moments
                {activeSection === "moments" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--accent-strong)" }} />
                )}
              </button>
              <button
                onClick={() => setActiveSection("friends")}
                className="pb-2 text-sm font-bold tracking-wide relative cursor-pointer outline-none transition-colors bg-transparent border-none"
                style={{ color: activeSection === "friends" ? "var(--accent-strong)" : "var(--text-muted)" }}
              >
                Friends
                {activeSection === "friends" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--accent-strong)" }} />
                )}
              </button>
            </div>

            <button
              onClick={() => setShowCamera(true)}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 font-bold shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
              style={{
                background: "var(--accent)",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(126, 184, 211, 0.3)"
              }}
            >
              <Camera size={13} fill="#ffffff" />
              Snap
            </button>
          </div>

          {activeSection === "moments" ? (
            /* =======================================================
               MOMENTS FEED TAB
               ======================================================= */
            <div className="flex flex-col gap-4">

              {/* Stories style horizontal row */}
              <GlassCard className="flex gap-4 overflow-x-auto pb-4 pt-1 px-4 mb-2 scrollbar-none flex-shrink-0 select-none">
                {/* Real User Snap trigger */}
                <div
                  onClick={() => setShowCamera(true)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group"
                >
                  <div className="w-14 h-14 rounded-full border-2 border-[#7eb8f7] p-0.5 flex items-center justify-center transition-transform group-hover:scale-105">
                    <Avatar name={user?.displayName || "You"} size={48} />
                  </div>
                  <span className="text-[10px] font-medium max-w-[60px] truncate" style={{ color: "var(--text-muted)" }}>Your Snap</span>
                </div>

                {storyUsers.map((story) => (
                  <div key={story.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div className="w-14 h-14 rounded-full border-2 border-[#7eb8f7]/40 p-0.5 flex items-center justify-center">
                      <Avatar name={story.displayName} size={48} />
                    </div>
                    <span className="text-[10px] font-medium max-w-[60px] truncate" style={{ color: "var(--text-muted)" }}>{story.displayName}</span>
                  </div>
                ))}
              </GlassCard>

              {/* Scheduled posting alert */}
              {alertActive && (
                <div
                  className="p-4 rounded-2xl border flex items-center justify-between animate-pulse shadow-lg mb-2"
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    borderColor: "rgba(245, 158, 11, 0.4)",
                    color: "#fef3c7"
                  }}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-xs font-bold font-mono uppercase tracking-wider text-amber-700">Mosaic Moment Alert</p>
                    <p className="text-xs mt-0.5 leading-snug text-amber-900/80">
                      Post what you are building within the next <strong className="font-mono text-amber-950 text-sm">{formatCountdown(alertSeconds)}</strong>!
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

              {/* Feed list */}
              <div className="flex flex-col">
                {loadingPosts ? (
                  <div className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto mb-2" style={{ color: "var(--accent-strong)" }} size={24} />
                    <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading wins feed...</p>
                  </div>
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
                  <Users size={16} style={{ color: "var(--accent-strong)" }} />
                  <span className="font-display font-semibold text-sm" style={{ color: "var(--text-strong)" }}>Find Friends</span>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-3.5" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Search users by name..."
                    className="input-glass w-full rounded-xl pl-10 pr-4 py-3 text-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                {searchQuery && (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {filteredSearchUsers.length === 0 ? (
                      <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>No matching users found</p>
                    ) : (
                      filteredSearchUsers.map(u => {
                        const following = followingIds.includes(u.id);
                        return (
                          <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl" style={{ background: "rgba(255,252,247,0.82)", border: "1px solid rgba(115,120,125,0.08)" }}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar name={u.displayName} size={30} />
                              <span className="text-sm font-semibold truncate" style={{ color: "var(--text-strong)" }}>{u.displayName}</span>
                            </div>
                            <button
                              onClick={() => toggleFollow(u.id)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95"
                              style={following
                                ? { background: "rgba(255,250,244,0.9)", border: "1px solid rgba(115,120,125,0.12)", color: "var(--text)" }
                                : { background: "var(--accent)", color: "#ffffff" }}
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

                {/* Friend suggestions list inside the card */}
                <div className="flex flex-col gap-3 mt-2 pt-4" style={{ borderTop: "1px solid rgba(115,120,125,0.1)" }}>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Suggested for You</span>
                  <div className="flex flex-col gap-3">
                    {suggestedUsers.map((u) => {
                      const isFollowing = followingIds.includes(u.id);
                      return (
                        <div key={u.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={u.displayName} size={30} />
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate" style={{ color: "var(--text-strong)" }}>{u.displayName}</p>
                              <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{u.role || "Mosaic user"}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleFollow(u.id)}
                            className="text-xs font-bold cursor-pointer transition-colors outline-none bg-transparent border-none"
                            style={{ color: isFollowing ? "var(--text-muted)" : "var(--accent-strong)" }}
                          >
                            {isFollowing ? "Following" : "Follow"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </GlassCard>

              {/* Following list */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Following ({followingIds.length})
                </p>
                {followingIds.length === 0 ? (
                  <GlassCard className="p-8 text-center">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>You are not following anyone yet.</p>
                  </GlassCard>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {allUsers
                      .filter(u => followingIds.includes(u.id))
                      .map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl shadow-sm" style={{ background: "rgba(255,252,247,0.82)", border: "1px solid rgba(115,120,125,0.1)" }}>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={u.displayName} size={32} />
                            <div>
                              <p className="text-sm font-bold leading-tight" style={{ color: "var(--text-strong)" }}>{u.displayName}</p>
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
                            className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all"
                            style={{ background: "rgba(255,250,244,0.92)", border: "1px solid rgba(115,120,125,0.12)", color: "var(--text)" }}
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

        {/* RIGHT COLUMN (Suggested + Activity Panel) */}
        <div className="w-[280px] shrink-0 sticky top-6 self-start flex flex-col gap-6 hidden md:flex">

          {/* Your Activity mini card */}
          <GlassCard className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={user?.displayName || "You"} size={48} />
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "var(--text-strong)" }}>{user?.displayName || "Mosaicker"}</p>
                <span
                  onClick={() => onNavigate?.("profile")}
                  className="text-[10px] font-semibold cursor-pointer hover:underline"
                  style={{ color: "var(--accent-strong)" }}
                >
                  View Profile
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-1" style={{ borderTop: "1px solid rgba(115,120,125,0.1)" }}>
              <div className="flex justify-between items-center text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                <span>CURRENT STREAK</span>
                <StreakBadge streak={userContext?.streak || 0} />
              </div>
            </div>
          </GlassCard>

          {/* Suggested for You section */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Suggested for You</span>
            <div className="flex flex-col gap-3">
              {suggestedUsers.map((u) => {
                const isFollowing = followingIds.includes(u.id);
                return (
                  <div key={u.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={u.displayName} size={32} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: "var(--text-strong)" }}>{u.displayName}</p>
                        <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{u.role || "Mosaic user"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFollow(u.id)}
                      className="text-xs font-bold cursor-pointer transition-colors outline-none bg-transparent border-none"
                      style={{ color: isFollowing ? "var(--text-muted)" : "var(--accent-strong)" }}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Friends Activity section */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Friends Activity</span>
            {followingIds.length > 0 ? (
              <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                {allUsers
                  .filter(u => followingIds.includes(u.id))
                  .map(u => (
                    <div key={u.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={u.displayName} size={32} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: "var(--text-strong)" }}>{u.displayName}</p>
                          {u.streak > 0 && (
                            <p className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                              <Flame size={10} className="fill-amber-400" />
                              {u.streak}d streak
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>Follow people to see their activity here</p>
            )}
          </div>

        </div>

      </div>

      {/* Camera Modal Overlay */}
      {showCamera && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(10, 10, 15, 0.8)", backdropFilter: "blur(8px)" }}
        >
          <GlassCard className="w-full max-w-md p-6 relative overflow-hidden" style={{ border: "1px solid rgba(115, 120, 125, 0.12)" }}>
            <button
              onClick={() => {
                if (stream) {
                  stream.getTracks().forEach(track => track.stop());
                  setStream(null);
                }
                setShowCamera(false);
              }}
              className="absolute top-4 right-4 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={18} />
            </button>
            <h3 className="font-display font-semibold text-lg mb-4" style={{ color: "var(--text-strong)" }}>Take a Snap</h3>

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
                style={{ background: "#7eb8f7", color: "#0c0e13" }}
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
          <GlassCard className="w-full max-w-md p-6 relative overflow-hidden" style={{ border: "1px solid rgba(115, 120, 125, 0.12)" }}>
            <button
              type="button"
              onClick={() => {
                setCapturedPhoto(null);
                setShowPostDialog(false);
              }}
              className="absolute top-4 right-4 transition-colors"
              style={{ color: "var(--text-muted)" }}
              disabled={posting}
            >
              <X size={18} />
            </button>
            <h3 className="font-display font-semibold text-lg mb-4" style={{ color: "var(--text-strong)" }}>Share Your Win</h3>

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
                  className="input-glass w-full py-2.5 px-3 text-sm rounded-xl"
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
                  style={{ background: "#7eb8f7", color: "#0c0e13" }}
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
