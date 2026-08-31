import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ExpenseTable({ expenses = [], onDelExpense, filter, onFilterChange, members }) {
  return (
    <div>
      <div>
        <Input
          placeholder="Search expenses..."
          value={filter.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
        />
        <Select value={filter.member} onValueChange={(val) => onFilterChange("member", val === "all" ? "" : val)}>
          <SelectTrigger className="w-full max-w-48">
              <SelectValue placeholder="Remove member..."/>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>members</SelectLabel>
                  {members.map((m) => (
                      <SelectItem key={m} value={m}>
                      {m}
                      </SelectItem>
                  ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-white font-bold">Description</TableHead>
            <TableHead className="text-white font-bold">Amount</TableHead>
            <TableHead className="text-white font-bold">Paid By</TableHead>
            <TableHead className="text-white font-bold text-right">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-white py-8">
                No expenses found
              </TableCell>
            </TableRow>
          ) : (expenses.map((exp) => (
            <TableRow key={exp.id}>
              <TableCell>{exp.desc}</TableCell>
              <TableCell>{exp.amount}</TableCell>
              <TableCell>{exp.paidBy}</TableCell>
              <TableCell>{exp.participants}</TableCell>
              <TableCell>
                <Button
                  variant="destructive"
                  onClick={() => onDelExpense(exp.id)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </Button>
              </TableCell>
            </TableRow>
          )))}
        </TableBody>
      </Table>
    </div>
  );
}
