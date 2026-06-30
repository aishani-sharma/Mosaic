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

function withTimeout(promise, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), 5000)),
    ]);
}

function getLocalTasksKey(uid) {
    return `mosaic_local_tasks_${uid}`;
}

function readLocalTasks(uid) {
    if (!uid) return [];
    try {
        const raw = localStorage.getItem(getLocalTasksKey(uid));
        const tasks = raw ? JSON.parse(raw) : [];
        return Array.isArray(tasks) ? tasks : [];
    } catch {
        return [];
    }
}

function writeLocalTasks(uid, tasks) {
    if (!uid) return;
    localStorage.setItem(getLocalTasksKey(uid), JSON.stringify(tasks));
}

const FEATURED_POSTS = [
    {
        id: "seed-atharva-investpro",
        userId: "seed-atharva",
        displayName: "Atharva",
        taskTitle: "Built a fresh InvestPro review screen.",
        caption: "Watchlist and quality curve are finally reading clean.",
        photoURL: "/atharva-investpro.png",
        likes: 0,
        reactions: { clap: 0, fire: 0, rocket: 0, hundred: 0 },
        streak: 3,
        createdAt: new Date("2026-06-30T12:00:00.000Z"),
    },
    {
        id: "seed-aishani-ai-analysis",
        userId: "seed-aishani",
        displayName: "Aishani",
        taskTitle: "Wrapped up the AI text analysis pass.",
        caption: "Detector output is in, next stop is tightening the report.",
        photoURL: "/aishani-ai-analysis.png",
        likes: 0,
        reactions: { clap: 0, fire: 0, rocket: 0, hundred: 0 },
        streak: 2,
        createdAt: new Date("2026-06-30T11:30:00.000Z"),
    },
];

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
    if (!requireDb()) return readLocalTasks(uid);
    try {
        const q = query(
            collection(db, "tasks"),
            where("userId", "==", uid)
        );
        const snap = await withTimeout(getDocs(q), "Tasks request");
        const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return tasks.sort((a, b) => {
            const timeA = a.createdAt?.seconds ?? 0;
            const timeB = b.createdAt?.seconds ?? 0;
            return timeB - timeA;
        });
    } catch (err) {
        console.warn("Falling back to local tasks:", err);
        return readLocalTasks(uid);
    }
}

export async function addTask(uid, task) {
    const payload = {
        ...task,
        userId: uid,
        completed: false,
        priority: "med",
    };

    if (!requireDb()) {
        const localTask = {
            ...payload,
            id: `local-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };
        writeLocalTasks(uid, [localTask, ...readLocalTasks(uid)]);
        return { id: localTask.id };
    }

    try {
        return await withTimeout(addDoc(collection(db, "tasks"), {
            ...payload,
            createdAt: serverTimestamp(),
        }), "Task add");
    } catch (err) {
        console.warn("Saving task locally after Firestore add failure:", err);
        const localTask = {
            ...payload,
            id: `local-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };
        writeLocalTasks(uid, [localTask, ...readLocalTasks(uid)]);
        return { id: localTask.id };
    }
}

export async function updateTask(taskId, data, uid = data?.userId) {
    if (!requireDb() || taskId?.startsWith("local-")) {
        if (!uid) return null;
        const tasks = readLocalTasks(uid).map(task => (
            task.id === taskId ? { ...task, ...data } : task
        ));
        writeLocalTasks(uid, tasks);
        return null;
    }

    try {
        await withTimeout(updateDoc(doc(db, "tasks", taskId), data), "Task update");
    } catch (err) {
        if (!uid) throw err;
        console.warn("Updating task locally after Firestore update failure:", err);
        const tasks = readLocalTasks(uid).map(task => (
            task.id === taskId ? { ...task, ...data } : task
        ));
        writeLocalTasks(uid, tasks);
    }
}

export async function deleteTask(taskId, uid) {
    if (!requireDb() || taskId?.startsWith("local-")) {
        if (!uid) return null;
        writeLocalTasks(uid, readLocalTasks(uid).filter(task => task.id !== taskId));
        return null;
    }

    try {
        await withTimeout(deleteDoc(doc(db, "tasks", taskId)), "Task delete");
    } catch (err) {
        if (!uid) throw err;
        console.warn("Deleting task locally after Firestore delete failure:", err);
        writeLocalTasks(uid, readLocalTasks(uid).filter(task => task.id !== taskId));
    }
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
    if (!requireDb()) return FEATURED_POSTS;
    try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const snap = await withTimeout(getDocs(q), "Feed posts request");
        const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const postIds = new Set(posts.map(p => p.id));
        return [...posts, ...FEATURED_POSTS.filter(p => !postIds.has(p.id))];
    } catch (err) {
        console.warn("Falling back to featured posts:", err);
        return FEATURED_POSTS;
    }
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
