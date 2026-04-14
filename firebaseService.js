import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// 1. Cấu hình Firebase từ thông tin bạn cung cấp
const firebaseConfig = {
    apiKey: "AIzaSyAwF1IExjyp3-0nagkDyAoS1N0h80eQBfk",
    authDomain: "phongthi.firebaseapp.com",
    projectId: "phongthi",
    storageBucket: "phongthi.firebasestorage.app",
    messagingSenderId: "209633917511",
    appId: "1:209633917511:web:83853a50e34160f0dc4f62",
    measurementId: "G-JGMR1F25VE"
};

// Khởi tạo
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();

// --- CÁC HÀM THAY THẾ LOGIC LƯU TRỮ CŨ ---

/**
 * THAY THẾ: Hàm load() cũ
 * Lấy danh sách đề thi thời gian thực từ Cloud thay vì LocalStorage
 */
export const subscribeExams = (callback: (exams: any[]) => void) => {
    return db.collection("exams").onSnapshot((snapshot) => {
        const exams = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(exams);
    });
};

/**
 * THAY THẾ: Hàm updateProfile() cũ
 * Lưu thẳng lên Firestore
 */
export const updateCloudProfile = async (userId: string, newName: string) => {
    try {
        await db.collection("users").doc(userId).update({
            name: newName
        });
        console.log("Cập nhật profile thành công");
    } catch (error) {
        console.error("Lỗi cập nhật profile:", error);
    }
};

/**
 * THAY THẾ: Logic "Up đề"
 * Đẩy đề thi mới lên Cloud để các máy khác có thể thấy
 */
export const uploadExam = async (examData: any) => {
    try {
        const docRef = await db.collection("exams").add({
            ...examData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Lỗi khi up đề:", error);
    }
};

/**
 * THAY THẾ: Logic lưu kết quả nộp bài
 * Đồng bộ đồng thời: Lưu bài nộp và tăng số lượng bài trong Room (+1)
 */
export const submitExamToCloud = async (
    userId: string, 
    examId: string, 
    roomId: string, 
    score: number
) => {
    const batch = db.batch();

    // 1. Tạo bản ghi bài nộp (Submissions)
    const subRef = db.collection("submissions").doc();
    batch.set(subRef, {
        studentId: userId,
        examId: examId,
        score: score,
        status: "completed",
        submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Cập nhật phòng thi (Rooms) - Khớp với Security Rules của bạn
    const roomRef = db.collection("rooms").doc(roomId);
    batch.update(roomRef, {
        submittedCount: firebase.firestore.FieldValue.increment(1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    try {
        await batch.commit();
        alert("Nộp bài thành công và đã lưu lên hệ thống!");
    } catch (error) {
        console.error("Lỗi nộp bài:", error);
        alert("Có lỗi xảy ra khi nộp bài!");
    }
};
