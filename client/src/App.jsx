import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './index.css';

// ⚠️ Cập nhật lại link API của bạn
const API_URL = 'http://localhost:5000/api';
// const API_URL = 'https://lms-backend-xyz.onrender.com/api'; 

const CLOUD_NAME = "demo"; 
const UPLOAD_PRESET = "unsigned_preset"; 

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('lms_user')));
  const [activePage, setActivePage] = useState('dashboard'); // dashboard | stats | admin_...

  const handleLogin = (u) => { localStorage.setItem('lms_user', JSON.stringify(u)); setUser(u); };
  const handleLogout = () => { localStorage.removeItem('lms_user'); setUser(null); setActivePage('dashboard'); };

  if (!user) return <AuthPage onLogin={handleLogin} />;

  return (
    <div className="layout-wrapper">
      <Sidebar user={user} activePage={activePage} setActivePage={setActivePage} onLogout={handleLogout} />
      <main className="main-content">
        <Header user={user} />
        
        {/* LOGIC ĐIỀU HƯỚNG MỚI */}
        {activePage === 'dashboard' && (
             user.role === 'ADMIN' ? <AdminView user={user} /> : <ClassroomManager user={user} />
        )}
        
        {/* Giữ lại trang thống kê Global */}
        {activePage === 'stats' && <GlobalStats />}
        
        {/* Admin quản lý User */}
        {activePage === 'manage_users' && <AdminUserManage />}
      </main>
    </div>
  );
}

