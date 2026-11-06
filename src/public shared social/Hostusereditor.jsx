import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/Firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

/*
  NOTEZ HOST HUB
  - Uses the existing Firebase auth/db instance.
  - Uses the existing Group collection and members/messages subcollections.
  - No localStorage/demo data/fake numbers.
  - Designed for /hostenterfaced.
*/

const SUBCOLLECTIONS = ["members", "messages", "discussions", "files"];

const styles = `
:root{--hh-bg:#02050a;--hh-panel:rgba(9,15,20,.78);--hh-panel2:rgba(13,21,27,.9);--hh-border:rgba(113,255,185,.14);--hh-border2:rgba(255,255,255,.08);--hh-green:#5cffaa;--hh-green2:#22d27a;--hh-text:#f4fff9;--hh-muted:#8d9c96;--hh-danger:#ff6262;--hh-shadow:0 24px 80px rgba(0,0,0,.45)}
*{box-sizing:border-box}.hh{min-height:100vh;background:radial-gradient(circle at 10% 0%,rgba(44,255,146,.08),transparent 30%),radial-gradient(circle at 90% 10%,rgba(80,120,255,.07),transparent 25%),#02050a;color:var(--hh-text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-x:hidden;position:relative}
.hh:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.22;background-image:radial-gradient(circle at 20% 30%,#fff 0 1px,transparent 1.5px),radial-gradient(circle at 70% 20%,#fff 0 1px,transparent 1.5px),radial-gradient(circle at 82% 78%,#fff 0 1px,transparent 1.5px),radial-gradient(circle at 35% 82%,#fff 0 1px,transparent 1.5px);background-size:240px 240px,310px 310px,370px 370px,430px 430px}
.hh-shell{width:min(1440px,calc(100% - 36px));margin:auto;position:relative;z-index:1}.hh-top{height:76px;border-bottom:1px solid var(--hh-border2);display:flex;align-items:center;gap:18px;position:sticky;top:0;background:rgba(2,5,10,.78);backdrop-filter:blur(18px);z-index:20}.hh-brand{display:flex;align-items:center;gap:12px;min-width:220px}.hh-logo{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(145deg,#07150f,#10281c);border:1px solid rgba(92,255,170,.3);box-shadow:0 0 30px rgba(92,255,170,.12);font-weight:900;color:var(--hh-green)}.hh-brand b{font-size:15px;letter-spacing:.08em}.hh-brand span{display:block;color:var(--hh-muted);font-size:11px;margin-top:2px}.hh-top-spacer{flex:1}.hh-live{display:flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--hh-border);border-radius:999px;background:rgba(92,255,170,.04);font-size:12px;color:#c9ded5}.hh-dot{width:7px;height:7px;background:var(--hh-green);border-radius:50%;box-shadow:0 0 12px var(--hh-green);animation:pulse 1.8s infinite}.hh-profile{display:flex;align-items:center;gap:10px;padding:6px 9px;border:1px solid var(--hh-border2);border-radius:14px;background:rgba(255,255,255,.025)}.hh-avatar{width:36px;height:36px;border-radius:11px;object-fit:cover;background:#0c1513;display:grid;place-items:center;color:var(--hh-green);font-weight:800}.hh-profile-name{font-size:12px;font-weight:750}.hh-profile-email{font-size:10px;color:var(--hh-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hh-badge{font-size:9px;color:#031009;background:var(--hh-green);border-radius:999px;padding:3px 7px;font-weight:900;margin-left:4px}.hh-back{border:1px solid var(--hh-border2);background:transparent;color:#dce9e3;padding:10px 12px;border-radius:11px;cursor:pointer}.hh-back:hover{border-color:var(--hh-border);background:rgba(92,255,170,.05)}
.hh-hero{padding:42px 0 26px;display:flex;justify-content:space-between;gap:28px;align-items:end}.hh-kicker{font-size:11px;letter-spacing:.2em;color:var(--hh-green);font-weight:800}.hh-hero h1{font-size:clamp(34px,5vw,66px);line-height:.98;margin:10px 0 14px;letter-spacing:-.055em}.hh-hero p{color:var(--hh-muted);max-width:650px;line-height:1.65;margin:0}.hh-hero-orb{width:170px;height:170px;border-radius:50%;border:1px solid rgba(92,255,170,.18);background:radial-gradient(circle at 50% 45%,rgba(92,255,170,.16),transparent 48%),rgba(255,255,255,.01);box-shadow:inset 0 0 50px rgba(92,255,170,.05),0 0 80px rgba(92,255,170,.05);animation:float 5s ease-in-out infinite;flex:none}
.hh-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:30px}.hh-stat{background:var(--hh-panel);border:1px solid var(--hh-border2);border-radius:18px;padding:18px;box-shadow:var(--hh-shadow)}.hh-stat small{color:var(--hh-muted);font-size:10px;letter-spacing:.13em}.hh-stat strong{display:block;font-size:28px;margin-top:9px;letter-spacing:-.03em}.hh-stat em{font-style:normal;color:var(--hh-green);font-size:10px}
.hh-section{margin:28px 0}.hh-section-head{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:14px}.hh-section-head h2{font-size:18px;margin:0}.hh-search{width:min(320px,100%);background:rgba(255,255,255,.035);border:1px solid var(--hh-border2);color:white;padding:11px 13px;border-radius:12px;outline:none}.hh-search:focus{border-color:var(--hh-border)}.hh-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.hh-card{background:linear-gradient(145deg,rgba(13,20,25,.88),rgba(5,10,14,.88));border:1px solid var(--hh-border2);border-radius:20px;overflow:hidden;transition:.25s transform,.25s border-color,.25s box-shadow}.hh-card:hover{transform:translateY(-4px);border-color:var(--hh-border);box-shadow:0 20px 70px rgba(0,0,0,.45),0 0 30px rgba(92,255,170,.04)}.hh-cover{height:150px;background:linear-gradient(135deg,#07110d,#111a1d);position:relative;overflow:hidden}.hh-cover img{width:100%;height:100%;object-fit:cover}.hh-cover:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(2,5,10,.8))}.hh-status{position:absolute;z-index:2;top:12px;right:12px;padding:6px 9px;border-radius:999px;background:rgba(2,5,10,.75);border:1px solid var(--hh-border2);font-size:9px;font-weight:800}.hh-card-body{padding:17px}.hh-card-title{display:flex;justify-content:space-between;gap:10px}.hh-card-title h3{margin:0;font-size:17px}.hh-card p{color:var(--hh-muted);font-size:12px;line-height:1.55;min-height:38px}.hh-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:13px 0}.hh-meta div{border:1px solid var(--hh-border2);border-radius:11px;padding:9px}.hh-meta span{display:block;color:var(--hh-muted);font-size:9px}.hh-meta b{display:block;margin-top:4px;font-size:12px}.hh-live-text{color:var(--hh-green)!important}.hh-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.hh-btn{border:1px solid var(--hh-border2);background:rgba(255,255,255,.035);color:#eaf6f0;padding:10px;border-radius:10px;cursor:pointer;font-weight:700;font-size:11px}.hh-btn:hover{border-color:var(--hh-border);background:rgba(92,255,170,.06)}.hh-btn.primary{background:rgba(92,255,170,.1);border-color:rgba(92,255,170,.24);color:var(--hh-green)}.hh-btn.danger{color:#ff8c8c;border-color:rgba(255,98,98,.18)}.hh-btn:disabled{opacity:.5;cursor:not-allowed}
.hh-empty,.hh-loading{padding:50px;text-align:center;border:1px dashed var(--hh-border2);border-radius:20px;color:var(--hh-muted)}.hh-empty strong{display:block;color:#fff;margin-bottom:6px}.hh-overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(12px);z-index:50;display:grid;place-items:center;padding:18px;animation:fade .18s ease}.hh-modal{width:min(720px,100%);max-height:92vh;overflow:auto;background:#071016;border:1px solid var(--hh-border);border-radius:22px;box-shadow:0 40px 120px rgba(0,0,0,.65);animation:modal .22s ease}.hh-modal-head{padding:19px 20px;border-bottom:1px solid var(--hh-border2);display:flex;justify-content:space-between;align-items:center}.hh-modal-head h3{margin:0;font-size:16px}.hh-x{background:transparent;border:0;color:#9ba9a3;font-size:22px;cursor:pointer}.hh-modal-body{padding:20px}.hh-form{display:grid;gap:14px}.hh-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.hh-field label{display:block;font-size:10px;color:var(--hh-muted);margin-bottom:7px;letter-spacing:.08em}.hh-field input,.hh-field textarea,.hh-field select{width:100%;background:#03080c;border:1px solid var(--hh-border2);color:white;border-radius:11px;padding:11px 12px;outline:none}.hh-field textarea{min-height:90px;resize:vertical}.hh-field input:focus,.hh-field textarea:focus,.hh-field select:focus{border-color:var(--hh-border)}.hh-password{position:relative}.hh-password button{position:absolute;right:7px;top:7px;border:0;background:transparent;color:#899892;cursor:pointer}.hh-modal-foot{padding:14px 20px;border-top:1px solid var(--hh-border2);display:flex;justify-content:flex-end;gap:8px}.hh-security{display:grid;gap:16px}.hh-security-block{border:1px solid var(--hh-border2);border-radius:16px;padding:16px;background:rgba(255,255,255,.02)}.hh-security-block h4{margin:0 0 12px;font-size:13px}.hh-toast{position:fixed;right:22px;bottom:22px;z-index:100;min-width:280px;max-width:420px;padding:13px 15px;border-radius:14px;border:1px solid var(--hh-border);background:#07130f;color:#dfffee;box-shadow:0 18px 50px rgba(0,0,0,.45);animation:toast .25s ease}.hh-toast.error{border-color:rgba(255,98,98,.3);background:#180b0b;color:#ffdede}.hh-confirm p{color:var(--hh-muted);line-height:1.6}.hh-confirm strong{color:white}.hh-member-list{display:grid;gap:8px;max-height:420px;overflow:auto}.hh-member{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--hh-border2);border-radius:12px}.hh-member img,.hh-member-avatar{width:34px;height:34px;border-radius:10px;object-fit:cover;background:#101916;display:grid;place-items:center;color:var(--hh-green);font-weight:800}.hh-member-info{flex:1}.hh-member-info b{display:block;font-size:12px}.hh-member-info span{color:var(--hh-muted);font-size:10px}.hh-online{font-size:9px;color:var(--hh-green)}
@keyframes pulse{50%{opacity:.4;transform:scale(.75)}}@keyframes float{50%{transform:translateY(-8px)}}@keyframes fade{from{opacity:0}to{opacity:1}}@keyframes modal{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}@keyframes toast{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media(max-width:1000px){.hh-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hh-stats{grid-template-columns:repeat(2,1fr)}.hh-hero-orb{display:none}}@media(max-width:700px){.hh-shell{width:min(100% - 22px,1440px)}.hh-top{height:auto;min-height:70px;flex-wrap:wrap;padding:10px 0}.hh-brand{min-width:auto}.hh-profile-email,.hh-badge{display:none}.hh-live{order:3;width:100%;justify-content:center}.hh-hero{padding:30px 0 20px}.hh-hero h1{font-size:40px}.hh-grid{grid-template-columns:1fr}.hh-stats{grid-template-columns:1fr 1fr}.hh-section-head{align-items:stretch;flex-direction:column}.hh-search{width:100%}.hh-row{grid-template-columns:1fr}.hh-modal{border-radius:17px}.hh-modal-foot{position:sticky;bottom:0;background:#071016}.hh-actions{grid-template-columns:1fr 1fr}}
@media(max-width:430px){.hh-stats{grid-template-columns:1fr}.hh-top-spacer{display:none}.hh-back{margin-left:auto}.hh-actions{grid-template-columns:1fr}.hh-toast{left:11px;right:11px;min-width:0}}
`;

