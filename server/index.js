const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// KẾT NỐI MONGODB (Giữ nguyên link của bạn hoặc dùng biến môi trường)
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms_demo')
  .then(() => console.log('Đã kết nối MongoDB'))
  .catch(err => console.error('Lỗi kết nối DB:', err));

// --- MODELS MỚI ---
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'TEACHER', 'STUDENT'], required: true },
  fullName: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// 1. CLASSROOM (LỚP HỌC)
const ClassroomSchema = new mongoose.Schema({
    name: String,
    description: String,
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Danh sách HS trong lớp
    code: { type: String, unique: true }, // Mã lớp để join
    createdAt: { type: Date, default: Date.now }
});
const Classroom = mongoose.model('Classroom', ClassroomSchema);

// 2. ANNOUNCEMENT (THÔNG BÁO)
const AnnouncementSchema = new mongoose.Schema({
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: { type: Date, default: Date.now }
});
const Announcement = mongoose.model('Announcement', AnnouncementSchema);

// 3. ASSIGNMENT (CẬP NHẬT: GẮN VỚI CLASS)
const AssignmentSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' }, // Bài tập thuộc lớp nào
  title: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});
const Assignment = mongoose.model('Assignment', AssignmentSchema);

const SubmissionSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' }, // Nộp cho lớp nào
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

// AUTH & USERS (GIỮ NGUYÊN)
async function createDefaultAdmin() {
    const adminExists = await User.findOne({ role: 'ADMIN' });
    if (!adminExists) await User.create({ username: 'admin', password: '123', fullName: 'Quản Trị Viên', role: 'ADMIN' });
}
createDefaultAdmin();

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) res.json(user); else res.status(401).json({ message: "Sai thông tin" });
});
app.post('/api/register', async (req, res) => {
  try { const user = await User.create({ ...req.body, role: 'STUDENT' }); res.json(user); } 
  catch (e) { res.status(500).json({ message: "Trùng user" }); }
});
app.post('/api/admin/create-teacher', async (req, res) => {
    try { const user = await User.create({ ...req.body, role: 'TEACHER' }); res.json(user); } 
    catch (e) { res.status(500).json({ message: "Lỗi" }); }
});
app.get('/api/users', async (req, res) => {
    const filter = req.query.role ? { role: req.query.role } : {};
    res.json(await User.find(filter));
});
app.delete('/api/users/:id', async (req, res) => {
    await User.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" });
});
app.put('/api/users/:id/reset-password', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { password: req.body.newPassword }); res.json({ msg: "Success" });
});

// --- API LỚP HỌC (NEW) ---

// Lấy danh sách lớp của user
app.get('/api/my-classes', async (req, res) => {
    const { userId, role } = req.query;
    let classes;
    if (role === 'TEACHER') {
        classes = await Classroom.find({ teacherId: userId });
    } else {
        classes = await Classroom.find({ studentIds: userId }).populate('teacherId', 'fullName');
    }
    res.json(classes);
});

// Tạo lớp mới (Teacher)
app.post('/api/classes', async (req, res) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase(); // Tạo mã lớp ngẫu nhiên
    const newClass = await Classroom.create({ ...req.body, code });
    res.json(newClass);
});

// Học sinh tham gia lớp bằng mã
app.post('/api/classes/join', async (req, res) => {
    const { code, studentId } = req.body;
    const classroom = await Classroom.findOne({ code });
    if (!classroom) return res.status(404).json({ message: "Mã lớp không đúng" });
    
    if (!classroom.studentIds.includes(studentId)) {
        classroom.studentIds.push(studentId);
        await classroom.save();
    }
    res.json(classroom);
});

// --- API THÔNG BÁO (NEW) ---
app.get('/api/classes/:classId/announcements', async (req, res) => {
    const anns = await Announcement.find({ classId: req.params.classId }).sort({ createdAt: -1 }).populate('teacherId', 'fullName');
    res.json(anns);
});
app.post('/api/announcements', async (req, res) => {
    const ann = await Announcement.create(req.body);
    res.json(ann);
});

// --- API BÀI TẬP & NỘP BÀI (CẬP NHẬT THEO CLASS ID) ---
app.get('/api/classes/:classId/assignments', async (req, res) => {
    const asms = await Assignment.find({ classId: req.params.classId }).sort({ createdAt: -1 });
    res.json(asms);
});
app.post('/api/assignments', async (req, res) => { // Tạo bài tập cho lớp
    const asm = await Assignment.create(req.body);
    res.json(asm);
});
app.delete('/api/assignments/:id', async(req, res) => {
    await Assignment.findByIdAndDelete(req.params.id); res.json({msg: "Deleted"});
});

// Submission
app.get('/api/classes/:classId/submissions', async (req, res) => { // GV lấy bài nộp của cả lớp
    const subs = await Submission.find({ classId: req.params.classId }).populate('assignmentId', 'title');
    res.json(subs);
});
app.get('/api/my-submissions', async (req, res) => { // HS lấy bài mình đã nộp trong lớp cụ thể
    const { studentId, classId } = req.query;
    const filter = { studentId };
    if (classId) filter.classId = classId;
    const subs = await Submission.find(filter).populate('assignmentId', 'title');
    res.json(subs);
});
app.post('/api/submissions', async (req, res) => {
    const sub = await Submission.create(req.body);
    res.json(sub);
});
app.put('/api/submissions/:id', async (req, res) => {
    const sub = await Submission.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(sub);
});

app.listen(5000, () => console.log('Server running on port 5000'));