// =========================================================================
// 1. QUẢN LÝ LỚP HỌC (MÀN HÌNH CHÍNH CHO GV & HS)
// =========================================================================
function ClassroomManager({ user }) {
    const [selectedClass, setSelectedClass] = useState(null);
    const [classes, setClasses] = useState([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => { loadClasses(); }, []);
    const loadClasses = async () => {
        const res = await axios.get(`${API_URL}/my-classes?userId=${user._id}&role=${user.role}`);
        setClasses(res.data);
    };
    const createClass = async (name, desc) => {
        await axios.post(`${API_URL}/classes`, { name, description: desc, teacherId: user._id });
        setShowModal(false); loadClasses(); alert("Đã tạo lớp!");
    };
    const joinClass = async (code) => {
        try { await axios.post(`${API_URL}/classes/join`, { code, studentId: user._id }); setShowModal(false); loadClasses(); alert("Đã vào lớp!"); } 
        catch (e) { alert("Mã lớp sai!"); }
    };

    if (selectedClass) {
        return (
            <div>
                <button className="btn-upload" style={{width:'auto', marginBottom:15}} onClick={()=>setSelectedClass(null)}>⬅ Quay lại danh sách lớp</button>
                <ClassDetail user={user} classroom={selectedClass} />
            </div>
        );
    }

    return (
        <div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                <div className="section-title">🏫 Lớp học của tôi</div>
                <button className="btn-primary" style={{width:'auto'}} onClick={()=>setShowModal(true)}>
                    {user.role === 'TEACHER' ? '+ Tạo lớp mới' : '+ Tham gia lớp'}
                </button>
            </div>
            <div className="card-grid">
                {classes.map(cls => (
                    <div key={cls._id} className="course-card" onClick={()=>setSelectedClass(cls)} style={{cursor:'pointer', borderLeft:'4px solid var(--primary)'}}>
                        <h3>{cls.name}</h3>
                        <p style={{fontSize:12, color:'gray'}}>{cls.description}</p>
                        {user.role === 'TEACHER' && <div className="tag tag-green">Code: {cls.code}</div>}
                        {user.role === 'STUDENT' && <div style={{fontSize:11, marginTop:5}}>GV: {cls.teacherId?.fullName}</div>}
                    </div>
                ))}
            </div>
            {/* Modal Tạo/Join */}
            {showModal && (
                <div style={{position:'fixed', top:0, left:0, bottom:0, right:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:9999}}>
                    <div className="auth-form-box" style={{background:'white', width:350}}>
                        <h3>{user.role === 'TEACHER' ? 'Tạo lớp mới' : 'Nhập mã lớp'}</h3>
                        {user.role === 'TEACHER' ? (
                            <>
                                <input id="cname" className="form-input" placeholder="Tên lớp" />
                                <input id="cdesc" className="form-input" placeholder="Mô tả" />
                                <button className="btn-primary" onClick={()=>createClass(document.getElementById('cname').value, document.getElementById('cdesc').value)}>Tạo</button>
                            </>
                        ) : (
                            <>
                                <input id="jcode" className="form-input" placeholder="Mã lớp (6 ký tự)" />
                                <button className="btn-primary" onClick={()=>joinClass(document.getElementById('jcode').value)}>Tham gia</button>
                            </>
                        )}
                        <button className="btn-upload" style={{marginTop:10, color:'red'}} onClick={()=>setShowModal(false)}>Hủy</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// 2. CHI TIẾT 1 LỚP HỌC (Kết hợp tính năng cũ vào đây)
function ClassDetail({ user, classroom }) {
    const [tab, setTab] = useState('stream'); 
    const [anns, setAnns] = useState([]);
    const [asms, setAsms] = useState([]);
    
    // State tạo mới
    const [newAnn, setNewAnn] = useState("");
    const [newAsm, setNewAsm] = useState({ title: '', desc: '' });

    useEffect(() => { loadData(); }, [classroom]);
    const loadData = async () => {
        const a = await axios.get(`${API_URL}/classes/${classroom._id}/announcements`); setAnns(a.data);
        const b = await axios.get(`${API_URL}/classes/${classroom._id}/assignments`); setAsms(b.data);
    };

    const postAnn = async () => { await axios.post(`${API_URL}/announcements`, { classId: classroom._id, teacherId: user._id, content: newAnn }); setNewAnn(""); loadData(); };
    const postAsm = async () => { await axios.post(`${API_URL}/assignments`, { classId: classroom._id, ...newAsm, description: newAsm.desc }); setNewAsm({title:'', desc:''}); loadData(); alert("Đã giao bài!"); };

    return (
        <div>
            <div className="welcome-banner" style={{background:'#e0e7ff', borderColor:'#6366f1'}}>
                <h1 style={{color:'#4338ca'}}>{classroom.name}</h1>
                <p>Mã lớp: <b>{classroom.code}</b> | {classroom.description}</p>
            </div>
            <div className="auth-tabs" style={{marginBottom:20}}>
                <div className={`auth-tab ${tab==='stream'?'active':''}`} onClick={()=>setTab('stream')}>📢 Bảng tin</div>
                <div className={`auth-tab ${tab==='work'?'active':''}`} onClick={()=>setTab('work')}>📝 Bài tập</div>
                {user.role === 'TEACHER' && <div className={`auth-tab ${tab==='grade'?'active':''}`} onClick={()=>setTab('grade')}>✅ Chấm điểm</div>}
            </div>

            {/* TAB BẢNG TIN */}
            {tab === 'stream' && (
                <div>
                    {user.role === 'TEACHER' && (
                        <div className="course-card">
                            <textarea className="form-input" rows={2} placeholder="Thông báo cho lớp..." value={newAnn} onChange={e=>setNewAnn(e.target.value)}></textarea>
                            <button className="btn-primary" style={{width:'auto'}} onClick={postAnn}>Đăng tin</button>
                        </div>
                    )}
                    {anns.map(a => (
                        <div key={a._id} className="course-card" style={{borderLeft:'4px solid orange'}}>
                            <div style={{fontWeight:700, fontSize:12}}>{a.teacherId?.fullName} <span style={{fontWeight:400, color:'gray'}}>{new Date(a.createdAt).toLocaleString()}</span></div>
                            <p style={{marginTop:5}}>{a.content}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB BÀI TẬP */}
            {tab === 'work' && (
                <div>
                    {user.role === 'TEACHER' && (
                        <div className="course-card">
                            <h4>Giao bài mới</h4>
                            <input className="form-input" placeholder="Tiêu đề" value={newAsm.title} onChange={e=>setNewAsm({...newAsm, title: e.target.value})} />
                            <textarea className="form-input" placeholder="Nội dung" value={newAsm.desc} onChange={e=>setNewAsm({...newAsm, desc: e.target.value})}></textarea>
                            <button className="btn-primary" onClick={postAsm}>Giao bài</button>
                        </div>
                    )}
                    <div className="card-grid">
                        {asms.map(asm => (
                            <div key={asm._id} className="course-card">
                                <h3>{asm.title}</h3>
                                <p style={{fontSize:12, color:'gray'}}>{asm.description}</p>
                                {user.role === 'STUDENT' && <StudentSubmitArea user={user} assignment={asm} classId={classroom._id} />}
                                {user.role === 'TEACHER' && <button className="btn-upload" style={{color:'red'}} onClick={async()=>{if(window.confirm("Xóa bài?")){await axios.delete(`${API_URL}/assignments/${asm._id}`); loadData();}}}>Xóa bài</button>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB CHẤM ĐIỂM (Của Teacher cũ) */}
            {tab === 'grade' && <TeacherGrading classId={classroom._id} />}
        </div>
    );
}

// Component Chấm điểm trong lớp
function TeacherGrading({ classId }) {
    const [subs, setSubs] = useState([]);
    useEffect(() => { axios.get(`${API_URL}/classes/${classId}/submissions`).then(r => setSubs(r.data)); }, [classId]);
    const saveGrade = async (id, g, f) => { await axios.put(`${API_URL}/submissions/${id}`, { grade: g, feedback: f }); alert("Đã chấm!"); };

    return (
        <div className="card-grid">
            {subs.length === 0 && <p>Chưa có bài nộp nào.</p>}
            {subs.map(s => (
                <div key={s._id} className="course-card">
                    <div style={{fontWeight:700}}>👤 {s.studentName}</div>
                    <div style={{fontSize:11, color:'gray'}}>Bài: {s.assignmentId?.title}</div>
                    <a href={s.imageUrl} target="_blank" rel="noreferrer"><img src={s.imageUrl} style={{width:'100%', height:80, objectFit:'cover', marginTop:5}}/></a>
                    <input id={`g-${s._id}`} className="form-input" type="number" defaultValue={s.grade} placeholder="Điểm" />
                    <input id={`f-${s._id}`} className="form-input" defaultValue={s.feedback} placeholder="Nhận xét" />
                    <button className="btn-primary" onClick={()=>saveGrade(s._id, document.getElementById(`g-${s._id}`).value, document.getElementById(`f-${s._id}`).value)}>Lưu</button>
                </div>
            ))}
        </div>
    );
}

// Component Nộp bài của HS
function StudentSubmitArea({ user, assignment, classId }) {
    const [sub, setSub] = useState(null);
    useEffect(() => { axios.get(`${API_URL}/my-submissions?studentId=${user._id}&classId=${classId}`).then(r => setSub(r.data.find(s => s.assignmentId?._id === assignment._id))); }, []);
    
    const upload = async (file) => {
        const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET);
        try {
            const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, fd);
            await axios.post(`${API_URL}/submissions`, { classId, assignmentId: assignment._id, studentId: user._id, studentName: user.fullName, imageUrl: res.data.secure_url });
            alert("Nộp xong!"); window.location.reload();
        } catch(e) { alert("Lỗi ảnh"); }
    };

    if (sub) return <div style={{background:'#f0fdf4', padding:5, borderRadius:5, marginTop:5, fontSize:12, color:'green'}}>✅ Đã nộp: {sub.grade ? `Điểm: ${sub.grade}` : "Chờ chấm"}</div>;
    return <label className="btn-upload" style={{marginTop:10}}>+ Nộp bài <input type="file" hidden onChange={e=>upload(e.target.files[0])} /></label>;
}

// =========================================================================
// 3. ADMIN VIEW (Giữ nguyên tính năng cũ: Tạo GV, Đổi pass)
// =========================================================================
function AdminView({ user }) {
    return (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
            <AdminUserManage />
            <div className="course-card">
                <h3>🛡️ Admin Profile</h3>
                <p>Xin chào, {user.fullName}</p>
                <button className="btn-primary" onClick={()=>handleResetPass(user._id, "bạn", true)}>Đổi mật khẩu của tôi</button>
            </div>
        </div>
    );
}

// Component Quản lý User dùng chung cho Admin (và GV nếu muốn xem list HS)
function AdminUserManage() {
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({ username: '', password: '', fullName: '' });

    useEffect(() => { load(); }, []);
    const load = async () => { const r = await axios.get(`${API_URL}/users`); setUsers(r.data); };
    
    const createTeacher = async () => {
        try { await axios.post(`${API_URL}/admin/create-teacher`, form); alert("Tạo GV thành công!"); load(); } catch(e){ alert("Lỗi"); }
    };
    const delUser = async (id) => { if(window.confirm("Xóa?")) { await axios.delete(`${API_URL}/users/${id}`); load(); } };
    const resetPass = async (id, name) => {
        const p = prompt(`Pass mới cho ${name}:`);
        if(p) { await axios.put(`${API_URL}/users/${id}/reset-password`, { newPassword: p }); alert("Xong!"); }
    };

    return (
        <div>
            <div className="course-card">
                <h3>➕ Tạo Giáo Viên Mới</h3>
                <input className="form-input" placeholder="User" onChange={e=>setForm({...form, username: e.target.value})}/>
                <input className="form-input" placeholder="Pass" onChange={e=>setForm({...form, password: e.target.value})}/>
                <input className="form-input" placeholder="Tên hiển thị" onChange={e=>setForm({...form, fullName: e.target.value})}/>
                <button className="btn-primary" onClick={createTeacher}>Tạo tài khoản</button>
            </div>
            <div className="course-card" style={{marginTop:20}}>
                <h3>Danh sách Users</h3>
                <table style={{width:'100%', fontSize:12}}>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:5}}><b>{u.fullName}</b> ({u.role})</td>
                                <td style={{padding:5}}>{u.username}</td>
                                <td style={{padding:5}}>
                                    <button style={{marginRight:5}} onClick={()=>resetPass(u._id, u.fullName)}>🔑 Pass</button>
                                    <button style={{color:'red'}} onClick={()=>delUser(u._id)}>🗑️ Xóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// =========================================================================
// 4. BẢNG XẾP HẠNG (GLOBAL STATS - Giữ lại tính năng cũ)
// =========================================================================
function GlobalStats() {
    const [subs, setSubs] = useState([]);
    useEffect(() => { axios.get(`${API_URL}/all-submissions`).then(r => setSubs(r.data)); }, []);

    const leaderboard = useMemo(() => {
        const stats = {};
        subs.forEach(s => {
            if(!s.studentId) return;
            const sid = s.studentId._id;
            if(!stats[sid]) stats[sid] = { name: s.studentId.fullName, total: 0, count: 0 };
            if(s.grade) { stats[sid].total += parseFloat(s.grade); stats[sid].count++; }
        });
        return Object.values(stats).map(s => ({...s, avg: s.count ? (s.total/s.count).toFixed(2) : 0})).sort((a,b) => b.avg - a.avg);
    }, [subs]);

    return (
        <div className="course-card">
            <h2 style={{color:'var(--primary)'}}>🏆 Bảng Xếp Hạng Tổng</h2>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead><tr style={{background:'#f8fafc', textAlign:'left'}}><th>Hạng</th><th>Tên</th><th>Bài làm</th><th>Điểm TB</th></tr></thead>
                <tbody>
                    {leaderboard.map((s,i) => (
                        <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                            <td style={{padding:8}}>{i===0?'🥇':i===1?'🥈':i+1}</td>
                            <td style={{fontWeight:600}}>{s.name}</td>
                            <td>{s.count}</td>
                            <td style={{fontWeight:700, color:'var(--primary)'}}>{s.avg}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// --- CÁC COMPONENT CƠ BẢN (SIDEBAR, HEADER, AUTH) ---
function Sidebar({ user, activePage, setActivePage, onLogout }) {
    return (
        <div className="sidebar-container">
            <div className="hamburger-trigger">☰ MENU</div>
            <div className="sidebar-panel">
                <div className="sidebar-content">
                    <h3>LMS PRO 🚀</h3>
                    <div className={`menu-item ${activePage==='dashboard'?'active':''}`} onClick={()=>setActivePage('dashboard')}>🏠 Lớp học</div>
                    {user.role !== 'ADMIN' && <div className={`menu-item ${activePage==='stats'?'active':''}`} onClick={()=>setActivePage('stats')}>🏆 Xếp hạng</div>}
                    {user.role === 'ADMIN' && <div className={`menu-item ${activePage==='manage_users'?'active':''}`} onClick={()=>setActivePage('manage_users')}>👥 Quản lý User</div>}
                    <div className="menu-item" style={{color:'red', marginTop:20}} onClick={onLogout}>🚪 Đăng xuất</div>
                </div>
            </div>
        </div>
    );
}

function Header({ user }) { return <header className="top-header" style={{justifyContent:'flex-end'}}><div className="user-profile">{user.fullName} ({user.role})</div></header>; }

function AuthPage({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({});
  const submit = async () => {
      try {
          const res = await axios.post(`${API_URL}${tab==='register'?'/register':'/login'}`, form);
          if(tab==='register') { alert("ĐK thành công!"); setTab('login'); } else onLogin(res.data);
      } catch(e) { alert("Lỗi đăng nhập/đăng ký"); }
  };
  return (
    <div className="auth-container"><div className="auth-form-box">
        <h2>{tab==='login'?'Đăng Nhập':'Đăng Ký Học Sinh'}</h2>
        <input className="form-input" placeholder="User" onChange={e=>setForm({...form, username: e.target.value})} />
        <input className="form-input" type="password" placeholder="Pass" onChange={e=>setForm({...form, password: e.target.value})} />
        {tab==='register' && <input className="form-input" placeholder="Full Name" onChange={e=>setForm({...form, fullName: e.target.value})} />}
        <button className="btn-primary" onClick={submit}>Xác nhận</button>
        <p style={{textAlign:'center', cursor:'pointer', marginTop:10}} onClick={()=>setTab(tab==='login'?'register':'login')}>{tab==='login'?'Chưa có nick? Đăng ký':'Quay lại'}</p>
    </div></div>
  );
}

export default App;