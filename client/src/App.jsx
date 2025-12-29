import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './index.css';

const API_URL = 'https://lms-backend-fmhz.onrender.com/api';
// ⚠️ THAY CỦA BẠN VÀO ĐÂY
const CLOUD_NAME = "ddytwonba"; 
const UPLOAD_PRESET = "ddytwonba"; 

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('lms_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [activePage, setActivePage] = useState('dashboard');

  const handleLogin = (userData) => {
    localStorage.setItem('lms_user', JSON.stringify(userData));
    setUser(userData);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('lms_user');
    setUser(null);
  };

  if (!user) return <AuthPage onLogin={handleLogin} />;

  return (
    <div className="layout-wrapper">
      <Sidebar user={user} activePage={activePage} setActivePage={setActivePage} onLogout={handleLogout} />
      <main className="main-content">
        <Header user={user} />
        {user.role === 'ADMIN' && <AdminView activePage={activePage} user={user} />}
        {user.role === 'TEACHER' && <TeacherView activePage={activePage} />}
        {user.role === 'STUDENT' && <StudentView user={user} activePage={activePage} />}
      </main>
    </div>
  );
}

// 1. AUTH PAGE
function AuthPage({ onLogin }) {
  const [activeTab, setActiveTab] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', fullName: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'register' ? '/register' : '/login';
      const res = await axios.post(`${API_URL}${endpoint}`, form);
      if (activeTab === 'register') { 
        alert("Đăng ký Học sinh thành công! Hãy đăng nhập."); setActiveTab('login'); 
      } else { onLogin(res.data); }
    } catch (err) { alert(err.response?.data?.message || "Lỗi"); } 
    finally { setLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="auth-left"><h2>LMS Pro</h2><p style={{fontSize: 11}}>Teacher Power Update</p></div>
      <div className="auth-right">
        <div className="auth-form-box">
          <div className="auth-tabs">
            <div className={`auth-tab ${activeTab==='login'?'active':''}`} onClick={()=>setActiveTab('login')}>Đăng Nhập</div>
            <div className={`auth-tab ${activeTab==='register'?'active':''}`} onClick={()=>setActiveTab('register')}>Đăng Ký</div>
          </div>
          <input className="form-input" placeholder="Tên đăng nhập" onChange={e => setForm({...form, username: e.target.value})} />
          <input className="form-input" type="password" placeholder="Mật khẩu" onChange={e => setForm({...form, password: e.target.value})} />
          {activeTab === 'register' && (
            <input className="form-input" placeholder="Họ và tên" onChange={e => setForm({...form, fullName: e.target.value})} />
          )}
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>Xác nhận</button>
          {activeTab === 'register' && <p style={{fontSize:10, color:'gray', marginTop:10}}>* Chỉ đăng ký tài khoản Học sinh.</p>}
        </div>
      </div>
    </div>
  );
}

// 2. SIDEBAR
function Sidebar({ user, activePage, setActivePage, onLogout }) {
    return (
        <div className="sidebar-container">
            <div className="hamburger-trigger">☰ <span style={{fontSize: 12, marginLeft: 10, fontWeight: 700}}>MENU</span></div>
            <div className="sidebar-panel">
                <div className="sidebar-content">
                    <div style={{color: '#6366f1', fontWeight: 800, marginBottom: 20, paddingLeft: 8}}>⚡ LMS PRO</div>
                    <div style={{flex: 1}}>
                        <div className={`menu-item ${activePage==='dashboard'?'active':''}`} onClick={()=>setActivePage('dashboard')}>
                            <span>🏠</span> Tổng quan
                        </div>
                        {user.role === 'STUDENT' && (
                            <div className={`menu-item ${activePage==='grades'?'active':''}`} onClick={()=>setActivePage('grades')}><span>🏆</span> Kết quả học tập</div>
                        )}
                        {user.role === 'TEACHER' && (
                            <>
                                <div className={`menu-item ${activePage==='stats'?'active':''}`} onClick={()=>setActivePage('stats')}><span>📊</span> Thống kê điểm</div>
                                <div className={`menu-item ${activePage==='students'?'active':''}`} onClick={()=>setActivePage('students')}><span>👥</span> Quản lý HS</div>
                            </>
                        )}
                         {user.role === 'ADMIN' && (
                            <div className={`menu-item ${activePage==='teachers'?'active':''}`} onClick={()=>setActivePage('teachers')}><span>👨‍🏫</span> Quản lý GV</div>
                        )}
                    </div>
                    <div className="menu-item" onClick={onLogout} style={{color: '#ef4444', marginTop: 20}}><span>🚪</span> Đăng xuất</div>
                </div>
            </div>
        </div>
    );
}

