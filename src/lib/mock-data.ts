export const currentUser = {
  name: "Ayesha Khan",
  email: "ayesha@abcuniversity.edu",
  role: "Tenant Admin" as "Tenant Admin" | "Question Creator" | "Reviewer" | "Assignee",
  initials: "AK",
  tenant: "ABC University",
};

export const tenants = ["ABC University", "Beacon Institute", "Northwind Academy"];

export const stats = {
  totalQuestions: 1284,
  publishedQuestions: 942,
  totalTests: 87,
  activeAssignments: 23,
  pendingReviews: 41,
  completedAttempts: 1657,
};

export const difficultyData = [
  { name: "Easy", value: 412, fill: "var(--color-chart-4)" },
  { name: "Medium", value: 586, fill: "var(--color-chart-1)" },
  { name: "Hard", value: 286, fill: "var(--color-chart-5)" },
];

export const assignmentsTrend = [
  { month: "Jan", assignments: 12, attempts: 86 },
  { month: "Feb", assignments: 18, attempts: 142 },
  { month: "Mar", assignments: 24, attempts: 198 },
  { month: "Apr", assignments: 21, attempts: 176 },
  { month: "May", assignments: 32, attempts: 254 },
  { month: "Jun", assignments: 38, attempts: 312 },
  { month: "Jul", assignments: 45, attempts: 389 },
];

export const passFailData = [
  { name: "Pass", value: 1124, fill: "var(--color-chart-4)" },
  { name: "Fail", value: 533, fill: "var(--color-chart-5)" },
];

export const activities = [
  { id: 1, type: "Question Created", actor: "Daniel R.", target: "Photosynthesis basics", time: "2m ago" },
  { id: 2, type: "Test Published", actor: "Maria G.", target: "Biology Midterm – Fall 2026", time: "18m ago" },
  { id: 3, type: "Assignment Created", actor: "Ayesha K.", target: "CS101 Week 4 Quiz", time: "1h ago" },
  { id: 4, type: "Attempt Submitted", actor: "John P.", target: "Algebra Practice Set 3", time: "2h ago" },
  { id: 5, type: "Answer Reviewed", actor: "Reviewer Bot", target: "Essay: Industrial Revolution", time: "3h ago" },
  { id: 6, type: "Question Created", actor: "Daniel R.", target: "Cellular respiration", time: "5h ago" },
];

export const questions = [
  { id: "Q-2041", text: "What is the powerhouse of the cell?", type: "Single Choice", difficulty: "Easy", tags: ["Biology", "Cells"], status: "Published", createdBy: "Daniel R.", createdAt: "2026-05-12" },
  { id: "Q-2042", text: "Which of the following are prime numbers?", type: "Multiple Choice", difficulty: "Medium", tags: ["Math", "Primes"], status: "Published", createdBy: "Maria G.", createdAt: "2026-05-14" },
  { id: "Q-2043", text: "Describe the causes of WWI in 3–5 sentences.", type: "Short Answer", difficulty: "Medium", tags: ["History"], status: "Draft", createdBy: "Ayesha K.", createdAt: "2026-05-18" },
  { id: "Q-2044", text: "Explain the impact of the Industrial Revolution on labor.", type: "Essay", difficulty: "Hard", tags: ["History", "Economics"], status: "Published", createdBy: "John P.", createdAt: "2026-05-20" },
  { id: "Q-2045", text: "Solve for x: 2x + 5 = 17", type: "Short Answer", difficulty: "Easy", tags: ["Math", "Algebra"], status: "Published", createdBy: "Maria G.", createdAt: "2026-05-22" },
  { id: "Q-2046", text: "Which gas do plants absorb for photosynthesis?", type: "Single Choice", difficulty: "Easy", tags: ["Biology"], status: "Published", createdBy: "Daniel R.", createdAt: "2026-05-23" },
  { id: "Q-2047", text: "Pick all valid HTTP methods.", type: "Multiple Choice", difficulty: "Medium", tags: ["CS", "Web"], status: "Archived", createdBy: "Ayesha K.", createdAt: "2026-05-24" },
  { id: "Q-2048", text: "Compare TCP and UDP protocols.", type: "Essay", difficulty: "Hard", tags: ["CS", "Networks"], status: "Draft", createdBy: "John P.", createdAt: "2026-05-25" },
];

