const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms_demo')
  .then(() => { console.log('Đã kết nối MongoDB'); createDefaultAdmin(); })
  .catch(err => console.error('Lỗi kết nối DB:', err));

// --- MODELS MỚI & CẬP NHẬT ---
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'TEACHER', 'STUDENT'], required: true },
  fullName: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// 1. CLASSROOM (MỚI)
const ClassroomSchema = new mongoose.Schema({
    name: String,
    description: String,
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    code: { type: String, unique: true }, // Mã lớp (VD: A1B2C)
    createdAt: { type: Date, default: Date.now }
});
const Classroom = mongoose.model('Classroom', ClassroomSchema);

// 2. ANNOUNCEMENT (MỚI - Thông báo)
const AnnouncementSchema = new mongoose.Schema({
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: { type: Date, default: Date.now }
});
const Announcement = mongoose.model('Announcement', AnnouncementSchema);

// 3. ASSIGNMENT (CẬP NHẬT - Gắn với Class)
const AssignmentSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' }, 
  title: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});
const Assignment = mongoose.model('Assignment', AssignmentSchema);

const SubmissionSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' }, // Để dễ lọc
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentName: String,
  imageUrl: String,
  grade: { type: Number, default: null },
  feedback: { type: String, default: "" },
  submittedAt: { type: Date, default: Date.now }
});
const Submission = mongoose.model('Submission', SubmissionSchema);

// --- HÀM TẠO ADMIN ---
async function createDefaultAdmin() {
    if (!await User.findOne({ role: 'ADMIN' })) {
        await User.create({ username: 'admin', password: '123', fullName: 'Quản Trị Viên', role: 'ADMIN' });
    }
}

// --- API ROUTES ---

// AUTH & USER (Giữ nguyên)
app.post('/api/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username, password: req.body.password });
  user ? res.json(user) : res.status(401).json({ message: "Sai thông tin" });
});
app.post('/api/register', async (req, res) => {
  try { res.json(await User.create({ ...req.body, role: 'STUDENT' })); } 
  catch (e) { res.status(500).json({ message: "Trùng user" }); }
});
app.post('/api/admin/create-teacher', async (req, res) => {
    try { res.json(await User.create({ ...req.body, role: 'TEACHER' })); } 
    catch (e) { res.status(500).json({ message: "Lỗi" }); }
});
app.get('/api/users', async (req, res) => {
    res.json(await User.find(req.query.role ? { role: req.query.role } : {}).sort({ createdAt: -1 }));
});
app.delete('/api/users/:id', async (req, res) => {
    await User.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" });
});
app.put('/api/users/:id/reset-password', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { password: req.body.newPassword }); res.json({ msg: "Success" });
});

// --- API CLASSROOM (MỚI) ---
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

// --- API DETAIL CLASS (Announce & Assignment) ---
app.get('/api/classes/:id/details', async (req, res) => {
    const [anns, asms] = await Promise.all([
        Announcement.find({ classId: req.params.id }).sort({ createdAt: -1 }).populate('teacherId', 'fullName'),
        Assignment.find({ classId: req.params.id }).sort({ createdAt: -1 })
    ]);
    res.json({ anns, asms });
});
app.post('/api/announcements', async (req, res) => { res.json(await Announcement.create(req.body)); });

// --- ASSIGNMENTS & SUBMISSIONS (Cập nhật logic Class) ---
app.post('/api/assignments', async (req, res) => { res.json(await Assignment.create(req.body)); });
app.delete('/api/assignments/:id', async(req, res) => { 
    await Assignment.findByIdAndDelete(req.params.id); res.json({msg:"Deleted"}); 
});
// Lấy submission theo lớp (cho GV chấm)
app.get('/api/classes/:classId/submissions', async (req, res) => {
    res.json(await Submission.find({ classId: req.params.classId }).populate('assignmentId', 'title'));
});
// Lấy submission của HS (theo lớp)
app.get('/api/my-submissions', async (req, res) => {
    const { studentId, classId } = req.query;
    const filter = { studentId };
    if(classId) filter.classId = classId;
    res.json(await Submission.find(filter).populate('assignmentId', 'title'));
});
app.post('/api/submissions', async (req, res) => { res.json(await Submission.create(req.body)); });
app.put('/api/submissions/:id', async (req, res) => { res.json(await Submission.findByIdAndUpdate(req.params.id, req.body, { new: true })); });

// API Thống kê toàn hệ thống (Giữ lại cho Dashboard cũ nếu cần)
app.get('/api/all-submissions', async (req, res) => { res.json(await Submission.find().populate('studentId', 'fullName')); });
app.get('/api/teacher/stats', async (req, res) => {
    try {
        // 1. Lấy tất cả bài nộp đã có điểm
        const submissions = await Submission.find({ grade: { $ne: null } }).populate('studentId', 'fullName');
        
        // 2. Tính toán thủ công (Group by Student)
        const stats = {};
        
        submissions.forEach(sub => {
            if (!sub.studentId) return; // Bỏ qua nếu user bị xóa
            const sId = sub.studentId._id;
            const sName = sub.studentId.fullName;

            if (!stats[sId]) {
                stats[sId] = { 
                    _id: sId, 
                    name: sName, 
                    totalScore: 0, 
                    count: 0 
                };
            }
            stats[sId].totalScore += sub.grade;
            stats[sId].count += 1;
        });

        // 3. Chuyển thành mảng và tính điểm TB
        const result = Object.values(stats).map(s => ({
            ...s,
            avg: (s.totalScore / s.count).toFixed(2) // Làm tròn 2 số thập phân
        }));

        // 4. Sắp xếp: Điểm TB cao xếp trước. Nếu bằng điểm thì ai làm nhiều bài hơn xếp trước.
        result.sort((a, b) => b.avg - a.avg || b.count - a.count);

        res.json(result);
    } catch (e) {
        res.status(500).json({ message: "Lỗi thống kê" });
    }
});
app.get('/api/classes/:id/members', async (req, res) => {
    try {
        const cls = await Classroom.findById(req.params.id).populate('studentIds', 'fullName username');
        if (!cls) return res.status(404).json({ message: "Không tìm thấy lớp" });
        res.json(cls.studentIds); // Trả về danh sách học sinh
    } catch (e) {
        res.status(500).json({ message: "Lỗi server" });
    }
});

// 2. API Xóa bài tập (Và xóa luôn các bài nộp liên quan)
app.delete('/api/assignments/:id', async (req, res) => {
    try {
        await Assignment.findByIdAndDelete(req.params.id);
        // Xóa luôn các bài nộp của bài tập này để sạch database
        await Submission.deleteMany({ assignmentId: req.params.id });
        res.json({ message: "Đã xóa bài tập" });
    } catch (e) {
        res.status(500).json({ message: "Lỗi xóa bài" });
    }
});
app.listen(5000, () => console.log('Server running on port 5000'));