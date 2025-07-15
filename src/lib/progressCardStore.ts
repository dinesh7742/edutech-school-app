
// This is a mock in-memory store for the progress card data.
// In a real application, this would be replaced with a proper database like Firestore.

let progressCardData: { [rollNo: string]: any } = {
  "12": {
    studentDetails: { name: "Aarav Sharma", rollNo: "12", gender: "Male", grade: "5", division: "A", attendance: { term1: "105/110", term2: "112/120" } },
    term1: {
      scholastic: [
        { subject: "First Language", formative: 48, summative: 31, total: 79, grade: "B1" },
        { subject: "Second Language", formative: 49, summative: 25, total: 74, grade: "B1" },
        { subject: "Third Language", formative: 45, summative: 30, total: 75, grade: "B1" },
        { subject: "Math", formative: 51, summative: 36, total: 87, grade: "A2" },
        { subject: "EVS", formative: 55, summative: 34, total: 89, grade: "A2" },
      ],
      coScholastic: [
        { area: "Scout", grade: "A1" },
        { area: "Art", grade: "A2" },
        { area: "Work Experience", grade: "A2" },
        { area: "Physical Ed Health", grade: "A2" },
      ],
      teacherRemarks: "Aarav is a bright and attentive student. He consistently performs well in all subjects. Keep up the great work!",
    },
    term2: {
        scholastic: [
          { subject: "First Language", formative: 50, summative: 35, total: 85, grade: "A2" },
          { subject: "Second Language", formative: 52, summative: 28, total: 80, grade: "B1" },
          { subject: "Third Language", formative: 48, summative: 32, total: 80, grade: "B1" },
          { subject: "Math", formative: 55, summative: 38, total: 93, grade: "A1" },
          { subject: "EVS", formative: 58, summative: 36, total: 94, grade: "A1" },
        ],
        coScholastic: [
          { area: "Scout", grade: "A1" },
          { area: "Art", grade: "A1" },
          { area: "Work Experience", grade: "A2" },
          { area: "Physical Ed Health", grade: "A1" },
        ],
        teacherRemarks: "Excellent progress in Term 2. Aarav continues to be a role model for his peers.",
      },
  },
  "25": {
    studentDetails: { name: "Diya Patel", rollNo: "25", gender: "Female", grade: "5", division: "A", attendance: { term1: "108/110", term2: "115/120" } },
    term1: {
      scholastic: [
        { subject: "First Language", formative: 40, summative: 25, total: 65, grade: "B2" },
        { subject: "Second Language", formative: 42, summative: 28, total: 70, grade: "B1" },
        { subject: "Third Language", formative: 41, summative: 27, total: 68, grade: "B2" },
        { subject: "Math", formative: 45, summative: 30, total: 75, grade: "B1" },
        { subject: "EVS", formative: 48, summative: 31, total: 79, grade: "B1" },
      ],
      coScholastic: [
        { area: "Scout", grade: "B1" },
        { area: "Art", grade: "A2" },
        { area: "Work Experience", grade: "B1" },
        { area: "Physical Ed Health", grade: "B1" },
      ],
      teacherRemarks: "Diya is a sincere and hardworking student. She has shown consistent improvement throughout the term.",
    },
     term2: {
      scholastic: [
        { subject: "First Language", formative: 45, summative: 30, total: 75, grade: "B1" },
        { subject: "Second Language", formative: 48, summative: 32, total: 80, grade: "B1" },
        { subject: "Third Language", formative: 46, summative: 31, total: 77, grade: "B1" },
        { subject: "Math", formative: 50, summative: 35, total: 85, grade: "A2" },
        { subject: "EVS", formative: 52, summative: 34, total: 86, grade: "A2" },
      ],
      coScholastic: [
          { area: "Scout", grade: "A2" },
          { area: "Art", grade: "A1" },
          { area: "Work Experience", grade: "A2" },
          { area: "Physical Ed Health", grade: "A2" },
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
