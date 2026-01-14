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
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentName: String,
  
  // 👇 THAY ĐỔI Ở ĐÂY: Chuyển từ String sang mảng String
  imageUrls: [{ type: String }], 
  
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
        const { range } = req.query; // Nhận tham số range: 'day', 'month', 'semester', 'all'
        
        // 1. Xác định mốc thời gian bắt đầu (startDate)
        let startDate = null;
        const now = new Date();
        
        if (range === 'day') {
            // Lấy từ 00:00 sáng hôm nay
            startDate = new Date(now.setHours(0, 0, 0, 0));
        } else if (range === 'month') {
            // Lấy từ ngày mùng 1 của tháng này
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (range === 'semester') {
            // Lấy từ 6 tháng trước
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 6);
        }
        // Nếu range === 'all' hoặc không có range thì startDate = null (Lấy tất cả)

        // 2. Tạo bộ lọc
        const filter = { grade: { $ne: null } }; // Chỉ lấy bài đã có điểm
        
        if (startDate) {
            filter.submittedAt = { $gte: startDate }; // $gte: Lớn hơn hoặc bằng ngày bắt đầu
        }

        // 3. Truy vấn Database
        const submissions = await Submission.find(filter).populate('studentId', 'fullName');
        
        // 4. Tính toán Group by Student (Giống code cũ)
        const stats = {};
        submissions.forEach(sub => {
            if (!sub.studentId) return;
            const sId = sub.studentId._id;
            if (!stats[sId]) {
                stats[sId] = { _id: sId, name: sub.studentId.fullName, totalScore: 0, count: 0 };
            }
            stats[sId].totalScore += sub.grade;
            stats[sId].count += 1;
        });

        // 5. Chuyển thành mảng và tính điểm TB
        const result = Object.values(stats).map(s => ({
            ...s,
            avg: (s.totalScore / s.count).toFixed(2)
        }));

        // 6. Sắp xếp (Điểm cao nhất -> Số bài nhiều nhất)
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
app.get('/api/classes/:id/members', async (req, res) => {
    try {
        const cls = await Classroom.findById(req.params.id).populate('studentIds', 'fullName username');
        res.json(cls ? cls.studentIds : []);
    } catch (e) { res.status(500).json([]); }
});

// 2. API Xóa học sinh khỏi lớp (Kick)
app.put('/api/classes/:classId/remove-student', async (req, res) => {
    try {
        const { studentId } = req.body;
        await Classroom.findByIdAndUpdate(req.params.classId, {
            $pull: { studentIds: studentId }
        });
        res.json({ message: "Đã xóa học sinh khỏi lớp" });
    } catch (e) { res.status(500).json({ message: "Lỗi" }); }
});
app.get('/api/export-csv', async (req, res) => {
    try {
        const submissions = await Submission.find()
            .populate('studentId', 'fullName username')
            .populate('assignmentId', 'title')
            .populate('classId', 'name');

        // Thêm BOM \uFEFF để Excel mở tiếng Việt không bị lỗi font
        let csv = '\uFEFFHọc sinh,Tên đăng nhập,Lớp,Bài tập,Điểm,Nhận xét,Ngày nộp\n';

        submissions.forEach(sub => {
            if (!sub.studentId) return;
            const row = [
                `"${sub.studentId.fullName}"`,
                `"${sub.studentId.username}"`,
                `"${sub.classId?.name || 'N/A'}"`,
                `"${sub.assignmentId?.title || 'Đã xóa'}"`,
                `"${sub.grade ?? 'Chưa chấm'}"`,
                `"${sub.feedback || ''}"`,
                `"${new Date(sub.submittedAt).toLocaleDateString()}"`
            ];
            csv += row.join(',') + '\n';
        });

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="bang_diem.csv"');
        res.send(csv);
    } catch (e) { res.status(500).send("Lỗi xuất file"); }
});

// 2. API RESET BẢNG XẾP HẠNG (Xóa điểm + Bài tập, Giữ lại User + Lớp)
app.delete('/api/reset-leaderboard', async (req, res) => {
    try {
        // Xóa sạch bài nộp (Điểm số về 0)
        await Submission.deleteMany({});
        
        // Tùy chọn: Xóa luôn bài tập cũ để bắt đầu kỳ mới sạch sẽ
        await Assignment.deleteMany({});
        
        // Tùy chọn: Xóa thông báo cũ
        await Announcement.deleteMany({});

        res.json({ message: "Đã reset bảng xếp hạng và dữ liệu học tập!" });
    } catch (e) { res.status(500).json({ message: "Lỗi server" }); }
});
// --- THÊM VÀO server/index.js ---

// API: Giáo viên thêm học sinh vào lớp bằng Username
app.post('/api/classes/:classId/add-student-by-username', async (req, res) => {
    try {
        const { username } = req.body;
        // 1. Tìm học sinh theo username
        const student = await User.findOne({ username, role: 'STUDENT' });
        if (!student) return res.status(404).json({ message: "Không tìm thấy học sinh này!" });

        // 2. Tìm lớp
        const cls = await Classroom.findById(req.params.classId);
        if (!cls) return res.status(404).json({ message: "Lớp không tồn tại" });

        // 3. Kiểm tra xem đã có trong lớp chưa
        if (cls.studentIds.includes(student._id)) {
            return res.status(400).json({ message: "Học sinh này đã có trong lớp rồi!" });
        }

        // 4. Thêm vào lớp
        cls.studentIds.push(student._id);
        await cls.save();

        res.json({ message: "Đã thêm học sinh thành công!" });
    } catch (e) {
        res.status(500).json({ message: "Lỗi server" });
    }
});
app.listen(5000, () => console.log('Server running on port 5000'));