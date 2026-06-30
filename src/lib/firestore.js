// lib/firestore.js
import { db } from "./firebase";
import {
    doc, getDoc, setDoc, updateDoc,
    collection, addDoc, getDocs, deleteDoc,
    query, where, orderBy, serverTimestamp
} from "firebase/firestore";

function requireDb() {
    return !!db;
}

// ── User Profile ───────────────────────────────────────────────
export async function getUserProfile(uid) {
    if (!requireDb()) return null;
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
}

export async function createUserProfile(uid, data) {
    if (!requireDb()) return null;
    const ref = doc(db, "users", uid);
    await setDoc(ref, {
        ...data,
        xp: 0,
        level: 1,
        streak: 0,
        lastActiveDate: null,
        tasksCompleted: 0,
        pomodoroSessions: 0,
        createdAt: serverTimestamp(),
    });
}

export async function updateUserProfile(uid, data) {
    if (!requireDb()) return null;
    const ref = doc(db, "users", uid);
    await updateDoc(ref, data);
}

// ── Streak logic ───────────────────────────────────────────────
export async function checkAndUpdateStreak(uid) {
    if (!requireDb()) return;
    const profile = await getUserProfile(uid);
    if (!profile) return;

    const today = new Date().toDateString();
    const last = profile.lastActiveDate;

    if (last === today) return; // already updated today

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newStreak = last === yesterday ? (profile.streak ?? 0) + 1 : 1;

    await updateUserProfile(uid, {
        lastActiveDate: today,
        streak: newStreak,
    });
}

// ── Tasks ──────────────────────────────────────────────────────
export async function getUserTasks(uid) {
    if (!requireDb()) return [];
    const q = query(
        collection(db, "tasks"),
        where("userId", "==", uid)
    );
    const snap = await getDocs(q);
    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return tasks.sort((a, b) => {
        const timeA = a.createdAt?.seconds ?? 0;
        const timeB = b.createdAt?.seconds ?? 0;
        return timeB - timeA;
    });
}

export async function addTask(uid, task) {
    if (!requireDb()) return null;
    return addDoc(collection(db, "tasks"), {
        ...task,
        userId: uid,
        completed: false,
        priority: "med",
        createdAt: serverTimestamp(),
    });
}

export async function updateTask(taskId, data) {
    if (!requireDb()) return null;
    await updateDoc(doc(db, "tasks", taskId), data);
}

export async function deleteTask(taskId) {
    if (!requireDb()) return null;
    await deleteDoc(doc(db, "tasks", taskId));
}

const XP_PER_TASK = 50;
const XP_PER_LEVEL = 100;

export async function awardXP(uid, amount = XP_PER_TASK) {
    if (!requireDb()) return null;
    const profile = await getUserProfile(uid);
    if (!profile) return null;
    const xp = (profile.xp ?? 0) + amount;
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    await updateUserProfile(uid, { xp, level });
    return { xp, level };
}



// ── Feed Posts ─────────────────────────────────────────────────
export async function getFeedPosts() {
    if (!requireDb()) return [];
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createPost(uid, displayName, taskTitle, photoURL = null) {
    if (!requireDb()) return null;
    return addDoc(collection(db, "posts"), {
        userId: uid,
        displayName,
        taskTitle,
        photoURL,
        likes: 0,
        createdAt: serverTimestamp(),
    });
}
