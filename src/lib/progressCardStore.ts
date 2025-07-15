// This is a mock in-memory store for the progress card data.
// In a real application, this would be replaced with a proper database like Firestore.

let progressCardData: { [rollNo: string]: any } = {
  "12": {
    studentDetails: { name: "Aarav Sharma", rollNo: "12", grade: "5", division: "A", motherName: "Priya Sharma", fatherName: "Rajesh Sharma", dob: "2013-05-10", grNo: "12345", attendance: { term1: "105/110", term2: "112/120" } },
    term1: {
      scholastic: [
        { subject: "First Language", fa1: 18, fa2: 19, sa1: 35, total: 72, grade: "A2" },
        { subject: "Second Language", fa1: 17, fa2: 18, sa1: 33, total: 68, grade: "B1" },
        { subject: "Third Language", fa1: 16, fa2: 19, sa1: 36, total: 71, grade: "A2" },
        { subject: "Mathematics", fa1: 20, fa2: 20, sa1: 38, total: 78, grade: "A1" },
        { subject: "E.V.S", fa1: 19, fa2: 18, sa1: 35, total: 72, grade: "A2" },
      ],
      coScholastic: [
        { area: "Scout", grade: "A" },
        { area: "Art", grade: "A" },
        { area: "Work Experience", grade: "A" },
        { area: "Physical Education & Health", grade: "B" },
      ],
      teacherRemarks: "Aarav is a bright and attentive student. He consistently performs well in all subjects. Keep up the great work!",
    },
    term2: {
        scholastic: [
            { subject: "First Language", fa1: 19, fa2: 20, sa1: 36, total: 75, grade: "A1" },
            { subject: "Second Language", fa1: 18, fa2: 17, sa1: 34, total: 69, grade: "B1" },
            { subject: "Third Language", fa1: 18, fa2: 19, sa1: 37, total: 74, grade: "A2" },
            { subject: "Mathematics", fa1: 19, fa2: 20, sa1: 39, total: 78, grade: "A1" },
            { subject: "E.V.S", fa1: 18, fa2: 19, sa1: 36, total: 73, grade: "A2" },
        ],
        coScholastic: [
            { area: "Scout", grade: "A" },
            { area: "Art", grade: "A" },
            { area: "Work Experience", grade: "A" },
            { area: "Physical Education & Health", grade: "A" },
        ],
        teacherRemarks: "Excellent progress in Term 2. Aarav continues to be a role model for his peers.",
      },
  },
  "25": {
    studentDetails: { name: "Diya Patel", rollNo: "25", grade: "5", division: "A", motherName: "Kavita Patel", fatherName: "Suresh Patel", dob: "2013-08-22", grNo: "12368", attendance: { term1: "108/110", term2: "115/120" } },
    term1: {
      scholastic: [
        { subject: "First Language", fa1: 15, fa2: 16, sa1: 30, total: 61, grade: "B1" },
        { subject: "Second Language", fa1: 14, fa2: 15, sa1: 28, total: 57, grade: "B2" },
        { subject: "Third Language", fa1: 16, fa2: 17, sa1: 31, total: 64, grade: "B1" },
        { subject: "Mathematics", fa1: 17, fa2: 16, sa1: 32, total: 65, grade: "B1" },
        { subject: "E.V.S", fa1: 18, fa2: 17, sa1: 33, total: 68, grade: "B1" },
      ],
      coScholastic: [
        { area: "Scout", grade: "B" },
        { area: "Art", grade: "A" },
        { area: "Work Experience", grade: "B" },
        { area: "Physical Education & Health", grade: "B" },
      ],
      teacherRemarks: "Diya is a sincere and hardworking student. She has shown consistent improvement throughout the term.",
    },
     term2: {
        scholastic: [
            { subject: "First Language", fa1: 17, fa2: 18, sa1: 33, total: 68, grade: "B1" },
            { subject: "Second Language", fa1: 16, fa2: 17, sa1: 30, total: 63, grade: "B1" },
            { subject: "Third Language", fa1: 18, fa2: 18, sa1: 34, total: 70, grade: "A2" },
            { subject: "Mathematics", fa1: 19, fa2: 18, sa1: 35, total: 72, grade: "A2" },
            { subject: "E.V.S", fa1: 19, fa2: 18, sa1: 36, total: 73, grade: "A2" },
        ],
        coScholastic: [
            { area: "Scout", grade: "A" },
            { area: "Art", grade: "A" },
            { area: "Work Experience", grade: "A" },
            { area: "Physical Education & Health", grade: "A" },
        ],
        teacherRemarks: "Wonderful improvement in all subjects. Diya's confidence has grown immensely. Keep it up!",
    },
  },
};

export const getProgressCardData = () => {
  return progressCardData;
};

export const setProgressCardData = (newData: { [rollNo: string]: any }) => {
  progressCardData = newData;
};
