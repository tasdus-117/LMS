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
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null); // Lớp đang chọn xem
    const [detailData, setDetailData] = useState({ anns: [], asms: [] }); // Dữ liệu trong lớp
    
    // State tạo mới
    const [showModal, setShowModal] = useState(false);
    const [newClass, setNewClass] = useState({ name: '', desc: '' });
    const [content, setContent] = useState(""); // Nội dung thông báo/bài tập
    const [tab, setTab] = useState('stream'); // stream | classwork | people

    useEffect(() => { 
        if (activePage === 'dashboard') loadClasses(); 
    }, [activePage]);

    const loadClasses = async () => { const res = await axios.get(`${API_URL}/my-classes?userId=${user._id}&role=TEACHER`); setClasses(res.data); };
    
    // Tạo lớp mới
    const handleCreateClass = async () => {
        await axios.post(`${API_URL}/classes`, { ...newClass, teacherId: user._id });
        setShowModal(false); loadClasses(); alert("Đã tạo lớp!");
    };

    // Vào xem chi tiết lớp
    const openClass = async (cls) => {
        setSelectedClass(cls);
        const res = await axios.get(`${API_URL}/classes/${cls._id}/details`);
        setDetailData(res.data);
    };

    // Đăng thông báo / Bài tập
    const handlePost = async (type) => {
        if (!content) return;
        if (type === 'announcement') {
            await axios.post(`${API_URL}/announcements`, { classId: selectedClass._id, teacherId: user._id, content });
        } else {
            await axios.post(`${API_URL}/assignments`, { classId: selectedClass._id, title: content, description: "Bài tập mới" });
        }
        setContent(""); openClass(selectedClass); // Reload data
    };

    // QUAY LẠI DASHBOARD NẾU CHUYỂN TRANG
    if (activePage !== 'dashboard') {
        // ... (Giữ code quản lý Students/Stats cũ của bạn ở đây nếu muốn)
        return <div style={{padding:20}}>Chức năng khác (Thống kê/Quản lý HS)...</div>;
    }

    // NẾU ĐANG CHỌN LỚP -> HIỂN THỊ CHI TIẾT
    if (selectedClass) {
        return (
            <div>
                <button className="btn-upload" onClick={()=>setSelectedClass(null)} style={{width:'auto', marginBottom:10}}>⬅ Quay lại</button>
                <div className="welcome-banner" style={{background:'#e0e7ff', borderColor:'#6366f1'}}>
                    <h1 style={{color:'#4338ca'}}>{selectedClass.name}</h1>
                    <p>Mã lớp: <b>{selectedClass.code}</b> | {selectedClass.description}</p>
                </div>
                
                <div className="auth-tabs" style={{marginBottom:20}}>
                    <div className={`auth-tab ${tab==='stream'?'active':''}`} onClick={()=>setTab('stream')}>📢 Bảng tin</div>
                    <div className={`auth-tab ${tab==='work'?'active':''}`} onClick={()=>setTab('work')}>📝 Bài tập</div>
                </div>

                {/* TAB BẢNG TIN */}
                {tab === 'stream' && (
                    <div>
                        <div className="course-card">
                            <textarea className="form-input" placeholder="Thông báo cho lớp..." value={content} onChange={e=>setContent(e.target.value)}></textarea>
                            <button className="btn-primary" onClick={()=>handlePost('announcement')}>Đăng tin</button>
                        </div>
                        {detailData.anns.map(a => (
                            <div key={a._id} className="course-card" style={{borderLeft:'4px solid orange'}}>
                                <b>{a.teacherId?.fullName}</b> <span style={{fontSize:11, color:'gray'}}>{new Date(a.createdAt).toLocaleString()}</span>
                                <p style={{marginTop:5}}>{a.content}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB BÀI TẬP */}
                {tab === 'work' && (
                    <div>
                         <div className="course-card">
                            <input className="form-input" placeholder="Tiêu đề bài tập mới..." value={content} onChange={e=>setContent(e.target.value)} />
                            <button className="btn-primary" onClick={()=>handlePost('assignment')}>Giao bài</button>
                        </div>
                        <div className="card-grid">
                            {detailData.asms.map(asm => (
                                <div key={asm._id} className="course-card">
                                    <h3>{asm.title}</h3>
                                    <TeacherGrading classId={selectedClass._id} /> {/* Component chấm điểm nhỏ */}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // MẶC ĐỊNH: DANH SÁCH LỚP
    return (
        <div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                <div className="section-title">🏫 Lớp học của tôi</div>
                <button className="btn-primary" style={{width:'auto'}} onClick={()=>setShowModal(true)}>+ Tạo lớp</button>
            </div>
            <div className="card-grid">
                {classes.map(c => (
                    <div key={c._id} className="course-card" onClick={()=>openClass(c)} style={{cursor:'pointer', borderLeft:'5px solid var(--primary)'}}>
                        <h3>{c.name}</h3>
                        <p style={{color:'gray', fontSize:12}}>{c.description}</p>
                        <span className="tag tag-green">Code: {c.code}</span>
                    </div>
                ))}
            </div>

            {/* Modal Tạo Lớp */}
            {showModal && (
                <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center'}}>
                    <div className="auth-form-box" style={{background:'white', width:350}}>
                        <h3>Tạo Lớp Mới</h3>
                        <input className="form-input" placeholder="Tên lớp (VD: Toán 12A)" onChange={e=>setNewClass({...newClass, name: e.target.value})} />
                        <input className="form-input" placeholder="Mô tả" onChange={e=>setNewClass({...newClass, desc: e.target.value})} />
                        <button className="btn-primary" onClick={handleCreateClass}>Tạo</button>
                        <button className="btn-upload" style={{color:'red', marginTop:10}} onClick={()=>setShowModal(false)}>Hủy</button>
                    </div>
                </div>
            )}
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