function Header({ user }) {
    return (
        <header className="top-header" style={{ justifyContent: 'flex-end' }}>
            <div className="user-profile">{user.fullName} ({user.role})<div className="avatar">{user.fullName[0]}</div></div>
        </header>
    );
}

// 3. ADMIN VIEW
function AdminView({ user }) { // Nhận thêm prop user
    const [teachers, setTeachers] = useState([]);
    const [form, setForm] = useState({ username: '', password: '', fullName: '' });

    useEffect(() => { loadTeachers(); }, []);

    const loadTeachers = async () => {
        const res = await axios.get(`${API_URL}/users?role=TEACHER`);
        setTeachers(res.data);
    };

    const handleCreate = async () => {
        if(!form.username || !form.password) return alert("Điền đủ thông tin");
        try {
            await axios.post(`${API_URL}/admin/create-teacher`, form);
            alert("Đã tạo Giáo viên!"); setForm({ username: '', password: '', fullName: '' }); loadTeachers();
        } catch(e) { alert("Lỗi tạo"); }
    };

    const handleDelete = async (id) => {
        if(window.confirm("Xóa giáo viên này?")) {
            await axios.delete(`${API_URL}/users/${id}`);
            loadTeachers();
        }
    };

    // --- HÀM ĐỔI MẬT KHẨU (Dùng chung) ---
    const handleResetPass = async (id, name, isSelf = false) => {
        const promptText = isSelf 
            ? "Nhập mật khẩu MỚI của bạn:" 
            : `Nhập mật khẩu mới cho GV ${name}:`;
            
        const newPass = prompt(promptText);
        
        if (newPass) {
            try {
                await axios.put(`${API_URL}/users/${id}/reset-password`, { newPassword: newPass });
                alert(isSelf ? "Đã đổi mật khẩu của bạn thành công!" : `Đã đổi mật khẩu của ${name} thành: ${newPass}`);
            } catch (e) { 
                alert("Lỗi khi đổi mật khẩu"); 
            }
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '65% 34%', gap: '1%' }}>
             {/* CỘT TRÁI: DANH SÁCH GIÁO VIÊN */}
             <div>
                <div className="section-title">Danh sách Giáo viên</div>
                <div className="course-card">
                    <table style={{width:'100%', fontSize:12, borderCollapse:'collapse'}}>
                        <thead>
                            <tr style={{textAlign:'left', background:'#f8fafc'}}>
                                <th style={{padding:8}}>Họ tên</th>
                                <th style={{padding:8}}>Username</th>
                                <th style={{padding:8}}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.map(t => (
                                <tr key={t._id} style={{borderBottom:'1px solid #eee'}}>
                                    <td style={{padding:8, fontWeight:600}}>{t.fullName}</td>
                                    <td style={{padding:8}}>{t.username}</td>
                                    <td style={{padding:8, display:'flex', gap:5}}>
                                        <button className="btn-upload" style={{color:'var(--primary)', borderColor:'var(--primary)'}} onClick={()=>handleResetPass(t._id, t.fullName)}>
                                            🔑 Đổi Pass
                                        </button>
                                        <button className="btn-upload" style={{color:'red'}} onClick={()=>handleDelete(t._id)}>
                                            🗑️ Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CỘT PHẢI: TẠO GV & ADMIN PROFILE */}
            <div>
                {/* Card tạo GV */}
                <div className="course-card">
                    <div className="section-title">➕ Cấp tài khoản GV</div>
                    <input className="form-input" placeholder="Tên đăng nhập" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} />
                    <input className="form-input" placeholder="Mật khẩu" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} />
                    <input className="form-input" placeholder="Họ và tên hiển thị" value={form.fullName} onChange={e=>setForm({...form, fullName: e.target.value})} />
                    <button className="btn-primary" onClick={handleCreate}>Tạo tài khoản</button>
                </div>

                {/* Card Admin tự quản lý mình */}
                <div className="course-card" style={{marginTop: 15, background:'#f0fdf4', borderColor:'#bbf7d0'}}>
                    <div className="section-title" style={{color:'#166534'}}>🛡️ Tài khoản Admin</div>
                    <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
                        <div className="avatar" style={{background:'#166534'}}>{user.fullName[0]}</div>
                        <div style={{fontSize:12}}>
                            <b>{user.fullName}</b><br/>
                            <span style={{color:'gray'}}>{user.username}</span>
                        </div>
                    </div>
                    <button 
                        className="btn-upload" 
                        style={{width:'100%', background:'white', color:'#166534', borderColor:'#166534'}}
                        onClick={() => handleResetPass(user._id, user.fullName, true)}
                    >
                        🔑 Đổi mật khẩu của tôi
                    </button>
                </div>
            </div>
        </div>
    );
}