export const tests = [
  { id: "T-101", title: "Biology Midterm – Fall 2026", duration: 90, passing: 60, sections: 3, questions: 32, status: "Published", assignments: 4 },
  { id: "T-102", title: "Algebra Practice Set 3", duration: 45, passing: 50, sections: 2, questions: 20, status: "Published", assignments: 2 },
  { id: "T-103", title: "World History – Unit 5", duration: 60, passing: 55, sections: 4, questions: 28, status: "Draft", assignments: 0 },
  { id: "T-104", title: "Intro to Networking Quiz", duration: 30, passing: 65, sections: 2, questions: 15, status: "Published", assignments: 6 },
];

export const assignments = [
  { id: "A-501", test: "Biology Midterm – Fall 2026", assignee: "Section B – 28 students", assignedBy: "Ayesha K.", due: "2026-06-18", attempts: 1, status: "Active" },
  { id: "A-502", test: "Algebra Practice Set 3", assignee: "john.p@abc.edu", assignedBy: "Maria G.", due: "2026-06-12", attempts: 3, status: "Active" },
  { id: "A-503", test: "Intro to Networking Quiz", assignee: "CS101 Cohort", assignedBy: "Ayesha K.", due: "2026-06-09", attempts: 2, status: "Pending" },
  { id: "A-504", test: "World History – Unit 5", assignee: "Section A", assignedBy: "Daniel R.", due: "2026-05-30", attempts: 1, status: "Expired" },
  { id: "A-505", test: "Biology Midterm – Fall 2026", assignee: "Section C", assignedBy: "Ayesha K.", due: "2026-05-15", attempts: 1, status: "Completed" },
];

export const users = [
  { id: 1, name: "Ayesha Khan", email: "ayesha@abcuniversity.edu", role: "Tenant Admin", status: "Active", lastActive: "2m ago" },
  { id: 2, name: "Daniel Rivera", email: "daniel.r@abcuniversity.edu", role: "Question Creator", status: "Active", lastActive: "1h ago" },
  { id: 3, name: "Maria Gomez", email: "maria.g@abcuniversity.edu", role: "Question Creator", status: "Active", lastActive: "3h ago" },
  { id: 4, name: "John Park", email: "john.p@abcuniversity.edu", role: "Reviewer", status: "Active", lastActive: "Yesterday" },
  { id: 5, name: "Liu Wei", email: "liu.w@abcuniversity.edu", role: "Assignee", status: "Active", lastActive: "5d ago" },
  { id: 6, name: "Priya Nair", email: "priya.n@abcuniversity.edu", role: "Assignee", status: "Suspended", lastActive: "2w ago" },
];

export const auditLogs = [
  { id: 1, actor: "Ayesha Khan", action: "PUBLISH", resource: "Test T-101", time: "2026-06-10 09:42:11" },
  { id: 2, actor: "Daniel Rivera", action: "CREATE", resource: "Question Q-2048", time: "2026-06-10 09:21:03" },
  { id: 3, actor: "System", action: "AUTO_GRADE", resource: "Attempt #18213", time: "2026-06-10 08:55:46" },
  { id: 4, actor: "Maria Gomez", action: "UPDATE", resource: "Question Q-2042", time: "2026-06-09 17:12:22" },
  { id: 5, actor: "John Park", action: "REVIEW", resource: "Answer #44120", time: "2026-06-09 16:30:09" },
  { id: 6, actor: "Ayesha Khan", action: "INVITE", resource: "User liu.w@abc.edu", time: "2026-06-09 11:02:54" },
  { id: 7, actor: "Priya Nair", action: "SUBMIT", resource: "Attempt #18198", time: "2026-06-09 10:48:31" },
];

export const permissions = [
  { key: "questions.create", label: "Create Questions" },
  { key: "questions.publish", label: "Publish Questions" },
  { key: "tests.build", label: "Build Tests" },
  { key: "tests.publish", label: "Publish Tests" },
  { key: "assignments.manage", label: "Manage Assignments" },
  { key: "grading.review", label: "Review & Grade" },
  { key: "users.manage", label: "Manage Users" },
  { key: "tenant.settings", label: "Tenant Settings" },
  { key: "audit.view", label: "View Audit Logs" },
];

export const roles = ["Tenant Admin", "Question Creator", "Reviewer", "Assignee"] as const;

export const roleMatrix: Record<string, string[]> = {
  "Tenant Admin": permissions.map((p) => p.key),
  "Question Creator": ["questions.create", "questions.publish", "tests.build"],
  "Reviewer": ["grading.review"],
  "Assignee": [],
};