const formatDate = (value) => {
  if (!value) return "—";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const initials = (name = "Host") =>
  name.trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "H";

export default function Hostenterfaced() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [groups, setGroups] = useState([]);
  const [memberStats, setMemberStats] = useState({});
  const [messageCounts, setMessageCounts] = useState({});
  const [membersByGroup, setMembersByGroup] = useState({});
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [securityForm, setSecurityForm] = useState({
    currentGroupPassword: "", newGroupPassword: "", confirmGroupPassword: "",
    currentHostPassword: "", newHostPassword: "", confirmHostPassword: "",
  });
  const [visible, setVisible] = useState({});

  const passedGroup = location.state?.group || null;

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    let active = true;
    const byId = new Map();
    let unsubUid = () => {};
    let unsubEmail = () => {};

    const publish = () => {
      if (active) setGroups(Array.from(byId.values()).sort((a, b) => {
        const at = a.createdAt?.toMillis?.() || 0;
        const bt = b.createdAt?.toMillis?.() || 0;
        return bt - at;
      }));
    };

    const attach = (field, value) => {
      if (!value) return () => {};
      const q = query(collection(db, "Group"), where(field, "==", value));
      return onSnapshot(q, (snap) => {
        snap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
        const currentIds = new Set(snap.docs.map((d) => d.id));
        Array.from(byId.keys()).forEach((id) => {
          const existing = byId.get(id);
          if (existing && existing[field] === value && !currentIds.has(id)) byId.delete(id);
        });
        publish();
      }, () => showToast("Unable to load group data.", "error"));
    };

    unsubUid = attach("hostUid", user.uid);
    unsubEmail = attach("hostEmail", user.email || "");

    return () => {
      active = false;
      unsubUid();
      unsubEmail();
    };
  }, [authReady, user, navigate]);

  useEffect(() => {
    const cleanups = [];
    groups.forEach((group) => {
      const membersRef = collection(db, "Group", group.id, "members");
      const unsub = onSnapshot(membersRef, (snap) => {
        const members = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const now = Date.now();
        const live = members.filter((m) => {
          const last = m.lastSeenAt?.toMillis?.() || 0;
          return m.isOnline === true && last > now - 70_000;
        });
        setMemberStats((prev) => ({ ...prev, [group.id]: { total: members.length, live: live.length } }));
        setMembersByGroup((prev) => ({ ...prev, [group.id]: members }));
      }, () => showToast(`Unable to load members for ${group.groupName || "group"}.`, "error"));
      cleanups.push(unsub);

      const messagesRef = query(collection(db, "Group", group.id, "messages"), orderBy("createdAt", "asc"));
      const unsubMessages = onSnapshot(messagesRef, (snap) => {
        setMessageCounts((prev) => ({ ...prev, [group.id]: snap.size }));
      }, () => setMessageCounts((prev) => ({ ...prev, [group.id]: null })));
      cleanups.push(unsubMessages);
    });
    return () => cleanups.forEach((fn) => fn());
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((g) => `${g.groupName || ""} ${g.groupDescription || ""}`.toLowerCase().includes(term));
  }, [groups, search]);

  const liveTotal = Object.values(memberStats).reduce((sum, s) => sum + (s?.live || 0), 0);
  const totalMembers = Object.values(memberStats).reduce((sum, s) => sum + (s?.total || 0), 0);
  const activeGroups = groups.filter((g) => (memberStats[g.id]?.live || 0) > 0).length;

  const openEdit = (group) => {
    setSelectedGroup(group);
    setEditForm({
      groupName: group.groupName || "",
      groupDescription: group.groupDescription || "",
      groupPhoto: group.groupPhoto || "",
      isPrivate: Boolean(group.isPrivate),
      maxMembers: group.maxMembers || 10,
    });
    setModal("edit");
  };

  const openSecurity = (group) => {
    setSelectedGroup(group);
    setSecurityForm({ currentGroupPassword: "", newGroupPassword: "", confirmGroupPassword: "", currentHostPassword: "", newHostPassword: "", confirmHostPassword: "" });
    setVisible({});
    setModal("security");
  };

  const openMembers = (group) => { setSelectedGroup(group); setModal("members"); };

  const saveGroup = async () => {
    if (!selectedGroup || !user) return;
    if (selectedGroup.hostUid && selectedGroup.hostUid !== user.uid && selectedGroup.hostEmail !== user.email) {
      showToast("You do not have permission to perform this action.", "error"); return;
    }
    if (!editForm.groupName.trim()) { showToast("Group name is required.", "error"); return; }
    const max = Math.max(2, Math.min(100, Number(editForm.maxMembers) || 10));
    setSaving(true);
    try {
      await updateDoc(doc(db, "Group", selectedGroup.id), {
        groupName: editForm.groupName.trim(),
        groupDescription: editForm.groupDescription.trim(),
        groupPhoto: editForm.groupPhoto.trim(),
        isPrivate: Boolean(editForm.isPrivate),
        maxMembers: max,
        updatedAt: serverTimestamp(),
      });
      setModal(null);
      showToast("Group saved successfully.");
    } catch (error) {
      console.error(error);
      showToast("Unable to save group changes.", "error");
    } finally { setSaving(false); }
  };

  const updatePassword = async (kind) => {
    if (!selectedGroup || !user) return;
    const isGroup = kind === "group";
    const current = isGroup ? securityForm.currentGroupPassword : securityForm.currentHostPassword;
    const next = isGroup ? securityForm.newGroupPassword : securityForm.newHostPassword;
    const confirm = isGroup ? securityForm.confirmGroupPassword : securityForm.confirmHostPassword;
    const saved = isGroup ? (selectedGroup.groupPassword || "") : (selectedGroup.hostPassword || selectedGroup.hostPanelPassword || "");

    if (!saved) { showToast(`No existing ${isGroup ? "group" : "host"} password is configured.`, "error"); return; }
    if (current !== String(saved)) { showToast(`Current ${isGroup ? "group" : "host"} password is incorrect.`, "error"); return; }
    if (next.length < 4) { showToast(`${isGroup ? "New password" : "New host password"} must contain at least 4 characters.`, "error"); return; }
    if (next !== confirm) { showToast("New passwords do not match.", "error"); return; }

    setSaving(true);
    try {
      const payload = isGroup ? { groupPassword: next, updatedAt: serverTimestamp() } : { hostPassword: next, hostPanelPassword: next, updatedAt: serverTimestamp() };
      await updateDoc(doc(db, "Group", selectedGroup.id), payload);
      setSecurityForm((prev) => ({ ...prev, ...(isGroup ? { currentGroupPassword: "", newGroupPassword: "", confirmGroupPassword: "" } : { currentHostPassword: "", newHostPassword: "", confirmHostPassword: "" }) }));
      showToast(isGroup ? "Group password changed successfully." : "Host password changed successfully.");
    } catch (error) {
      console.error(error);
      showToast("Unable to update password.", "error");
    } finally { setSaving(false); }
  };

  const deleteCollectionDocs = async (collectionRef) => {
    const snap = await getDocs(collectionRef);
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 450) {
      const batch = writeBatch(db);
      docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  };

  const deleteGroup = async () => {
    if (!selectedGroup || !user) return;
    const authorized = selectedGroup.hostUid === user.uid || selectedGroup.hostEmail === user.email;
    if (!authorized) { showToast("You are not authorized to delete this group.", "error"); return; }
    setDeleting(true);
    try {
      for (const name of SUBCOLLECTIONS) await deleteCollectionDocs(collection(db, "Group", selectedGroup.id, name));
      await deleteDoc(doc(db, "Group", selectedGroup.id));
      setModal(null);
      setSelectedGroup(null);
      showToast("Group deleted successfully.");
    } catch (error) {
      console.error(error);
      showToast("Unable to delete the group safely.", "error");
    } finally { setDeleting(false); }
  };

  const openGroup = (group) => {
    navigate("/USERINTERFACED", { state: { groupId: group.id, groupName: group.groupName, hostName: group.hostName || user?.displayName || "Host", group } });
  };

  const renderPasswordField = (label, value, onChange, keyName) => (
    <div className="hh-field">
      <label>{label}</label>
      <div className="hh-password">
        <input type={visible[keyName] ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" />
        <button type="button" onClick={() => setVisible((p) => ({ ...p, [keyName]: !p[keyName] }))}>{visible[keyName] ? "Hide" : "Show"}</button>
      </div>
    </div>
  );

  if (!authReady || !user) return <div className="hh"><style>{styles}</style><div className="hh-shell"><div className="hh-loading">Securing your Host Hub…</div></div></div>;

  return (
    <div className="hh">
      <style>{styles}</style>
      <div className="hh-shell">
        <header className="hh-top">
          <div className="hh-brand"><div className="hh-logo">N</div><div><b>NoteZ · HOST HUB</b><span>Group Management Center</span></div></div>
          <div className="hh-top-spacer" />
          <div className="hh-live"><span className="hh-dot" /> LIVE · {liveTotal} online</div>
          <div className="hh-profile">
            {user.photoURL ? <img className="hh-avatar" src={user.photoURL} alt="Host" /> : <div className="hh-avatar">{initials(user.displayName || user.email || "Host")}</div>}
            <div><div className="hh-profile-name">{user.displayName || "Host"}<span className="hh-badge">HOST</span></div><div className="hh-profile-email">{user.email}</div></div>
          </div>
          <button className="hh-back" onClick={() => navigate(-1)}>Back</button>
        </header>

        <section className="hh-hero">
          <div><div className="hh-kicker">NOTEZ / ADMINISTRATION</div><h1>Manage your<br />study groups.</h1><p>Control groups, members, security and workspace settings from one professional command center. Every value below is connected to your existing Firebase data.</p></div>
          <div className="hh-hero-orb" />
        </section>

        <section className="hh-stats">
          <div className="hh-stat"><small>TOTAL GROUPS</small><strong>{groups.length}</strong><em>Firebase realtime</em></div>
          <div className="hh-stat"><small>LIVE MEMBERS</small><strong>{liveTotal}</strong><em>Last-seen presence</em></div>
          <div className="hh-stat"><small>TOTAL MEMBERS</small><strong>{totalMembers}</strong><em>All your groups</em></div>
          <div className="hh-stat"><small>ACTIVE GROUPS</small><strong>{activeGroups}</strong><em>Members online</em></div>
        </section>

        <section className="hh-section">
          <div className="hh-section-head"><div><div className="hh-kicker">REALTIME DIRECTORY</div><h2>MY GROUPS</h2></div><input className="hh-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your groups..." /></div>
          {filteredGroups.length === 0 ? <div className="hh-empty"><strong>{groups.length ? "No matching groups" : "No groups found"}</strong>{groups.length ? "Try another search." : "Groups created by this host will appear here automatically."}</div> : <div className="hh-grid">
            {filteredGroups.map((group) => {
              const stat = memberStats[group.id] || {};
              return <article className="hh-card" key={group.id}>
                <div className="hh-cover">{group.groupPhoto ? <img src={group.groupPhoto} alt="" /> : <div style={{height:"100%",display:"grid",placeItems:"center",color:"#5cffaa",fontSize:38,fontWeight:900}}>{initials(group.groupName || "Group")}</div>}<div className="hh-status">{group.isPrivate ? "PRIVATE" : "PUBLIC"}</div></div>
                <div className="hh-card-body"><div className="hh-card-title"><h3>{group.groupName || "Untitled Group"}</h3></div><p>{group.groupDescription || "No group description added."}</p>
                  <div className="hh-meta"><div><span>MEMBERS</span><b>{stat.total ?? group.memberCount ?? "—"} / {group.maxMembers ?? "—"}</b></div><div><span>LIVE NOW</span><b className="hh-live-text">● {stat.live ?? 0}</b></div><div><span>CREATED</span><b>{formatDate(group.createdAt)}</b></div><div><span>MESSAGES</span><b>{messageCounts[group.id] ?? "—"}</b></div></div>
                  <div className="hh-actions"><button className="hh-btn primary" onClick={() => openGroup(group)}>OPEN GROUP</button><button className="hh-btn" onClick={() => openEdit(group)}>EDIT GROUP</button><button className="hh-btn" onClick={() => openSecurity(group)}>SECURITY</button><button className="hh-btn danger" onClick={() => { setSelectedGroup(group); setModal("delete"); }}>DELETE</button></div>
                </div>
              </article>;
            })}
          </div>}
        </section>
      </div>

      {modal === "edit" && selectedGroup && <div className="hh-overlay" onMouseDown={() => !saving && setModal(null)}><div className="hh-modal" onMouseDown={(e) => e.stopPropagation()}><div className="hh-modal-head"><h3>EDIT GROUP · {selectedGroup.groupName}</h3><button className="hh-x" onClick={() => setModal(null)}>×</button></div><div className="hh-modal-body"><div className="hh-form"><div className="hh-row"><div className="hh-field"><label>GROUP NAME</label><input value={editForm.groupName} onChange={(e) => setEditForm((p) => ({ ...p, groupName: e.target.value }))} /></div><div className="hh-field"><label>MAXIMUM MEMBERS</label><input type="number" min="2" max="100" value={editForm.maxMembers} onChange={(e) => setEditForm((p) => ({ ...p, maxMembers: e.target.value }))} /></div></div><div className="hh-field"><label>GROUP DESCRIPTION</label><textarea value={editForm.groupDescription} onChange={(e) => setEditForm((p) => ({ ...p, groupDescription: e.target.value }))} /></div><div className="hh-field"><label>GROUP PHOTO URL</label><input value={editForm.groupPhoto} onChange={(e) => setEditForm((p) => ({ ...p, groupPhoto: e.target.value }))} placeholder="Existing image URL" /></div><div className="hh-field"><label>VISIBILITY</label><select value={editForm.isPrivate ? "private" : "public"} onChange={(e) => setEditForm((p) => ({ ...p, isPrivate: e.target.value === "private" }))}><option value="public">Public</option><option value="private">Private</option></select></div></div></div><div className="hh-modal-foot"><button className="hh-btn" disabled={saving} onClick={() => setModal(null)}>CANCEL</button><button className="hh-btn primary" disabled={saving} onClick={saveGroup}>{saving ? "SAVING..." : "SAVE CHANGES"}</button></div></div></div>}

      {modal === "security" && selectedGroup && <div className="hh-overlay" onMouseDown={() => !saving && setModal(null)}><div className="hh-modal" onMouseDown={(e) => e.stopPropagation()}><div className="hh-modal-head"><h3>SECURITY · {selectedGroup.groupName}</h3><button className="hh-x" onClick={() => setModal(null)}>×</button></div><div className="hh-modal-body"><div className="hh-security"><div className="hh-security-block"><h4>GROUP PASSWORD</h4>{renderPasswordField("CURRENT PASSWORD", securityForm.currentGroupPassword, (v) => setSecurityForm((p) => ({ ...p, currentGroupPassword: v })), "gc")}{renderPasswordField("NEW PASSWORD", securityForm.newGroupPassword, (v) => setSecurityForm((p) => ({ ...p, newGroupPassword: v })), "gn")}{renderPasswordField("CONFIRM NEW PASSWORD", securityForm.confirmGroupPassword, (v) => setSecurityForm((p) => ({ ...p, confirmGroupPassword: v })), "gx")}<button className="hh-btn primary" disabled={saving} onClick={() => updatePassword("group")}>{saving ? "SAVING..." : "UPDATE GROUP PASSWORD"}</button></div><div className="hh-security-block"><h4>HOST SECURITY</h4>{renderPasswordField("CURRENT HOST PASSWORD", securityForm.currentHostPassword, (v) => setSecurityForm((p) => ({ ...p, currentHostPassword: v })), "hc")}{renderPasswordField("NEW HOST PASSWORD", securityForm.newHostPassword, (v) => setSecurityForm((p) => ({ ...p, newHostPassword: v })), "hn")}{renderPasswordField("CONFIRM NEW HOST PASSWORD", securityForm.confirmHostPassword, (v) => setSecurityForm((p) => ({ ...p, confirmHostPassword: v })), "hx")}<button className="hh-btn primary" disabled={saving} onClick={() => updatePassword("host")}>{saving ? "SAVING..." : "UPDATE HOST PASSWORD"}</button></div></div></div><div className="hh-modal-foot"><button className="hh-btn" onClick={() => setModal(null)}>CLOSE</button></div></div></div>}

      {modal === "members" && selectedGroup && <div className="hh-overlay" onMouseDown={() => setModal(null)}><div className="hh-modal" onMouseDown={(e) => e.stopPropagation()}><div className="hh-modal-head"><h3>MEMBERS · {selectedGroup.groupName}</h3><button className="hh-x" onClick={() => setModal(null)}>×</button></div><div className="hh-modal-body"><div className="hh-member-list">{(membersByGroup[selectedGroup.id] || []).map((member) => { const last = member.lastSeenAt?.toMillis?.() || 0; const online = member.isOnline === true && last > Date.now() - 70000; return <div className="hh-member" key={member.id}>{member.photoURL ? <img src={member.photoURL} alt="" /> : <div className="hh-member-avatar">{initials(member.name || member.displayName || "U")}</div>}<div className="hh-member-info"><b>{member.name || member.displayName || "User"}{member.role === "host" ? " · HOST" : ""}</b><span>{member.email || "No email"} · {online ? <span className="hh-online">● online</span> : "offline"}</span></div></div>; })}</div></div><div className="hh-modal-foot"><button className="hh-btn" onClick={() => setModal(null)}>CLOSE</button></div></div></div>}

      {modal === "delete" && selectedGroup && <div className="hh-overlay" onMouseDown={() => !deleting && setModal(null)}><div className="hh-modal hh-confirm" onMouseDown={(e) => e.stopPropagation()}><div className="hh-modal-head"><h3>DELETE GROUP?</h3><button className="hh-x" onClick={() => setModal(null)}>×</button></div><div className="hh-modal-body"><p>Are you sure you want to permanently delete <strong>{selectedGroup.groupName}</strong>? This removes the group document and its known group-owned subcollection data. This action cannot be undone.</p></div><div className="hh-modal-foot"><button className="hh-btn" disabled={deleting} onClick={() => setModal(null)}>CANCEL</button><button className="hh-btn danger" disabled={deleting} onClick={deleteGroup}>{deleting ? "DELETING..." : "DELETE GROUP"}</button></div></div></div>}

      {toast && <div className={`hh-toast ${toast.type === "error" ? "error" : ""}`}>{toast.type === "error" ? "✕ " : "✓ "}{toast.message}</div>}
    </div>
  );
}
