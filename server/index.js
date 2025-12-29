const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// KẾT NỐI DB (Giữ nguyên)
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms_demo')
  .then(() => console.log('Đã kết nối MongoDB'))
  .catch(err => console.error('Lỗi kết nối DB:', err));

// --- MODELS ---
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'TEACHER', 'STUDENT'], required: true },
  fullName: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// MỚI: Model Lớp học
const ClassroomSchema = new mongoose.Schema({
    name: String,
    description: String,
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    code: { type: String, unique: true },
    createdAt: { type: Date, default: Date.now }
});
const Classroom = mongoose.model('Classroom', ClassroomSchema);

// MỚI: Model Thông báo
const AnnouncementSchema = new mongoose.Schema({
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: { type: Date, default: Date.now }
});
const Announcement = mongoose.model('Announcement', AnnouncementSchema);

// CẬP NHẬT: Bài tập gắn với Lớp
const AssignmentSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' }, 
  title: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});
const Assignment = mongoose.model('Assignment', AssignmentSchema);

// CẬP NHẬT: Bài nộp gắn với Lớp
const SubmissionSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentName: String,
  imageUrl: String,
  grade: { type: Number, default: null },
  feedback: { type: String, default: "" },
  submittedAt: { type: Date, default: Date.now }
});
const Submission = mongoose.model('Submission', SubmissionSchema);

// --- API ROUTES ---

// 1. AUTH & ADMIN (GIỮ NGUYÊN TÍNH NĂNG CŨ)
async function createDefaultAdmin() {
    if (!await User.findOne({ role: 'ADMIN' })) 
        await User.create({ username: 'admin', password: '123', fullName: 'Quản Trị Viên', role: 'ADMIN' });
}
createDefaultAdmin();

app.post('/api/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username, password: req.body.password });
  user ? res.json(user) : res.status(401).json({ message: "Sai thông tin" });
});
app.post('/api/register', async (req, res) => { // Chỉ tạo Student
  try { res.json(await User.create({ ...req.body, role: 'STUDENT' })); } catch (e) { res.status(500).json({ message: "Lỗi" }); }
});
app.post('/api/admin/create-teacher', async (req, res) => { // Admin tạo Teacher
    try { res.json(await User.create({ ...req.body, role: 'TEACHER' })); } catch (e) { res.status(500).json({ message: "Lỗi" }); }
});
app.get('/api/users', async (req, res) => { // Lấy list user
    res.json(await User.find(req.query.role ? { role: req.query.role } : {}).sort({createdAt: -1}));
});
app.delete('/api/users/:id', async (req, res) => { // Xóa user
    await User.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" });
});
app.put('/api/users/:id/reset-password', async (req, res) => { // Đổi pass
    await User.findByIdAndUpdate(req.params.id, { password: req.body.newPassword }); res.json({ msg: "Success" });
});

// 2. CLASSROOM API (MỚI)
app.get('/api/my-classes', async (req, res) => {
    const { userId, role } = req.query;
    if (role === 'TEACHER') res.json(await Classroom.find({ teacherId: userId }));
    else res.json(await Classroom.find({ studentIds: userId }).populate('teacherId', 'fullName'));
});
app.post('/api/classes', async (req, res) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    res.json(await Classroom.create({ ...req.body, code }));
});
app.post('/api/classes/join', async (req, res) => {
    const { code, studentId } = req.body;
    const cls = await Classroom.findOne({ code });
    if (!cls) return res.status(404).json({ message: "Sai mã lớp" });
    if (!cls.studentIds.includes(studentId)) { cls.studentIds.push(studentId); await cls.save(); }
    res.json(cls);
});

// 3. ANNOUNCEMENT API (MỚI)
app.get('/api/classes/:classId/announcements', async (req, res) => {
    res.json(await Announcement.find({ classId: req.params.classId }).sort({ createdAt: -1 }).populate('teacherId', 'fullName'));
});
app.post('/api/announcements', async (req, res) => { res.json(await Announcement.create(req.body)); });

// 4. ASSIGNMENT & SUBMISSION (CẬP NHẬT LOGIC CŨ VÀO MỚI)
app.get('/api/classes/:classId/assignments', async (req, res) => {
    res.json(await Assignment.find({ classId: req.params.classId }).sort({ createdAt: -1 }));
});
app.post('/api/assignments', async (req, res) => { res.json(await Assignment.create(req.body)); });
app.delete('/api/assignments/:id', async(req, res) => { 
    await Assignment.findByIdAndDelete(req.params.id); await Submission.deleteMany({assignmentId: req.params.id}); res.json({msg: "Deleted"});
});

// Lấy submission theo lớp (cho GV chấm điểm)
app.get('/api/classes/:classId/submissions', async (req, res) => {
    res.json(await Submission.find({ classId: req.params.classId }).populate('assignmentId', 'title'));
});
// Lấy submission của HS (để hiện đã nộp hay chưa)
app.get('/api/my-submissions', async (req, res) => {
    const { studentId, classId } = req.query;
    const filter = { studentId };
    if (classId) filter.classId = classId;
    res.json(await Submission.find(filter).populate('assignmentId', 'title'));
});
// API lấy TẤT CẢ điểm (Dùng cho Bảng Xếp Hạng Global)
app.get('/api/all-submissions', async (req, res) => {
    res.json(await Submission.find().populate('studentId', 'fullName'));
});

app.post('/api/submissions', async (req, res) => { res.json(await Submission.create(req.body)); });
app.put('/api/submissions/:id', async (req, res) => { res.json(await Submission.findByIdAndUpdate(req.params.id, req.body, { new: true })); });

app.listen(5000, () => console.log('Server running on port 5000'));