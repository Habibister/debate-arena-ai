import { BarChart3, ClipboardList, MessageSquareText, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const students = [
  { name: "Alex Rivera", org: "Debate", level: "Beginner", mastery: "72%", action: "Assign rebuttal drills" },
  { name: "Sam Patel", org: "Model UN", level: "Intermediate", mastery: "81%", action: "Review position paper" },
  { name: "Jordan Lee", org: "DECA", level: "Elite", mastery: "88%", action: "Schedule roleplay round" }
];

export function TeamTable() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Team Command Center</CardTitle>
          <Users className="h-5 w-5 text-primary" aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Organization</th>
                <th className="px-4 py-3 font-semibold">Level</th>
                <th className="px-4 py-3 font-semibold">Mastery</th>
                <th className="px-4 py-3 font-semibold">Coach Action</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-card">
              {students.map((student) => (
                <tr key={student.name}>
                  <td className="px-4 py-3 font-semibold">{student.name}</td>
                  <td className="px-4 py-3">{student.org}</td>
                  <td className="px-4 py-3">{student.level}</td>
                  <td className="px-4 py-3">{student.mastery}</td>
                  <td className="px-4 py-3 text-muted-foreground">{student.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold">Assign lessons</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
            <MessageSquareText className="h-5 w-5 text-secondary" aria-hidden />
            <span className="text-sm font-semibold">Review debates</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
            <BarChart3 className="h-5 w-5 text-accent" aria-hidden />
            <span className="text-sm font-semibold">Track analytics</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
