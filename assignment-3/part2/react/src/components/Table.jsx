import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function ExpenseTable({ expenses = [] }) {
  if (expenses.length === 0) {
    return <p>No expenses added yet</p>;
  }

  return (
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
        {expenses.map((exp) => (
          <TableRow key={exp.id}>
            <TableCell>{exp.desc}</TableCell>
            <TableCell>{exp.amount}</TableCell>
            <TableCell>{exp.paidBy}</TableCell>
            <TableCell>{exp.participants}</TableCell>
            <TableCell>
              <Button>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
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
        ))}
      </TableBody>
    </Table>
  );
}
