import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Label } from "./ui/label";
import { Toaster, toast } from "sonner";

export default function ExpenseForm({ members = [], onAddExpense }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    setParticipants(members);
  }, [members]);

  const handleToggle = (member) => {
    setParticipants((prev) =>
      prev.includes(member)
        ? prev.filter((m) => m !== member)
        : [...prev, member],
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!desc || !amount || !payer) {
      return toast.error("All fields are required");
    }
    if (Number(amount) <= 0) {
      return toast.error("Amount should be greater than 10");
    }
    if (participants.length == 0) {
      return toast.error("Select atleast one participant");
    }
    onAddExpense({
      id: Date.now(),
      desc: desc,
      amount: Number(amount),
      paidBy: payer,
      participants: participants,
    });
    setDesc("");
    setAmount("");
    setPayer("");
    setParticipants(members);
  };

return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 mb-6">
      <h3 className="text-sm font-medium text-white mb-1">Add Expense</h3>
      <p className="text-xs text-zinc-500 mb-6">Set the details for the transaction.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-4">
          <Label className="w-1/4 text-xs font-medium text-zinc-400">Description</Label>
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="flex-1 bg-black border-zinc-800 focus-visible:ring-zinc-700 h-9 text-white"
          />
        </div>

        <div className="flex items-center gap-4">
          <Label className="w-1/4 text-xs font-medium text-zinc-400">Amount</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-black border-zinc-800 focus-visible:ring-zinc-700 h-9 text-white"
          />
        </div>

        <div className="flex items-center gap-4">
          <Label className="w-1/4 text-xs font-medium text-zinc-400">Paid By</Label>
          <Select value={payer} onValueChange={setPayer}>
            <SelectTrigger className="flex-1 bg-black border-zinc-800 h-9 text-white focus:ring-zinc-700">
              <SelectValue placeholder="Select a payer" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
              {members.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-start gap-4 pt-2">
          <Label className="w-1/4 text-xs font-medium text-zinc-400 mt-1">Split Between</Label>
          <div className="flex-1 flex flex-wrap gap-4">
            {members.length === 0 && <span className="text-xs text-zinc-600">No members added yet.</span>}
            {members.map((member) => (
              <div key={member} className="flex items-center space-x-2">
                <Checkbox
                  id={`checkbox-${member}`}
                  checked={participants.includes(member)}
                  onCheckedChange={() => handleToggle(member)}
                  className="border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:text-black"
                />
                <label
                  htmlFor={`checkbox-${member}`}
                  className="text-xs font-medium leading-none text-zinc-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {member}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-zinc-800/50"> 
          <Button type="submit" className="h-9 px-6 bg-white text-black hover:bg-zinc-200">
            Save Expense
          </Button>
        </div>
      </form>
    </div>
  );
}