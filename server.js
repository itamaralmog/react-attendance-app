const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// הגדרת סכימת חיילים
const attendanceSchema = new mongoose.Schema({
    date: String,
    responsible: String,
    soldiers: [
        {
            name: String,
            present: Boolean,
            comment: String
        }
    ]
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

// התחברות ל-MongoDB
mongoose.connect('mongodb://localhost:27017/attendance', { useNewUrlParser: true, useUnifiedTopology: true });

// יצירת נוכחות חדשה
app.post('/api/attendance/create', async (req, res) => {
    const { date, responsible, soldiers } = req.body;

    // בדיקה שחיילים לא נוכחים כוללים הערה
    for (let soldier of soldiers) {
        if (!soldier.present && !soldier.comment.trim()) {
            return res.status(400).json({ message: `You must provide a comment for ${soldier.name} because they are not present.` });
        }
    }

    try {
        // חיפוש את הרשימה האחרונה לפי תאריך והאחראי
        const lastAttendance = await Attendance.findOne({ responsible })
            .sort({ date: -1 });

        let newSoldiers = soldiers;

        if (lastAttendance) {
            // אם יש רשימה קודמת, מאחדים אותה עם הרשימה החדשה
            const lastSoldiers = lastAttendance.soldiers;

            // עדכון הרשימה הקודמת עם השינויים מהרשימה החדשה
            newSoldiers = lastSoldiers.map(soldier => {
                const updatedSoldier = soldiers.find(s => s.name === soldier.name);
                return updatedSoldier ? { ...soldier, ...updatedSoldier } : soldier;
            }).concat(soldiers.filter(s => !lastSoldiers.some(ls => ls.name === s.name)));
        }

        // שמירת הרשימה החדשה
        const newAttendance = new Attendance({ date, responsible, soldiers: newSoldiers });
        await newAttendance.save();
        res.status(201).json({ message: 'Attendance created successfully' });
    } catch (error) {
        console.error('Error saving attendance:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// חיפוש נוכחות לפי תאריך ושם אחראי
app.get('/api/attendance', async (req, res) => {
    const { responsible } = req.query;

    try {
        // חיפוש את הרשימה האחרונה לפי תאריך והאחראי
        const lastAttendance = await Attendance.find({ responsible })
            .sort({ date: -1 })
            .limit(1);
        
        if (lastAttendance.length > 0) {
            res.status(200).json(lastAttendance[0]);
        } else {
            res.status(404).json({ message: 'No attendance found for this responsible person' });
        }
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// הגדרת פורט והפעלת השרת
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
