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
// ============================================================================
// KHU VỰC CỦA GIÁO VIÊN (TEACHER VIEW - TẤT CẢ TRONG MỘT)
// ============================================================================

function TeacherView({ user, activePage }) {
    // 1. ĐIỀU HƯỚNG: Tùy vào activePage mà hiển thị component con tương ứng
    if (activePage === 'stats') {
        return <TeacherStats />;
    }
    if (activePage === 'students') {
        return <StudentManager currentUser={user} />;
    }
    // Mặc định là Dashboard Lớp học
    return <TeacherClassDashboard user={user} />;
}

function TeacherClassDashboard({ user }) {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [newClass, setNewClass] = useState({ name: '', desc: '' });
    
    // State chi tiết lớp
    const [detailData, setDetailData] = useState({ anns: [], asms: [] });
    const [classSubmissions, setClassSubmissions] = useState([]); 
    const [classStudents, setClassStudents] = useState([]); // Danh sách học sinh
    const [tab, setTab] = useState('stream'); 
    const [content, setContent] = useState("");
    
    // State chấm bài
    const [expandedAsmId, setExpandedAsmId] = useState(null); 
    const [gradingSub, setGradingSub] = useState(null);

    useEffect(() => { loadClasses(); }, []);

    const loadClasses = async () => { 
        try {
            const res = await axios.get(`${API_URL}/my-classes?userId=${user._id}&role=TEACHER`);
            setClasses(res.data);
        } catch(e) { console.error(e); }
    };
    
    const handleCreateClass = async () => {
        if(!newClass.name) return alert("Vui lòng nhập tên lớp!");
        try {
            await axios.post(`${API_URL}/classes`, { ...newClass, teacherId: user._id });
            alert("✅ Tạo lớp thành công!"); setShowModal(false); setNewClass({ name: '', desc: '' }); loadClasses();
        } catch(e) { alert("Lỗi tạo lớp"); }
    };

    const openClass = async (cls) => {
        setSelectedClass(cls);
        setTab('stream'); 
        
        // Load dữ liệu ban đầu
        const resDetail = await axios.get(`${API_URL}/classes/${cls._id}/details`);
        setDetailData(resDetail.data);
        
        const resSub = await axios.get(`${API_URL}/classes/${cls._id}/submissions`);
        setClassSubmissions(resSub.data);
    };

    // Hàm chuyển Tab (Load dữ liệu tương ứng khi bấm)
    const handleTabChange = async (newTab) => {
        setTab(newTab);
        if (newTab === 'people') {
            const res = await axios.get(`${API_URL}/classes/${selectedClass._id}/members`);
            setClassStudents(res.data);
        }
    };

    const handlePost = async (type) => {
        if (!content) return;
        try {
            if (type === 'announcement') {
                await axios.post(`${API_URL}/announcements`, { classId: selectedClass._id, teacherId: user._id, content });
            } else {
                await axios.post(`${API_URL}/assignments`, { classId: selectedClass._id, title: content, description: "Bài tập mới" });
            }
            setContent(""); 
            const res = await axios.get(`${API_URL}/classes/${selectedClass._id}/details`);
            setDetailData(res.data);
        } catch(e) { alert("Lỗi đăng bài"); }
    };

    const handleSaveGrade = async (grade, feedback) => {
        if(!gradingSub) return;
        try {
            await axios.put(`${API_URL}/submissions/${gradingSub._id}`, { grade, feedback });
            alert("✅ Đã lưu điểm!");
            const updatedSubs = classSubmissions.map(s => s._id === gradingSub._id ? { ...s, grade: parseFloat(grade), feedback } : s);
            setClassSubmissions(updatedSubs);
            setGradingSub(null);
        } catch (e) { alert("Lỗi lưu điểm"); }
    };

    const handleDeleteAsm = async (asmId) => {
        if(window.confirm("Xóa bài tập này?")) {
            await axios.delete(`${API_URL}/assignments/${asmId}`);
            const res = await axios.get(`${API_URL}/classes/${selectedClass._id}/details`);
            setDetailData(res.data);
        }
    };

    // Hàm xóa học sinh khỏi lớp
    const handleKickStudent = async (studentId) => {
        if(window.confirm("Bạn muốn xóa học sinh này khỏi lớp?")) {
            await axios.put(`${API_URL}/classes/${selectedClass._id}/remove-student`, { studentId });
            // Load lại danh sách
            const res = await axios.get(`${API_URL}/classes/${selectedClass._id}/members`);
            setClassStudents(res.data);
        }
    };

    // --- GIAO DIỆN CHÍNH ---
    if (selectedClass) {
        return (
            <div>
                <button className="btn-upload" onClick={()=>setSelectedClass(null)} style={{width:'auto', marginBottom:10}}>⬅ Danh sách lớp</button>
                <div className="welcome-banner" style={{background:'#e0e7ff', borderColor:'#6366f1'}}>
                    <h1 style={{color:'#4338ca'}}>{selectedClass.name}</h1>
                    <p>Mã lớp: <b>{selectedClass.code}</b></p>
                </div>
                
                {/* 3 TAB CHỨC NĂNG */}
                <div className="auth-tabs" style={{marginBottom:20}}>
                    <div className={`auth-tab ${tab==='stream'?'active':''}`} onClick={()=>handleTabChange('stream')}>📢 Bảng tin</div>
                    <div className={`auth-tab ${tab==='work'?'active':''}`} onClick={()=>handleTabChange('work')}>📝 Bài tập</div>
                    <div className={`auth-tab ${tab==='people'?'active':''}`} onClick={()=>handleTabChange('people')}>👥 Mọi người</div>
                </div>

                {/* TAB 1: BẢNG TIN */}
                {tab === 'stream' && (
                    <div>
                        <div className="course-card">
                            <textarea className="form-input" placeholder="Thông báo..." value={content} onChange={e=>setContent(e.target.value)}></textarea>
                            <button className="btn-primary" onClick={()=>handlePost('announcement')}>Đăng tin</button>
                        </div>
                        {detailData.anns.map(a => (
                            <div key={a._id} className="course-card" style={{borderLeft:'4px solid orange'}}>
                                <b>{a.teacherId?.fullName}</b>: {a.content}
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB 2: BÀI TẬP & CHẤM ĐIỂM */}
                {tab === 'work' && (
                    <div>
                         <div className="course-card">
                            <input className="form-input" placeholder="Tên bài tập mới..." value={content} onChange={e=>setContent(e.target.value)} />
                            <button className="btn-primary" onClick={()=>handlePost('assignment')}>Giao bài</button>
                        </div>
                        <div className="card-grid">
                            {detailData.asms.map(asm => {
                                const subsForThisAsm = classSubmissions.filter(s => {
                                    const sAsmId = s.assignmentId?._id || s.assignmentId;
                                    return String(sAsmId) === String(asm._id);
                                });
                                const isExpanded = expandedAsmId === asm._id;

                                return (
                                    <div key={asm._id} className="course-card" style={{gridColumn: isExpanded ? '1 / -1' : 'auto'}}>
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                            <div>
                                                <h3>{asm.title}</h3>
                                                <small style={{color:'gray'}}>Đã nộp: <b>{subsForThisAsm.length}</b></small>
                                            </div>
                                            <div style={{display:'flex', gap:5}}>
                                                <button className="btn-upload" onClick={() => setExpandedAsmId(isExpanded ? null : asm._id)}>
                                                    {isExpanded ? 'Đóng lại' : '📂 Danh sách nộp'}
                                                </button>
                                                <button className="btn-upload" style={{color:'red'}} onClick={()=>handleDeleteAsm(asm._id)}>🗑️</button>
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div style={{marginTop:15, borderTop:'1px solid #eee', paddingTop:15}}>
                                                {subsForThisAsm.length === 0 ? <p style={{color:'gray'}}>Chưa có bài nộp.</p> : (
                                                    <table style={{width:'100%', fontSize:13, borderCollapse:'collapse'}}>
                                                        <thead>
                                                            <tr style={{textAlign:'left', background:'#f8fafc', borderBottom:'1px solid #ddd'}}>
                                                                <th style={{padding:8}}>Học sinh</th>
                                                                <th style={{padding:8}}>Thời gian</th>
                                                                <th style={{padding:8}}>Điểm</th>
                                                                <th style={{padding:8}}>Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {subsForThisAsm.map(sub => (
                                                                <tr key={sub._id} style={{borderBottom:'1px solid #eee'}}>
                                                                    <td style={{padding:8, fontWeight:600}}>{sub.studentName}</td>
                                                                    <td style={{padding:8}}>{new Date(sub.submittedAt).toLocaleDateString()}</td>
                                                                    <td style={{padding:8}}>{sub.grade !== null ? <b style={{color:'green'}}>{sub.grade}</b> : '---'}</td>
                                                                    <td style={{padding:8}}>
                                                                        <button className="btn-primary" style={{padding:'4px 8px', fontSize:12}} onClick={() => setGradingSub(sub)}>✍️ Chấm</button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TAB 3: MỌI NGƯỜI (DANH SÁCH HỌC SINH) */}
                {tab === 'people' && (
                    <div className="course-card">
                        <h3 style={{marginTop:0}}>Danh sách thành viên ({classStudents.length})</h3>
                        <table style={{width:'100%', fontSize:13, borderCollapse:'collapse'}}>
                            <thead>
                                <tr style={{textAlign:'left', borderBottom:'2px solid #eee', background:'#f8fafc'}}>
                                    <th style={{padding:10}}>STT</th>
                                    <th style={{padding:10}}>Họ và tên</th>
                                    <th style={{padding:10}}>Tên đăng nhập</th>
                                    <th style={{padding:10}}>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classStudents.map((s, index) => (
                                    <tr key={s._id} style={{borderBottom:'1px solid #eee'}}>
                                        <td style={{padding:10}}>{index + 1}</td>
                                        <td style={{padding:10, fontWeight:600}}>{s.fullName}</td>
                                        <td style={{padding:10, color:'gray'}}>{s.username}</td>
                                        <td style={{padding:10}}>
                                            <button 
                                                className="btn-upload" 
                                                style={{color:'red', borderColor:'red', padding:'5px 10px'}}
                                                onClick={() => handleKickStudent(s._id)}
                                            >
                                                Mời khỏi lớp
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {classStudents.length === 0 && <p style={{color:'gray', marginTop:15}}>Lớp chưa có học sinh nào.</p>}
                    </div>
                )}
                
                {/* MODAL CHẤM BÀI (Giữ nguyên) */}
                {gradingSub && <GradingModal submission={gradingSub} onClose={() => setGradingSub(null)} onSave={handleSaveGrade} />}
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
                {classes.map(c => (<div key={c._id} className="course-card" onClick={()=>openClass(c)} style={{cursor:'pointer', borderLeft:'5px solid var(--primary)'}}><h3>{c.name}</h3><p>{c.description}</p></div>))}
            </div>
            {showModal && <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:9999}}><div className="auth-form-box" style={{background:'white', width:350}}><h3>Tạo Lớp</h3><input className="form-input" placeholder="Tên lớp" onChange={e=>setNewClass({...newClass, name: e.target.value})} /><button className="btn-primary" onClick={handleCreateClass}>Lưu</button><button className="btn-upload" style={{color:'red', marginTop:10}} onClick={()=>setShowModal(false)}>Hủy</button></div></div>}
        </div>
    );
}

// --- COMPONENT MODAL CHẤM BÀI RIÊNG BIỆT ---
function GradingModal({ submission, onClose, onSave }) {
    const [grade, setGrade] = useState(submission.grade || '');
    const [feedback, setFeedback] = useState(submission.feedback || '');
    
    // Xử lý ảnh (tương thích cũ/mới)
    const images = submission.imageUrls && submission.imageUrls.length > 0 
        ? submission.imageUrls 
        : (submission.imageUrl ? [submission.imageUrl] : []);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.8)', zIndex: 10000, 
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div style={{
                background: 'white', width: '90%', height: '90%', borderRadius: 8, 
                display: 'flex', overflow: 'hidden'
            }}>
                {/* CỘT TRÁI: HIỂN THỊ ẢNH (Scroll) */}
                <div style={{flex: 2, background: '#333', overflowY: 'auto', padding: 20, textAlign: 'center'}}>
                    {images.map((img, idx) => (
                        <img key={idx} src={img} alt={`Trang ${idx+1}`} 
                            style={{maxWidth: '100%', marginBottom: 20, boxShadow: '0 0 10px rgba(0,0,0,0.5)'}} 
                        />
                    ))}
                    {images.length === 0 && <p style={{color:'white'}}>Không có ảnh bài làm</p>}
                </div>

                {/* CỘT PHẢI: FORM CHẤM ĐIỂM */}
                <div style={{flex: 1, padding: 20, borderLeft: '1px solid #eee', display: 'flex', flexDirection: 'column'}}>
                    <div style={{flex: 1}}>
                        <h2 style={{marginTop: 0}}>✍️ Chấm bài</h2>
                        <div style={{marginBottom: 20}}>
                            <strong>Học sinh:</strong> {submission.studentName}<br/>
                            <small style={{color:'gray'}}>Nộp lúc: {new Date(submission.submittedAt).toLocaleString()}</small>
                        </div>

                        <label style={{fontWeight: 600}}>Điểm số (0-10):</label>
                        <input className="form-input" type="number" value={grade} onChange={e => setGrade(e.target.value)} placeholder="Nhập điểm..." />
                        
                        <label style={{fontWeight: 600, marginTop: 15, display: 'block'}}>Nhận xét:</label>
                        <textarea className="form-input" rows={5} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Lời phê của giáo viên..."></textarea>
                    </div>

                    <div style={{marginTop: 20, display: 'flex', gap: 10}}>
                        <button className="btn-primary" style={{flex: 1}} onClick={() => onSave(grade, feedback)}>💾 Lưu kết quả</button>
                        <button className="btn-upload" style={{flex: 1, color:'red', borderColor:'red'}} onClick={onClose}>Đóng</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper: Hiển thị số lượng bài đã nộp
function TeacherGrading({ classId }) {
    const [count, setCount] = useState(0);
    useEffect(()=>{ axios.get(`${API_URL}/classes/${classId}/submissions`).then(r=>setCount(r.data.length)) },[classId]);
    return <small style={{color:'gray'}}>Đã nộp: {count}</small>;
}

// --- COMPONENT CON 2: THỐNG KÊ (Stats) ---
function TeacherStats() {
    const [stats, setStats] = useState([]);
    useEffect(() => { axios.get(`${API_URL}/teacher/stats`).then(res => setStats(res.data)); }, []);

    return (
        <div>
            <div className="welcome-banner" style={{background:'#fef3c7', borderColor:'#f59e0b'}}>
                <h1 style={{color:'#b45309'}}>🏆 Bảng Xếp Hạng Học Sinh</h1>
                <p>Thống kê dựa trên điểm trung bình & số bài tập hoàn thành</p>
            </div>
            <div className="course-card">
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                    <thead>
                        <tr style={{background:'#fffbeb', textAlign:'left', borderBottom:'2px solid #fde68a'}}>
                            <th style={{padding:10}}>Hạng</th>
                            <th style={{padding:10}}>Học sinh</th>
                            <th style={{padding:10, textAlign:'center'}}>Số bài</th>
                            <th style={{padding:10, textAlign:'center'}}>Điểm TB</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((s, i) => (
                            <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:10}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
                                <td style={{padding:10, fontWeight:600}}>{s.name}</td>
                                <td style={{padding:10, textAlign:'center'}}>{s.count}</td>
                                <td style={{padding:10, textAlign:'center', fontWeight:700, color:'#d97706'}}>{s.avg}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {stats.length === 0 && <p style={{textAlign:'center', color:'gray', marginTop:10}}>Chưa có dữ liệu.</p>}
            </div>
        </div>
    );
}

// --- COMPONENT CON 3: QUẢN LÝ TÀI KHOẢN HỌC SINH ---
function StudentManager() {
    const [students, setStudents] = useState([]);
    const [form, setForm] = useState({ username: '', password: '', fullName: '' });

    useEffect(() => { load(); }, []);
    const load = async () => { const res = await axios.get(`${API_URL}/users?role=STUDENT`); setStudents(res.data); };

    const handleCreate = async () => {
        if(!form.username || !form.password) return alert("Điền thiếu thông tin!");
        try {
            await axios.post(`${API_URL}/register`, form); // Register mặc định là STUDENT
            alert("Đã tạo tài khoản học sinh!"); setForm({username:'', password:'', fullName:''}); load();
        } catch(e) { alert("Lỗi: Tên đăng nhập đã tồn tại"); }
    };

    const handleResetPass = async (id, name) => {
        const p = prompt(`Pass mới cho ${name}:`, "123456");
        if(p) { await axios.put(`${API_URL}/users/${id}/reset-password`, { newPassword: p }); alert("Đã đổi pass!"); }
    };

    const handleDelete = async (id) => {
        if(window.confirm("Xóa học sinh này?")) { await axios.delete(`${API_URL}/users/${id}`); load(); }
    };

    return (
        <div style={{display:'grid', gridTemplateColumns:'65% 34%', gap:'1%'}}>
            <div>
                <div className="section-title">Danh sách Học sinh ({students.length})</div>
                <div className="course-card">
                    <table style={{width:'100%', fontSize:13}}>
                        <thead><tr style={{textAlign:'left', background:'#f0fdf4'}}><th style={{padding:8}}>Tên</th><th style={{padding:8}}>User</th><th style={{padding:8}}>Action</th></tr></thead>
                        <tbody>
                            {students.map(s => (
                                <tr key={s._id} style={{borderBottom:'1px solid #eee'}}>
                                    <td style={{padding:8, fontWeight:600}}>{s.fullName}</td>
                                    <td style={{padding:8}}>{s.username}</td>
                                    <td style={{padding:8}}>
                                        <button className="btn-upload" style={{marginRight:5}} onClick={()=>handleResetPass(s._id, s.fullName)}>🔑</button>
                                        <button className="btn-upload" style={{color:'red'}} onClick={()=>handleDelete(s._id)}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div>
                <div className="course-card" style={{borderLeft:'4px solid #16a34a'}}>
                    <h3 style={{marginTop:0, color:'#166534'}}>➕ Thêm HS Mới</h3>
                    <input className="form-input" placeholder="Họ tên" value={form.fullName} onChange={e=>setForm({...form, fullName: e.target.value})} />
                    <input className="form-input" placeholder="Username" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} />
                    <input className="form-input" placeholder="Password" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} />
                    <button className="btn-primary" onClick={handleCreate}>Tạo tài khoản</button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// 4. STUDENT VIEW (NÂNG CẤP: THAM GIA LỚP + NỘP BÀI THEO LỚP)
// ============================================================================
// ============================================================================
// KHU VỰC CỦA HỌC SINH (STUDENT VIEW)
// ============================================================================

// ============================================================================
// KHU VỰC CỦA HỌC SINH (STUDENT VIEW) - ĐÃ SỬA LỖI HIỂN THỊ NỘP BÀI
// ============================================================================

function StudentView({ user, activePage }) {
    if (activePage === 'grades') return <StudentGrades user={user} />;
    return <StudentClassDashboard user={user} />;
}

// 1. DASHBOARD LỚP HỌC CỦA HỌC SINH
function StudentClassDashboard({ user }) {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [showJoin, setShowJoin] = useState(false);
    
    // State chi tiết lớp
    const [detailData, setDetailData] = useState({ anns: [], asms: [] });
    const [tab, setTab] = useState('stream');

    useEffect(() => { loadClasses(); }, []);
    const loadClasses = async () => { 
        try {
            const res = await axios.get(`${API_URL}/my-classes?userId=${user._id}`);
            setClasses(res.data);
        } catch(e) { console.error(e); }
    };

    const handleJoin = async (code) => {
        try { 
            await axios.post(`${API_URL}/classes/join`, { code, studentId: user._id }); 
            setShowJoin(false); loadClasses(); alert("✅ Đã tham gia lớp!"); 
        }
        catch(e) { alert("❌ Mã lớp không đúng"); }
    };

    const openClass = async (cls) => {
        setSelectedClass(cls);
        // Reset dữ liệu trước khi load
        setDetailData({ anns: [], asms: [] });
        
        const res = await axios.get(`${API_URL}/classes/${cls._id}/details`);
        setDetailData(res.data);
        setTab('stream');
    };

    // GIAO DIỆN CHI TIẾT LỚP
    if (selectedClass) {
        return (
            <div>
                 <button className="btn-upload" onClick={()=>setSelectedClass(null)} style={{width:'auto', marginBottom:10}}>⬅ Quay lại</button>
                 
                 <div className="welcome-banner" style={{background:'#f0fdf4', borderColor:'#16a34a'}}>
                    <h1 style={{color:'#15803d'}}>{selectedClass.name}</h1>
                    <p>Giáo viên: <b>{selectedClass.teacherId?.fullName}</b></p>
                </div>
                
                <div className="auth-tabs" style={{marginBottom:20}}>
                    <div className={`auth-tab ${tab==='stream'?'active':''}`} onClick={()=>setTab('stream')}>Bảng tin</div>
                    <div className={`auth-tab ${tab==='work'?'active':''}`} onClick={()=>setTab('work')}>Bài tập</div>
                </div>

                {/* TAB BẢNG TIN */}
                {tab === 'stream' && (
                    <div>
                        {detailData.anns.length === 0 && <p style={{color:'gray'}}>Chưa có thông báo nào.</p>}
                        {detailData.anns.map(a => (
                            <div key={a._id} className="course-card" style={{borderLeft:'4px solid orange'}}>
                                <div style={{fontWeight:700, fontSize:13}}>{a.teacherId?.fullName} <span style={{fontWeight:400, color:'gray'}}>{new Date(a.createdAt).toLocaleString()}</span></div>
                                <p style={{marginTop:5}}>{a.content}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB BÀI TẬP */}
                {tab === 'work' && (
                    <div className="card-grid">
                        {detailData.asms.length === 0 && <p>Chưa có bài tập nào.</p>}
                        {detailData.asms.map(asm => (
                            <div key={asm._id} className="course-card">
                                <h3>{asm.title}</h3>
                                <p style={{fontSize:12, color:'gray'}}>{asm.description}</p>
                                
                                {/* GỌI COMPONENT NỘP BÀI Ở ĐÂY */}
                                <StudentSubmitArea user={user} assignment={asm} classId={selectedClass._id} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // GIAO DIỆN DANH SÁCH LỚP
    return (
        <div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                <div className="section-title">🏫 Lớp đã tham gia</div>
                <button className="btn-primary" style={{width:'auto'}} onClick={()=>setShowJoin(true)}>+ Tham gia lớp mới</button>
            </div>
            
            <div className="card-grid">
                {classes.map(c => (
                    <div key={c._id} className="course-card" onClick={()=>openClass(c)} style={{cursor:'pointer', borderLeft:'5px solid #22c55e'}}>
                        <h3>{c.name}</h3>
                        <p style={{color:'gray', fontSize:12}}>{c.description}</p>
                        <span className="tag tag-green">GV: {c.teacherId?.fullName}</span>
                    </div>
                ))}
            </div>

            {/* Modal Nhập Mã Lớp */}
            {showJoin && <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:9999}}>
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

// 2. COMPONENT NỘP BÀI (QUAN TRỌNG: ĐÃ SỬA ĐỂ HIỆN NÚT)
function StudentSubmitArea({ user, assignment, classId }) {
    const [sub, setSub] = useState(null);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true); // Trạng thái đang kiểm tra xem nộp chưa

    useEffect(() => { 
        // Gọi API kiểm tra xem bài này HS đã nộp chưa
        axios.get(`${API_URL}/my-submissions?studentId=${user._id}&classId=${classId}`)
             .then(r => {
                 const mySub = r.data.find(s => {
                     const sAsmId = s.assignmentId?._id || s.assignmentId;
                     return String(sAsmId) === String(assignment._id);
                 });
                 setSub(mySub);
                 setChecking(false);
             })
             .catch(() => setChecking(false));
    }, [assignment]);
    
    const handleUpload = async (files) => {
        if (!files || files.length === 0) return;
        setLoading(true);
        try {
            const uploadedUrls = [];
            for (let i = 0; i < files.length; i++) {
                const fd = new FormData(); 
                fd.append("file", files[i]); 
                fd.append("upload_preset", UPLOAD_PRESET);
                const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, fd);
                uploadedUrls.push(res.data.secure_url);
            }

            await axios.post(`${API_URL}/submissions`, { 
                classId, 
                assignmentId: assignment._id, 
                studentId: user._id, 
                studentName: user.fullName, 
                imageUrls: uploadedUrls 
            });
            alert("✅ Nộp bài thành công!"); 
            window.location.reload();
        } catch(e) { alert("Lỗi upload"); }
        finally { setLoading(false); }
    };

    if (checking) return <div style={{fontSize:12, color:'gray'}}>⏳ Đang kiểm tra trạng thái...</div>;

    // TRƯỜNG HỢP 1: ĐÃ NỘP BÀI -> HIỆN KẾT QUẢ
    if (sub) {
        const images = sub.imageUrls && sub.imageUrls.length > 0 ? sub.imageUrls : (sub.imageUrl ? [sub.imageUrl] : []);
        return (
            <div style={{marginTop:10, padding:10, background: sub.grade !== null ? '#f0fdf4' : '#fffbeb', borderRadius:8, border: sub.grade !== null ? '1px solid #bbf7d0' : '1px solid #fde68a'}}>
                <div style={{fontWeight:700, color: sub.grade !== null ? '#15803d' : '#b45309', fontSize:13}}>
                    {sub.grade !== null ? '✅ Đã chấm điểm' : '⏳ Đã nộp, chờ chấm'}
                </div>
                
                {/* Danh sách ảnh đã nộp */}
                <div style={{display:'flex', gap:5, overflowX:'auto', marginTop:5}}>
                    {images.map((img, idx) => (
                        <a key={idx} href={img} target="_blank" rel="noreferrer">
                            <img src={img} style={{width:50, height:50, objectFit:'cover', borderRadius:4, border:'1px solid #ccc'}} />
                        </a>
                    ))}
                </div>

                {sub.grade !== null && (
                    <div style={{marginTop:8, paddingTop:8, borderTop:'1px solid #eee'}}>
                        <b style={{fontSize:16, color:'#dc2626'}}>{sub.grade}đ</b>
                        <span style={{fontSize:12, marginLeft:5, color:'#334155'}}>{sub.feedback}</span>
                    </div>
                )}
            </div>
        );
    }
    
    // TRƯỜNG HỢP 2: CHƯA NỘP -> HIỆN NÚT UPLOAD (CHO PHÉP CHỌN NHIỀU)
    return (
        <label className="btn-upload" style={{marginTop:10, textAlign:'center', display:'block', background:'#eff6ff', color:'#2563eb', border:'1px dashed #bfdbfe'}}>
            {loading ? 'Đang tải lên...' : '☁️ Nộp bài (Chọn nhiều ảnh)'}
            <input 
                type="file" 
                multiple 
                hidden 
                onChange={e => handleUpload(e.target.files)} 
                disabled={loading} 
            />
        </label>
    );
}

export default App;