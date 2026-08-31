import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Label } from "./ui/label";

export default function ExpenseForm({ members = [], onAddExpense }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState(null);

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
      return setError("All fields are required")
    }
    if (Number(amount) <=0) {
      return setError("Amount must be greater than zero")
    }
    if (participants.length == 0) {
      return setError("Select atleast one participant")
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
    setError(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>Add expenses</CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="border-red-500 text-red-500 rounded-none">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
            />
          </div>
          <div>
            <Label>Desc</Label>
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Description"
            />
          </div>
          <div>
            <Label>Paid by</Label>
            <Select value={payer} onValueChange={setPayer}>
              <SelectTrigger>
                <SelectValue placeholder="Select a payer"/>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>members</SelectLabel>
                  {members.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Split amount</Label>
            {members.map((member) => (
              <div key={member}>
                <Checkbox
                  checked={participants.includes(member)}
                  onCheckedChange={() => handleToggle(member)}
                />
                <span>{member}</span>
              </div>
            ))}
          </div>
          <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200">Add Expense</Button>
        </form>
      </CardContent>
    </Card>
  );
}
