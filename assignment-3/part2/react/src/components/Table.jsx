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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge"

export default function ExpenseTable({ expenses = [], onDelExpense, filter, onFilterChange, members }) {
  const renderParticipants = (participants) => {
    const visible = participants.slice(0, 2);
    const hiddenCount = participants.length - 2;
    
    return (
      <div className="flex flex-wrap gap-2 items-center">
        {visible.map((p) => (
          <Badge key={p}>{p}</Badge>
        ))}
        {hiddenCount > 0 && (
          <Badge className="rounded-full">+{hiddenCount}</Badge>
        )}
      </div>
    )
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-100">
      <div className="flex gap-4 p-4 border-b border-zinc-800">
        <Input
          placeholder="Filter by Description"
          value={filter.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
          className="flex-1 bg-black border-zinc-800 focus-visible:ring-zinc-700 h-9 text-white placeholder:text-zinc-600"
        />
        <Select
          value={filter.member || "all"}
          onValueChange={(val) => onFilterChange("member", val === "all" ? "" : val)}
        >
          <SelectTrigger className="w-[180px] bg-black border-zinc-800 h-9 text-zinc-300">
            <SelectValue placeholder="Filter by member" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
            <SelectItem value="all">All Members</SelectItem>
            {members.map((m) => (
              <SelectItem key={m} value={m} className="capitalize">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader className="bg-black/40 hover:bg-black/40 border-b border-zinc-800">
          <TableRow className="border-none hover:bg-transparent">
            <TableHead className="text-zinc-400 font-medium h-10 px-4">Description</TableHead>
            <TableHead className="text-zinc-400 font-medium h-10">Amount</TableHead>
            <TableHead className="text-zinc-400 font-medium h-10">Participants</TableHead>
            <TableHead className="text-zinc-400 font-medium h-10">Paid By</TableHead>
            <TableHead className="h-10 w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.length === 0 ? (
            <TableRow className="border-none hover:bg-transparent">
              <TableCell colSpan={5} className="text-center text-zinc-500 py-12 text-sm">
                No expenses found.
              </TableCell>
            </TableRow>
          ) : (
            expenses.map((exp) => (
              <TableRow
                key={exp.id}
                className="border-b border-zinc-800/50 hover:bg-zinc-900/20 transition-colors"
              >
                <TableCell className="px-4 py-3 text-sm text-zinc-200">{exp.desc}</TableCell>
                <TableCell className="py-3 text-sm text-zinc-200">
                  ₹ {exp.amount}
                </TableCell>
                <TableCell className="py-3">{renderParticipants(exp.participants)}</TableCell>
                <TableCell className="py-3 text-sm text-zinc-200 capitalize">
                  {exp.paidBy}
                </TableCell>
                <TableCell className="py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelExpense(exp.id)}
                    className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-md"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="bg-black/40 px-4 py-3 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
      </div>
    </div>
  )
}
