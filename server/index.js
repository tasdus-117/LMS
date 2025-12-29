const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms_demo')
  .then(() => {
    console.log('Đã kết nối MongoDB');
    createDefaultAdmin(); // Tự động tạo Admin
  })
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

const AssignmentSchema = new mongoose.Schema({
  title: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});
const Assignment = mongoose.model('Assignment', AssignmentSchema);

const SubmissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentName: String,
  imageUrl: String,
  grade: { type: Number, default: null },
  feedback: { type: String, default: "" },
  submittedAt: { type: Date, default: Date.now }
});
const Submission = mongoose.model('Submission', SubmissionSchema);

// --- HÀM TẠO ADMIN MẶC ĐỊNH ---
async function createDefaultAdmin() {
    const adminExists = await User.findOne({ role: 'ADMIN' });
    if (!adminExists) {
        await User.create({
            username: 'admin',
            password: 'Hoangtu11072005', // Mật khẩu mặc định
            fullName: 'Quản Trị Viên',
            role: 'ADMIN'
        });
        console.log("--> Đã tạo tài khoản ADMIN mặc định: admin / 123");
    }
}

// --- API ROUTES ---

// 1. LOGIN
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) res.json(user);
  else res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
});

// 2. REGISTER (CHỈ CHO PHÉP ĐĂNG KÝ HỌC SINH - PUBLIC)
app.post('/api/register', async (req, res) => {
  try {
    // Mặc định luôn là STUDENT, không cho phép gửi role lên để hack
    const newUser = { ...req.body, role: 'STUDENT' };
    const user = await User.create(newUser);
    res.json(user);
  } catch (e) { res.status(500).json({ message: "Tên đăng nhập đã tồn tại" }); }
});

// 3. CREATE TEACHER (CHỈ DÀNH CHO ADMIN)
app.post('/api/admin/create-teacher', async (req, res) => {
    try {
        const newUser = { ...req.body, role: 'TEACHER' };
        const user = await User.create(newUser);
        res.json(user);
    } catch (e) { res.status(500).json({ message: "Lỗi tạo giáo viên" }); }
});

// 4. GET USERS (Lấy danh sách HS hoặc GV)
app.get('/api/users', async (req, res) => {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users);
});

// 5. DELETE USER (Xóa tài khoản)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        // Xóa sạch dữ liệu liên quan
        await Submission.deleteMany({ studentId: id });
        res.json({ message: "Đã xóa user" });
    } catch (e) { res.status(500).json({ message: "Lỗi" }); }
});

// --- CÁC API CŨ (ASSIGNMENT/SUBMISSION) GIỮ NGUYÊN ---
app.post('/api/assignments', async (req, res) => {
  const asm = await Assignment.create(req.body);
  res.json(asm);
});
app.delete('/api/assignments/:id', async (req, res) => {
    await Submission.deleteMany({ assignmentId: req.params.id });
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
});
app.get('/api/assignments', async (req, res) => {
  const asms = await Assignment.find().sort({ createdAt: -1 });
  res.json(asms);
});
app.get('/api/assignments/:id/submissions', async (req, res) => {
  const subs = await Submission.find({ assignmentId: req.params.id });
  res.json(subs);
});
app.get('/api/all-submissions', async (req, res) => {
    const all = await Submission.find().populate('studentId', 'fullName').populate('assignmentId', 'title');
    res.json(all);
});
app.post('/api/submissions', async (req, res) => {
  const sub = await Submission.create(req.body);
  res.json(sub);
});
app.put('/api/submissions/:id', async (req, res) => {
  const sub = await Submission.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(sub);
});
app.get('/api/my-submissions', async (req, res) => {
  const subs = await Submission.find({ studentId: req.query.studentId }).populate('assignmentId', 'title');
  res.json(subs);
});
app.put('/api/users/:id/reset-password', async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        
        // Cập nhật mật khẩu mới
        await User.findByIdAndUpdate(id, { password: newPassword });
        
        res.json({ message: "Đã đổi mật khẩu thành công" });
    } catch (e) {
        res.status(500).json({ message: "Lỗi server" });
    }
});
app.listen(5000, () => console.log('Server running on port 5000'));