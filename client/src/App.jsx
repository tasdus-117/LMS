import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './index.css';

// ⚠️ UPDATE LINK SERVER CỦA BẠN
const API_URL = 'https://lms-backend-fmhz.onrender.com/api'; 
const CLOUD_NAME = "ddytwonba"; 
const UPLOAD_PRESET = "ddytwonba"; 

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('lms_user')));
  const [activePage, setActivePage] = useState('dashboard');

  const handleLogin = (u) => { localStorage.setItem('lms_user', JSON.stringify(u)); setUser(u); setActivePage('dashboard'); };
  const handleLogout = () => { localStorage.removeItem('lms_user'); setUser(null); };

  if (!user) return <AuthPage onLogin={handleLogin} />;

  return (
    <div className="layout-wrapper">
      <Sidebar user={user} activePage={activePage} setActivePage={setActivePage} onLogout={handleLogout} />
      <main className="main-content">
        <Header user={user} />
        {user.role === 'ADMIN' && <AdminView activePage={activePage} user={user} />}
        {user.role === 'TEACHER' && <TeacherView user={user} activePage={activePage} />}
        {user.role === 'STUDENT' && <StudentView user={user} activePage={activePage} />}
      </main>
    </div>
  );
}

// 1. AUTH PAGE & SIDEBAR & HEADER (GIỮ NGUYÊN CODE CỦA BẠN - MÌNH RÚT GỌN ĐỂ DỄ NHÌN)
function AuthPage({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({});
  const submit = async () => {
    try {
        const res = await axios.post(`${API_URL}${tab==='register'?'/register':'/login'}`, form);
        if(tab==='register'){alert("ĐK thành công");setTab('login')}else onLogin(res.data);
    } catch(e){alert("Lỗi")}
  };
  return (<div className="auth-container"><div className="auth-form-box"><h2>LMS Pro</h2><input className="form-input" placeholder="User" onChange={e=>setForm({...form,username:e.target.value})}/><input className="form-input" type="password" placeholder="Pass" onChange={e=>setForm({...form,password:e.target.value})}/>{tab==='register'&&<input className="form-input" placeholder="Name" onChange={e=>setForm({...form,fullName:e.target.value})}/>}<button className="btn-primary" onClick={submit}>OK</button><p onClick={()=>setTab(tab==='login'?'register':'login')} style={{cursor:'pointer',textAlign:'center',marginTop:10}}>{tab==='login'?'Đăng ký':'Quay lại'}</p></div></div>);
}
function Sidebar({ user, activePage, setActivePage, onLogout }) {
    const [isOpen, setIsOpen] = useState(false); // Trạng thái mở/đóng menu

    // Hàm chọn menu xong thì tự đóng lại cho gọn
    const handleSelect = (page) => {
        setActivePage(page);
        setIsOpen(false);
    };

    return (
        <>
            {/* Nút Mở Menu (Luôn hiển thị góc trái) */}
            <div 
                className="hamburger-trigger" 
                onClick={() => setIsOpen(true)}
                style={{cursor: 'pointer', zIndex: 1000}}
            >
                ☰ MENU
            </div>

            {/* Lớp phủ mờ (Bấm ra ngoài để đóng) */}
            {isOpen && (
                <div 
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 2000
                    }}
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Panel Menu Chính */}
            <div className={`sidebar-panel ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-content">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
                        <h3 style={{margin:0, color:'#4f46e5'}}>LMS PRO 🚀</h3>
                        <button 
                            onClick={() => setIsOpen(false)}
                            style={{background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#64748b'}}
                        >
                            ✖
                        </button>
                    </div>

                    <div className="user-info-box" style={{padding:10, background:'#f1f5f9', borderRadius:8, marginBottom:20}}>
                        <div style={{fontWeight:700}}>{user.fullName}</div>
                        <div style={{fontSize:11, color:'gray'}}>{user.role}</div>
                    </div>

                    {/* MENU ITEMS */}
                    <div className={`menu-item ${activePage==='dashboard'?'active':''}`} onClick={()=>handleSelect('dashboard')}>
                        🏠 Lớp học
                    </div>

                    {/* Student xem điểm */}
                    {user.role === 'STUDENT' && (
                        <div className={`menu-item ${activePage==='grades'?'active':''}`} onClick={()=>handleSelect('grades')}>
                            📝 Kết quả học tập
                        </div>
                    )}

                    {/* Teacher xem thống kê & quản lý HS */}
                    {user.role === 'TEACHER' && (
                        <>
                            <div className={`menu-item ${activePage==='stats'?'active':''}`} onClick={()=>handleSelect('stats')}>
                                📊 Bảng xếp hạng
                            </div>
                            <div className={`menu-item ${activePage==='students'?'active':''}`} onClick={()=>handleSelect('students')}>
                                👥 Quản lý Học sinh
                            </div>
                        </>
                    )}

                    {/* Admin xem quản lý GV */}
                    {user.role === 'ADMIN' && (
                        <div className={`menu-item ${activePage==='teachers'?'active':''}`} onClick={()=>handleSelect('teachers')}>
                            👨‍🏫 Quản lý Giáo viên
                        </div>
                    )}

                    <div className="menu-item" style={{color:'red', marginTop:20, borderTop:'1px solid #eee', paddingTop:10}} onClick={onLogout}>
                        🚪 Đăng xuất
                    </div>
                </div>
            </div>
        </>
    );
}
function Header({user}){return <header className="top-header" style={{justifyContent:'flex-end'}}><div className="user-profile">{user.fullName} ({user.role})</div></header>}

// 2. ADMIN VIEW (GIỮ NGUYÊN HOẶC DÙNG CODE BẠN ĐÃ CÓ)
function AdminView({ user, activePage }) {
    if(activePage === 'users') return <TeacherView user={user} activePage="users" />; // Admin dùng ké view quản lý user của Teacher
    return <div>Chọn menu Quản lý User để thêm GV</div>;
}

// ============================================================================
// 3. TEACHER VIEW (NÂNG CẤP: DANH SÁCH LỚP + CHI TIẾT LỚP)
// ============================================================================
function TeacherView({ user, activePage }) {
    // Nếu menu chọn 'stats' -> Hiển thị Thống Kê
    if (activePage === 'stats') {
        return <TeacherStats />;
    }

    // Nếu menu chọn 'students' -> Hiển thị Quản Lý Học Sinh
    if (activePage === 'students') {
        return <StudentManager currentUser={user} />;
    }

    // Mặc định: Hiển thị Quản lý Lớp học (Code cũ của bạn)
    return <TeacherClassDashboard user={user} />;
}

// --- COMPONENT 1: DASHBOARD LỚP HỌC (Giữ nguyên logic cũ của bạn) ---
function TeacherClassDashboard({ user }) {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [newClass, setNewClass] = useState({ name: '', desc: '' });
    // ... (Khai báo các state cho chi tiết lớp như tab, content...)
    const [detailData, setDetailData] = useState({ anns: [], asms: [] });
    const [tab, setTab] = useState('stream');
    const [content, setContent] = useState("");

    useEffect(() => { loadClasses(); }, []);
    const loadClasses = async () => { const res = await axios.get(`${API_URL}/my-classes?userId=${user._id}&role=TEACHER`); setClasses(res.data); };
    
    const handleCreateClass = async () => {
        if(!newClass.name) return alert("Nhập tên lớp!");
        await axios.post(`${API_URL}/classes`, { ...newClass, teacherId: user._id });
        setShowModal(false); loadClasses(); alert("Tạo lớp thành công!");
    };

    const openClass = async (cls) => {
        setSelectedClass(cls);
        const res = await axios.get(`${API_URL}/classes/${cls._id}/details`);
        setDetailData(res.data);
    };

    const handlePost = async (type) => {
        if (!content) return;
        if (type === 'announcement') await axios.post(`${API_URL}/announcements`, { classId: selectedClass._id, teacherId: user._id, content });
        else await axios.post(`${API_URL}/assignments`, { classId: selectedClass._id, title: content, description: "Bài tập mới" });
        setContent(""); openClass(selectedClass);
    };

    if (selectedClass) {
        return (
            <div>
                <button className="btn-upload" onClick={()=>setSelectedClass(null)} style={{width:'auto', marginBottom:10}}>⬅ Danh sách lớp</button>
                <div className="welcome-banner" style={{background:'#e0e7ff', borderColor:'#6366f1'}}>
                    <h1 style={{color:'#4338ca'}}>{selectedClass.name}</h1>
                    <p>Mã lớp: <b>{selectedClass.code}</b></p>
                </div>
                <div className="auth-tabs" style={{marginBottom:20}}>
                    <div className={`auth-tab ${tab==='stream'?'active':''}`} onClick={()=>setTab('stream')}>Bảng tin</div>
                    <div className={`auth-tab ${tab==='work'?'active':''}`} onClick={()=>setTab('work')}>Bài tập</div>
                </div>
                {tab === 'stream' && <div>
                    <div className="course-card"><textarea className="form-input" placeholder="Thông báo..." value={content} onChange={e=>setContent(e.target.value)}></textarea><button className="btn-primary" onClick={()=>handlePost('announcement')}>Đăng tin</button></div>
                    {detailData.anns.map(a=><div key={a._id} className="course-card" style={{borderLeft:'4px solid orange'}}><b>{a.teacherId?.fullName}</b>: {a.content}</div>)}
                </div>}
                {tab === 'work' && <div>
                    <div className="course-card"><input className="form-input" placeholder="Tên bài tập..." value={content} onChange={e=>setContent(e.target.value)} /><button className="btn-primary" onClick={()=>handlePost('assignment')}>Giao bài</button></div>
                    <div className="card-grid">{detailData.asms.map(asm=><div key={asm._id} className="course-card"><h3>{asm.title}</h3><TeacherGrading classId={selectedClass._id}/></div>)}</div>
                </div>}
            </div>
        );
    }

    return (
        <div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                <div className="section-title">🏫 Lớp học của tôi</div>
                <button className="btn-primary" style={{width:'auto'}} onClick={()=>setShowModal(true)}>+ Tạo lớp</button>
            </div>
            <div className="card-grid">
                {classes.map(c => (
                    <div key={c._id} className="course-card" onClick={()=>openClass(c)} style={{cursor:'pointer', borderLeft:'5px solid var(--primary)'}}>
                        <h3>{c.name}</h3><p style={{color:'gray', fontSize:12}}>{c.description}</p><span className="tag tag-green">Code: {c.code}</span>
                    </div>
                ))}
            </div>
            {showModal && <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center'}}><div className="auth-form-box" style={{background:'white', width:350}}><h3>Tạo Lớp</h3><input className="form-input" placeholder="Tên lớp" onChange={e=>setNewClass({...newClass, name: e.target.value})} /><input className="form-input" placeholder="Mô tả" onChange={e=>setNewClass({...newClass, desc: e.target.value})} /><button className="btn-primary" onClick={handleCreateClass}>Lưu</button><button className="btn-upload" style={{color:'red', marginTop:10}} onClick={()=>setShowModal(false)}>Hủy</button></div></div>}
        </div>
    );
}
// Helper chấm điểm
function TeacherGrading({classId}){const[n,setN]=useState(0);useEffect(()=>{axios.get(`${API_URL}/classes/${classId}/submissions`).then(r=>setN(r.data.length))},[classId]); return <small style={{color:'gray'}}>Đã nộp: {n}</small>}


// --- COMPONENT 2: THỐNG KÊ (BẢNG XẾP HẠNG) ---
function TeacherStats() {
    const [stats, setStats] = useState([]);

    useEffect(() => {
        // Gọi API thống kê mới tạo ở Backend
        axios.get(`${API_URL}/teacher/stats`)
            .then(res => setStats(res.data))
            .catch(e => console.error(e));
    }, []);

    return (
        <div>
            <div className="welcome-banner" style={{background:'#fef3c7', borderColor:'#f59e0b'}}>
                <h1 style={{color:'#b45309'}}>🏆 Bảng Xếp Hạng Học Sinh</h1>
                <p style={{color:'#92400e'}}>Xếp hạng dựa trên Điểm trung bình & Số lượng bài tập hoàn thành</p>
            </div>

            <div className="course-card">
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                    <thead>
                        <tr style={{background:'#fffbeb', borderBottom:'2px solid #fde68a', textAlign:'left'}}>
                            <th style={{padding:10}}>Hạng</th>
                            <th style={{padding:10}}>Học sinh</th>
                            <th style={{padding:10, textAlign:'center'}}>Số bài làm</th>
                            <th style={{padding:10, textAlign:'center'}}>Điểm TB</th>
                            <th style={{padding:10}}>Đánh giá</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((s, index) => (
                            <tr key={s._id} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:10}}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                </td>
                                <td style={{padding:10, fontWeight:600}}>{s.name}</td>
                                <td style={{padding:10, textAlign:'center'}}>{s.count}</td>
                                <td style={{padding:10, textAlign:'center', fontWeight:700, color:'#d97706', fontSize:15}}>{s.avg}</td>
                                <td style={{padding:10}}>
                                    {s.avg >= 8 ? <span className="tag tag-green">Xuất sắc</span> : 
                                     s.avg >= 6.5 ? <span className="tag" style={{background:'#dbeafe', color:'#1e40af'}}>Khá</span> : 
                                     <span className="tag" style={{background:'#f3f4f6', color:'gray'}}>Trung bình</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {stats.length === 0 && <p style={{textAlign:'center', color:'gray', marginTop:20}}>Chưa có dữ liệu điểm số nào.</p>}
            </div>
        </div>
    );
}


// --- COMPONENT 3: QUẢN LÝ TÀI KHOẢN HỌC SINH ---
function StudentManager({ currentUser }) {
    const [students, setStudents] = useState([]);
    const [form, setForm] = useState({ username: '', password: '', fullName: '' });

    useEffect(() => { loadStudents(); }, []);

    const loadStudents = async () => {
        // Lấy danh sách user có role là STUDENT
        const res = await axios.get(`${API_URL}/users?role=STUDENT`);
        setStudents(res.data);
    };

    const handleCreateStudent = async () => {
        if(!form.username || !form.password || !form.fullName) return alert("Vui lòng điền đủ thông tin!");
        try {
            await axios.post(`${API_URL}/register`, form); // Register mặc định role là STUDENT
            alert("Đã tạo tài khoản học sinh!");
            setForm({ username: '', password: '', fullName: '' });
            loadStudents();
        } catch(e) { alert("Lỗi: Tên đăng nhập có thể đã tồn tại"); }
    };

    const handleDelete = async (id) => {
        if(window.confirm("Bạn chắc chắn muốn xóa học sinh này? Toàn bộ bài làm sẽ bị mất.")) {
            await axios.delete(`${API_URL}/users/${id}`);
            loadStudents();
        }
    };

    const handleResetPass = async (id, name) => {
        const newPass = prompt(`Nhập mật khẩu mới cho ${name}:`, "123456");
        if(newPass) {
            await axios.put(`${API_URL}/users/${id}/reset-password`, { newPassword: newPass });
            alert("Đã đổi mật khẩu thành công!");
        }
    };

    return (
        <div style={{display:'grid', gridTemplateColumns:'65% 34%', gap:'1%'}}>
            {/* Cột trái: Danh sách */}
            <div>
                <div className="section-title">Danh sách Học sinh ({students.length})</div>
                <div className="course-card">
                    <table style={{width:'100%', fontSize:13, borderCollapse:'collapse'}}>
                        <thead>
                            <tr style={{textAlign:'left', background:'#f0fdf4', borderBottom:'2px solid #bbf7d0'}}>
                                <th style={{padding:10}}>Họ tên</th>
                                <th style={{padding:10}}>Username</th>
                                <th style={{padding:10}}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(s => (
                                <tr key={s._id} style={{borderBottom:'1px solid #eee'}}>
                                    <td style={{padding:10, fontWeight:600}}>{s.fullName}</td>
                                    <td style={{padding:10}}>{s.username}</td>
                                    <td style={{padding:10, display:'flex', gap:5}}>
                                        <button className="btn-upload" style={{padding:'4px 8px'}} onClick={()=>handleResetPass(s._id, s.fullName)}>🔑 Pass</button>
                                        <button className="btn-upload" style={{padding:'4px 8px', color:'red', borderColor:'red'}} onClick={()=>handleDelete(s._id)}>🗑️ Xóa</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Cột phải: Form tạo mới */}
            <div>
                <div className="course-card" style={{position:'sticky', top:20, borderLeft:'4px solid #16a34a'}}>
                    <h3 style={{marginTop:0, color:'#166534'}}>➕ Thêm Học Sinh</h3>
                    <p style={{fontSize:12, color:'gray'}}>Cấp tài khoản mới cho học sinh vào hệ thống.</p>
                    
                    <label style={{fontSize:12, fontWeight:600}}>Họ và tên</label>
                    <input className="form-input" value={form.fullName} onChange={e=>setForm({...form, fullName: e.target.value})} placeholder="VD: Nguyễn Văn A" />
                    
                    <label style={{fontSize:12, fontWeight:600}}>Tên đăng nhập</label>
                    <input className="form-input" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} placeholder="VD: hs_nguyena" />
                    
                    <label style={{fontSize:12, fontWeight:600}}>Mật khẩu</label>
                    <input className="form-input" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} placeholder="VD: 123456" />
                    
                    <button className="btn-primary" onClick={handleCreateStudent}>Tạo tài khoản</button>
                </div>
            </div>
        </div>
    );
}

// Component con: Chấm điểm nhanh (Rút gọn)
function TeacherGrading({ classId }) {
    const [subs, setSubs] = useState([]);
    useEffect(()=>{ axios.get(`${API_URL}/classes/${classId}/submissions`).then(r=>setSubs(r.data)) },[classId]);
    return (
        <div style={{marginTop:10, borderTop:'1px solid #eee', paddingTop:10}}>
            <small>Đã nộp: {subs.length}</small>
        </div>
    );
}

// ============================================================================
// 4. STUDENT VIEW (NÂNG CẤP: THAM GIA LỚP + NỘP BÀI THEO LỚP)
// ============================================================================
function StudentView({ user, activePage }) {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [detailData, setDetailData] = useState({ anns: [], asms: [] });
    const [showJoin, setShowJoin] = useState(false);
    const [tab, setTab] = useState('stream');

    useEffect(() => { if(activePage==='dashboard') loadClasses(); }, [activePage]);
    const loadClasses = async () => { const res = await axios.get(`${API_URL}/my-classes?userId=${user._id}`); setClasses(res.data); };

    const handleJoin = async (code) => {
        try { await axios.post(`${API_URL}/classes/join`, { code, studentId: user._id }); setShowJoin(false); loadClasses(); alert("Đã vào lớp!"); }
        catch(e) { alert("Mã sai"); }
    };

    const openClass = async (cls) => {
        setSelectedClass(cls);
        const res = await axios.get(`${API_URL}/classes/${cls._id}/details`);
        setDetailData(res.data);
    };

    if (activePage !== 'dashboard') return <div>Trang thống kê (Giữ code cũ)...</div>;

    if (selectedClass) {
        return (
            <div>
                 <button className="btn-upload" onClick={()=>setSelectedClass(null)} style={{width:'auto', marginBottom:10}}>⬅ Quay lại</button>
                 <div className="welcome-banner" style={{background:'#f0fdf4', borderColor:'#16a34a'}}>
                    <h1 style={{color:'#15803d'}}>{selectedClass.name}</h1>
                    <p>GV: {selectedClass.teacherId?.fullName}</p>
                </div>
                <div className="auth-tabs" style={{marginBottom:20}}>
                    <div className={`auth-tab ${tab==='stream'?'active':''}`} onClick={()=>setTab('stream')}>Bảng tin</div>
                    <div className={`auth-tab ${tab==='work'?'active':''}`} onClick={()=>setTab('work')}>Bài tập</div>
                </div>
                {tab === 'stream' && detailData.anns.map(a => (
                    <div key={a._id} className="course-card" style={{borderLeft:'4px solid orange'}}>
                        <b>{a.teacherId?.fullName}</b>: {a.content}
                    </div>
                ))}
                {tab === 'work' && <div className="card-grid">
                    {detailData.asms.map(asm => (
                        <div key={asm._id} className="course-card">
                            <h3>{asm.title}</h3>
                            <StudentSubmitArea user={user} assignment={asm} classId={selectedClass._id} />
                        </div>
                    ))}
                </div>}
            </div>
        );
    }

    return (
        <div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                <div className="section-title">🏫 Lớp đã tham gia</div>
                <button className="btn-primary" style={{width:'auto'}} onClick={()=>setShowJoin(true)}>+ Tham gia lớp</button>
            </div>
            <div className="card-grid">
                {classes.map(c => (
                    <div key={c._id} className="course-card" onClick={()=>openClass(c)} style={{cursor:'pointer', borderLeft:'5px solid green'}}>
                        <h3>{c.name}</h3>
                        <p>{c.description}</p>
                        <small>GV: {c.teacherId?.fullName}</small>
                    </div>
                ))}
            </div>
            {showJoin && <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center'}}>
                <div className="auth-form-box" style={{background:'white', width:300}}>
                    <h3>Nhập Mã Lớp</h3>
                    <input id="jcode" className="form-input" placeholder="Mã 6 ký tự" />
                    <button className="btn-primary" onClick={()=>handleJoin(document.getElementById('jcode').value)}>Tham gia</button>
                    <button className="btn-upload" style={{color:'red', marginTop:10}} onClick={()=>setShowJoin(false)}>Hủy</button>
                </div>
            </div>}
        </div>
    );
}

// Component con: Nộp bài (Rút gọn)
function StudentSubmitArea({ user, assignment, classId }) {
    const [sub, setSub] = useState(null);
    useEffect(() => { axios.get(`${API_URL}/my-submissions?studentId=${user._id}&classId=${classId}`).then(r => setSub(r.data.find(s=>s.assignmentId?._id === assignment._id))); }, []);
    
    const upload = async (file) => {
        const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET);
        const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, fd);
        await axios.post(`${API_URL}/submissions`, { classId, assignmentId: assignment._id, studentId: user._id, studentName: user.fullName, imageUrl: res.data.secure_url });
        alert("Nộp xong!"); window.location.reload();
    };

    if (sub) return <div style={{color:'green', fontSize:12, marginTop:10}}>✅ Đã nộp. Điểm: {sub.grade??'Chờ chấm'}</div>;
    return <label className="btn-upload" style={{marginTop:10}}>+ Nộp bài <input type="file" hidden onChange={e=>upload(e.target.files[0])} /></label>;
}

export default App;