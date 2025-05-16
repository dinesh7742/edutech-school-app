import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface GradeDivisionSelectorProps {
  grade: string;
  onGradeChange: (value: string) => void;
  division: string;
  onDivisionChange: (value: string) => void;
}

const grades = Array.from({ length: 8 }, (_, i) => (i + 1).toString());
const divisions = Array.from({ length: 7 }, (_, i) => String.fromCharCode(65 + i)); // A to G

export function GradeDivisionSelector({
  grade,
  onGradeChange,
  division,
  onDivisionChange,
}: GradeDivisionSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="grade">Grade</Label>
        <Select value={grade} onValueChange={onGradeChange}>
          <SelectTrigger id="grade">
            <SelectValue placeholder="Select grade" />
          </SelectTrigger>
          <SelectContent>
            {grades.map((g) => (
              <SelectItem key={g} value={g}>
                Grade {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="division">Division</Label>
        <Select value={division} onValueChange={onDivisionChange}>
          <SelectTrigger id="division">
            <SelectValue placeholder="Select division" />
          </SelectTrigger>
          <SelectContent>
            {divisions.map((d) => (
              <SelectItem key={d} value={d}>
                Division {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
