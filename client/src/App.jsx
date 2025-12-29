import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './index.css';

// ⚠️ Sửa lại link API nếu đã deploy
const API_URL = 'http://localhost:5000/api';
// const API_URL = 'https://lms-backend-xyz.onrender.com/api'; 

const CLOUD_NAME = "demo"; // Thay bằng cloud name của bạn
const UPLOAD_PRESET = "unsigned_preset"; // Thay bằng preset của bạn

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('lms_user')));
  const [activePage, setActivePage] = useState('dashboard');

  const handleLogin = (u) => { localStorage.setItem('lms_user', JSON.stringify(u)); setUser(u); };
  const handleLogout = () => { localStorage.removeItem('lms_user'); setUser(null); };

  if (!user) return <AuthPage onLogin={handleLogin} />;

  return (
    <div className="layout-wrapper">
      <Sidebar user={user} activePage={activePage} setActivePage={setActivePage} onLogout={handleLogout} />
      <main className="main-content">
        <Header user={user} />
        {user.role === 'ADMIN' ? <AdminView user={user} /> : <ClassroomManager user={user} />}
      </main>
    </div>
  );
}

// 1. QUẢN LÝ LỚP HỌC (Dùng chung cho GV và HS)
function ClassroomManager({ user }) {
    const [selectedClass, setSelectedClass] = useState(null); // Lớp đang chọn
    const [classes, setClasses] = useState([]);
    const [showJoinModal, setShowJoinModal] = useState(false); // Modal tạo/join lớp

    useEffect(() => { loadClasses(); }, []);
    
    const loadClasses = async () => {
        const res = await axios.get(`${API_URL}/my-classes?userId=${user._id}&role=${user.role}`);
        setClasses(res.data);
    };

    const handleCreateClass = async (name, desc) => {
        await axios.post(`${API_URL}/classes`, { name, description: desc, teacherId: user._id });
        alert("Tạo lớp thành công!"); setShowJoinModal(false); loadClasses();
    };

    const handleJoinClass = async (code) => {
        try {
            await axios.post(`${API_URL}/classes/join`, { code, studentId: user._id });
            alert("Đã tham gia lớp!"); setShowJoinModal(false); loadClasses();
        } catch (e) { alert("Mã lớp không đúng"); }
    };

    // Nếu đã chọn lớp -> Hiển thị chi tiết lớp
    if (selectedClass) {
        return (
            <div>
                <button className="btn-upload" style={{width:'auto', marginBottom:15}} onClick={()=>setSelectedClass(null)}>⬅ Trở về danh sách lớp</button>
                <ClassDetail user={user} classroom={selectedClass} />
            </div>
        );
    }

    // Nếu chưa chọn lớp -> Hiển thị danh sách
    return (
        <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                <div className="section-title">🏫 Lớp học của tôi</div>
                <button className="btn-primary" style={{width:'auto'}} onClick={()=>setShowJoinModal(true)}>
                    {user.role === 'TEACHER' ? '+ Tạo lớp mới' : '+ Tham gia lớp'}
                </button>
            </div>

            <div className="card-grid">
                {classes.map(cls => (
                    <div key={cls._id} className="course-card" onClick={()=>setSelectedClass(cls)} style={{cursor:'pointer', borderLeft:'4px solid var(--primary)'}}>
                        <h3 style={{margin:0, fontSize:16}}>{cls.name}</h3>
                        <p style={{fontSize:12, color:'gray'}}>{cls.description}</p>
                        {user.role === 'TEACHER' && <div className="tag tag-green">Mã: {cls.code}</div>}
                        {user.role === 'STUDENT' && <div style={{fontSize:11, marginTop:5}}>GV: {cls.teacherId?.fullName}</div>}
                    </div>
                ))}
            </div>

            {/* Modal Tạo/Join */}
            {showJoinModal && (
                <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:2000}}>
                    <div className="auth-form-box" style={{background:'white', width:400}}>
                        <h3>{user.role === 'TEACHER' ? 'Tạo lớp học mới' : 'Nhập mã lớp'}</h3>
                        {user.role === 'TEACHER' ? (
                            <>
                                <input id="c-name" className="form-input" placeholder="Tên lớp (VD: Toán 12A1)" />
                                <input id="c-desc" className="form-input" placeholder="Mô tả ngắn" />
                                <button className="btn-primary" onClick={()=>handleCreateClass(document.getElementById('c-name').value, document.getElementById('c-desc').value)}>Tạo</button>
                            </>
                        ) : (
                            <>
                                <input id="j-code" className="form-input" placeholder="Nhập mã lớp (6 ký tự)" />
                                <button className="btn-primary" onClick={()=>handleJoinClass(document.getElementById('j-code').value)}>Tham gia</button>
                            </>
                        )}
                        <button className="btn-upload" style={{marginTop:10, color:'red'}} onClick={()=>setShowJoinModal(false)}>Hủy</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// 2. CHI TIẾT LỚP HỌC (Bên trong 1 lớp)
function ClassDetail({ user, classroom }) {
    const [tab, setTab] = useState('stream'); // stream | classwork | people
    const [announcements, setAnns] = useState([]);
    const [assignments, setAsms] = useState([]);
    
    // State cho GV tạo mới
    const [newAnn, setNewAnn] = useState("");
    const [newAsm, setNewAsm] = useState({ title: '', desc: '' });

    useEffect(() => { loadData(); }, [classroom]);

    const loadData = async () => {
        const annRes = await axios.get(`${API_URL}/classes/${classroom._id}/announcements`);
        setAnns(annRes.data);
        const asmRes = await axios.get(`${API_URL}/classes/${classroom._id}/assignments`);
        setAsms(asmRes.data);
    };

    const handlePostAnn = async () => {
        if(!newAnn) return;
        await axios.post(`${API_URL}/announcements`, { classId: classroom._id, teacherId: user._id, content: newAnn });
        setNewAnn(""); loadData();
    };

    const handlePostAsm = async () => {
        if(!newAsm.title) return;
        await axios.post(`${API_URL}/assignments`, { classId: classroom._id, ...newAsm, description: newAsm.desc });
        setNewAsm({title:'', desc:''}); alert("Đã giao bài!"); loadData();
    };

    return (
        <div>
            {/* Header Lớp */}
            <div className="welcome-banner" style={{background:'#e0e7ff', borderColor:'#6366f1'}}>
                <h1 style={{color:'#4338ca'}}>{classroom.name}</h1>
                <p style={{color:'#3730a3'}}>{classroom.description} | Mã lớp: <b>{classroom.code}</b></p>
            </div>

            {/* Menu Tab */}
            <div className="auth-tabs" style={{marginBottom:20}}>
                <div className={`auth-tab ${tab==='stream'?'active':''}`} onClick={()=>setTab('stream')}>Bảng tin</div>
                <div className={`auth-tab ${tab==='classwork'?'active':''}`} onClick={()=>setTab('classwork')}>Bài tập</div>
                {user.role === 'TEACHER' && <div className={`auth-tab ${tab==='grades'?'active':''}`} onClick={()=>setTab('grades')}>Chấm điểm</div>}
            </div>

            {/* TAB 1: BẢNG TIN (Thông báo) */}
            {tab === 'stream' && (
                <div>
                    {user.role === 'TEACHER' && (
                        <div className="course-card">
                            <textarea className="form-input" placeholder="Thông báo gì đó cho lớp..." value={newAnn} onChange={e=>setNewAnn(e.target.value)} rows={3}></textarea>
                            <button className="btn-primary" onClick={handlePostAnn} style={{width:'auto'}}>Đăng tin</button>
                        </div>
                    )}
                    {announcements.map(ann => (
                        <div key={ann._id} className="course-card" style={{borderLeft:'4px solid orange'}}>
                            <div style={{fontWeight:700, fontSize:13}}>{ann.teacherId?.fullName} <span style={{fontWeight:400, color:'gray', fontSize:11}}>{new Date(ann.createdAt).toLocaleString()}</span></div>
                            <p style={{marginTop:5}}>{ann.content}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB 2: BÀI TẬP */}
            {tab === 'classwork' && (
                <div>
                    {user.role === 'TEACHER' && (
                        <div className="course-card">
                            <h4>➕ Giao bài tập mới</h4>
                            <input className="form-input" placeholder="Tiêu đề bài tập" value={newAsm.title} onChange={e=>setNewAsm({...newAsm, title: e.target.value})} />
                            <textarea className="form-input" placeholder="Hướng dẫn làm bài..." value={newAsm.desc} onChange={e=>setNewAsm({...newAsm, desc: e.target.value})}></textarea>
                            <button className="btn-primary" onClick={handlePostAsm}>Giao bài</button>
                        </div>
                    )}
                    
                    {/* Danh sách bài tập */}
                    <div className="card-grid">
                        {assignments.map(asm => (
                            <div key={asm._id} className="course-card">
                                <h3>{asm.title}</h3>
                                <p style={{fontSize:12, color:'gray'}}>{asm.description}</p>
                                {user.role === 'STUDENT' && <StudentSubmitArea user={user} assignment={asm} classId={classroom._id} />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: CHẤM ĐIỂM (Chỉ GV) */}
            {tab === 'grades' && user.role === 'TEACHER' && <TeacherGrading classId={classroom._id} />}
        </div>
    );
}

// Component con: Khu vực nộp bài của HS
function StudentSubmitArea({ user, assignment, classId }) {
    const [submission, setSubmission] = useState(null);
    useEffect(() => { 
        axios.get(`${API_URL}/my-submissions?studentId=${user._id}&classId=${classId}`).then(res => {
            const sub = res.data.find(s => s.assignmentId?._id === assignment._id);
            setSubmission(sub);
        });
    }, [assignment]);

    const handleUpload = async (file) => {
        if(!file) return;
        const formData = new FormData(); formData.append("file", file); formData.append("upload_preset", UPLOAD_PRESET);
        try {
            const cloudRes = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, formData);
            await axios.post(`${API_URL}/submissions`, { classId, assignmentId: assignment._id, studentId: user._id, studentName: user.fullName, imageUrl: cloudRes.data.secure_url });
            alert("Nộp thành công!"); window.location.reload(); // Reload nhanh để cập nhật
        } catch(e) { alert("Lỗi upload"); }
    };

    if (submission) {
        return (
            <div style={{marginTop:10, padding:10, background:'#f0fdf4', borderRadius:8}}>
                <span className="tag tag-green">Đã nộp: {new Date(submission.submittedAt).toLocaleDateString()}</span>
                {submission.grade ? <div style={{fontWeight:700, marginTop:5, color:'red'}}>Điểm: {submission.grade}</div> : <div style={{fontSize:11, color:'gray'}}>Chờ chấm</div>}
            </div>
        );
    }
    return <label className="btn-upload" style={{marginTop:10}}>+ Nộp bài <input type="file" hidden onChange={e=>handleUpload(e.target.files[0])} /></label>;
}

// Component con: Khu vực chấm bài của GV
function TeacherGrading({ classId }) {
    const [submissions, setSubmissions] = useState([]);
    useEffect(() => { axios.get(`${API_URL}/classes/${classId}/submissions`).then(