// 4. TEACHER VIEW (CẬP NHẬT ĐỔI PASS)
function TeacherView({ activePage }) {
    const [assignments, setAssignments] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [allSubmissions, setAllSubmissions] = useState([]); 
    const [students, setStudents] = useState([]); 
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [selectedAsmId, setSelectedAsmId] = useState(null);

    useEffect(() => { 
        loadAssignments(); 
        if (activePage === 'stats') loadAllStats(); 
        if (activePage === 'students') loadStudents(); 
    }, [activePage]);

    const loadAssignments = async () => { const res = await axios.get(`${API_URL}/assignments`); setAssignments(res.data); };
    const loadAllStats = async () => { const res = await axios.get(`${API_URL}/all-submissions`); setAllSubmissions(res.data); };
    const loadStudents = async () => { const res = await axios.get(`${API_URL}/users?role=STUDENT`); setStudents(res.data); };

    const handlePost = async () => {
        if (!title) return alert("Thiếu tiêu đề!");
        await axios.post(`${API_URL}/assignments`, { title, description: desc });
        alert("Đã đăng!"); setTitle(""); setDesc(""); loadAssignments();
    };

    const handleDeleteAsm = async (id) => { if (window.confirm("Xóa bài này?")) { await axios.delete(`${API_URL}/assignments/${id}`); loadAssignments(); setSelectedAsmId(null); } };
    const handleDeleteStudent = async (id) => { if (window.confirm("Xóa học sinh này?")) { await axios.delete(`${API_URL}/users/${id}`); loadStudents(); } }
    
    // --- HÀM ĐỔI MẬT KHẨU HỌC SINH ---
    const handleResetPass = async (id, name) => {
        const newPass = prompt(`Nhập mật khẩu mới cho học sinh ${name}:`, "123456");
        if (newPass) {
            try {
                await axios.put(`${API_URL}/users/${id}/reset-password`, { newPassword: newPass });
                alert(`Đã đổi mật khẩu của ${name} thành: ${newPass}`);
            } catch (e) { alert("Lỗi khi đổi mật khẩu"); }
        }
    };

    const viewSubmissions = async (id) => { setSelectedAsmId(id); const res = await axios.get(`${API_URL}/assignments/${id}/submissions`); setSubmissions(res.data); };
    const gradeSubmission = async (subId, grade, feedback) => { await axios.put(`${API_URL}/submissions/${subId}`, { grade, feedback }); alert("Đã chấm!"); viewSubmissions(selectedAsmId); };

    const leaderboard = useMemo(() => {
        if (!allSubmissions.length) return [];
        const stats = {}; 
        allSubmissions.forEach(sub => {
            if (!sub.studentId) return; 
            const sId = sub.studentId._id;
            if (!stats[sId]) stats[sId] = { studentId: sId, name: sub.studentId.fullName, totalScore: 0, gradedCount: 0 };
            if (sub.grade !== null && !isNaN(parseFloat(sub.grade))) { stats[sId].totalScore += parseFloat(sub.grade); stats[sId].gradedCount += 1; }
        });
        return Object.values(stats).map(s => ({ ...s, average: s.gradedCount > 0 ? (s.totalScore / s.gradedCount).toFixed(2) : "0.00" }))
            .sort((a, b) => b.gradedCount - a.gradedCount || parseFloat(b.average) - parseFloat(a.average));
    }, [allSubmissions]);

    // RENDER: QUẢN LÝ HỌC SINH (CÓ NÚT ĐỔI PASS)
    if (activePage === 'students') {
        return (
            <div>
                 <div className="welcome-banner" style={{background:'#fef3c7', borderColor:'#fde68a', borderLeftColor:'#d97706'}}>
                    <h1 style={{color:'#b45309'}}>👥 Quản Lý Học Sinh</h1>
                    <p style={{color:'#92400e'}}>Tổng số học sinh: {students.length}</p>
                </div>
                <div className="course-card">
                    <table style={{width:'100%', fontSize:12, borderCollapse:'collapse'}}>
                        <thead><tr style={{textAlign:'left', background:'#f8fafc'}}><th style={{padding:8}}>Họ tên</th><th style={{padding:8}}>Username</th><th style={{padding:8}}>Ngày tạo</th><th style={{padding:8}}>Hành động</th></tr></thead>
                        <tbody>
                            {students.map(s => (
                                <tr key={s._id} style={{borderBottom:'1px solid #eee'}}>
                                    <td style={{padding:8, fontWeight:600}}>{s.fullName}</td>
                                    <td style={{padding:8}}>{s.username}</td>
                                    <td style={{padding:8, color:'gray'}}>{new Date(s.createdAt).toLocaleDateString()}</td>
                                    <td style={{padding:8, display:'flex', gap:5}}>
                                        <button className="btn-upload" style={{color:'var(--primary)', borderColor:'var(--primary)'}} onClick={()=>handleResetPass(s._id, s.fullName)}>🔑 Đổi Pass</button>
                                        <button className="btn-upload" style={{color:'red'}} onClick={()=>handleDeleteStudent(s._id)}>🗑️ Xóa</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    if (activePage === 'stats') {
        return (
            <div>
                 <div className="welcome-banner" style={{background:'#e0e7ff', borderColor:'#c7d2fe', borderLeftColor:'#6366f1'}}>
                    <h1 style={{color:'#4338ca'}}>📊 Bảng Xếp Hạng</h1>
                </div>
                <div className="course-card" style={{marginBottom:20}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize: 12}}>
                        <thead><tr style={{textAlign:'left', background:'#f8fafc'}}><th style={{padding:8}}>Hạng</th><th style={{padding:8}}>Tên</th><th style={{padding:8}}>Số bài chấm</th><th style={{padding:8}}>Điểm TB</th></tr></thead>
                        <tbody>{leaderboard.map((s, i) => (<tr key={s.studentId} style={{borderBottom:'1px solid #eee'}}><td style={{padding:8}}>{i+1}</td><td style={{padding:8, fontWeight:600}}>{s.name}</td><td style={{padding:8}}>{s.gradedCount}</td><td style={{padding:8, fontWeight:700, color:'var(--primary)'}}>{s.average}</td></tr>))}</tbody>
                    </table>
                </div>
            </div>
        )
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '70% 29%', gap: '1%' }}>
            <div>
                {selectedAsmId ? (
                    <div>
                        <button className="btn-upload" style={{width:'auto', marginBottom:10}} onClick={()=>setSelectedAsmId(null)}>⬅ Quay lại</button>
                        <div className="card-grid">
                            {submissions.map(sub => (
                                <div key={sub._id} className="course-card">
                                    <div style={{fontSize:12, fontWeight:700, marginBottom:5}}>👤 {sub.studentName}</div>
                                    <a href={sub.imageUrl} target="_blank" rel="noreferrer"><img src={sub.imageUrl} style={{width:'100%', height:'80px', objectFit:'cover'}}/></a>
                                    <input className="form-input" id={`g-${sub._id}`} defaultValue={sub.grade} placeholder="Điểm" type="number" />
                                    <button className="btn-primary" onClick={() => gradeSubmission(sub._id, document.getElementById(`g-${sub._id}`).value, "Đã chấm")}>Lưu</button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="card-grid">
                        {assignments.map(asm => (
                            <div key={asm._id} className="course-card">
                                <h3 style={{margin:0, fontSize:13}}>{asm.title}</h3>
                                <p style={{fontSize:11, color:'#64748b'}}>{asm.description}</p>
                                <div style={{display:'flex', gap:5, marginTop:8}}>
                                    <button className="btn-upload" onClick={() => viewSubmissions(asm._id)}>👁️ Xem</button>
                                    <button className="btn-upload" style={{color:'red'}} onClick={() => handleDeleteAsm(asm._id)}>🗑️ Xóa</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div>
                <div className="course-card">
                    <div className="section-title">➕ Tạo bài</div>
                    <input className="form-input" placeholder="Tiêu đề" value={title} onChange={e => setTitle(e.target.value)} />
                    <textarea className="form-input" placeholder="Mô tả" rows={3} value={desc} onChange={e => setDesc(e.target.value)}></textarea>
                    <button className="btn-primary" onClick={handlePost}>Đăng</button>
                </div>
            </div>
        </div>
    );
}

// 5. STUDENT VIEW
function StudentView({ user, activePage }) {
  const [assignments, setAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  useEffect(() => { loadData(); }, []);
  const loadData = async () => { const asmRes = await axios.get(`${API_URL}/assignments`); setAssignments(asmRes.data); const subRes = await axios.get(`${API_URL}/my-submissions?studentId=${user._id}`); setMySubmissions(subRes.data); }
  const handleUpload = async (file, assignmentId) => {
    try {
        const formData = new FormData(); formData.append("file", file); formData.append("upload_preset", UPLOAD_PRESET); 
        const cloudRes = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, formData);
        await axios.post(`${API_URL}/submissions`, { assignmentId, studentId: user._id, studentName: user.fullName, imageUrl: cloudRes.data.secure_url });
        alert("Thành công!"); loadData();
    } catch(e) { alert("Lỗi upload"); }
  };
  const gradedSubs = mySubmissions.filter(s => s.grade !== null);
  const avg = gradedSubs.length ? (gradedSubs.reduce((a,c)=>a+c.grade,0)/gradedSubs.length).toFixed(1) : 0;

  if (activePage === 'grades') return (<div><div className="welcome-banner" style={{background:'#f0fdf4'}}><h1 style={{color:'#166534'}}>🏆 Điểm TB: {avg}</h1></div><div className="course-card"><table style={{width:'100%', fontSize:12}}><tbody>{mySubmissions.map(s=>(<tr key={s._id}><td>{s.assignmentId?.title}</td><td>{s.grade??'--'}</td></tr>))}</tbody></table></div></div>);

  return (<div style={{display:'grid', gridTemplateColumns:'75% 24%', gap:'1%'}}><div><div className="card-grid">{assignments.map(asm=>{const sub=mySubmissions.find(s=>s.assignmentId?._id===asm._id);return(<div key={asm._id} className="course-card"><h3>{asm.title}</h3><p style={{fontSize:11, color:'gray'}}>{asm.description}</p>{!sub&&<label className="btn-upload">+ Nộp<input type="file" hidden onChange={e=>handleUpload(e.target.files[0], asm._id)}/></label>}</div>)})}</div></div><div><div className="course-card" style={{textAlign:'center'}}><div style={{fontSize:30, fontWeight:700, color:'var(--primary)'}}>{avg}</div><div>Điểm TB</div></div></div></div>);
}

export default App;