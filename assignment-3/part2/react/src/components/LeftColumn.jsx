import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function LeftColumn({
  members = [],
  balances = {},
  onAddMember,
  onDelMember,
}) {
  const [newMember, setNewMember] = useState("");
  const [delMember, setDelMember] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newMember) return;
    onAddMember(newMember);
      setNewMember("");
    const errorMessage = onAddMember(newMember);
    if (errorMessage) {
      toast.error(errorMessage);
    } else {
      setNewMember("");
    }
  };

  const handleDel = (e) => {
    e.preventDefault();
    if (!delMember) return toast.error("Select a member to delete");
      const errorMessage = onDelMember(delMember);
      if (errorMessage) {
          toast.error(errorMessage)
      } else {
          setDelMember("");
      }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white p-4">
      <h2 className="text-3xl font-semibold mb-6 tracking-tight">Members</h2>
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 mb-8">
        <h3 className="text-sm font-medium text-zinc-200 mb-4">Add / Delete members</h3>
        
        <form onSubmit={handleAdd} className="mb-4">
          <Label className="text-xs text-zinc-500 mb-1.5 block">Enter the name</Label>
          <div className="flex gap-2">
            <Input
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
              className="bg-black border-zinc-800 focus-visible:ring-zinc-700 h-9"
            />
            <Button type="submit" variant="secondary" className="h-9 px-4 bg-zinc-100 text-black hover:bg-zinc-300">
              Add member
            </Button>
          </div>
        </form>
       <form onSubmit={handleDel}>
          <Label className="text-xs text-zinc-500 mb-1.5 block">Select members to delete</Label>
          <div className="flex gap-2">
            <Select value={delMember} onValueChange={setDelMember}>
              <SelectTrigger className="w-full bg-black border-zinc-800 h-9">
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                {members.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              type="submit" 
              variant="secondary" 
              size="icon" 
              className="h-7 w-7 shrink-0 bg-white hover:bg-zinc-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </Button>
          </div>
        </form>
      </div>
      <div className="px-1">
        <div className="flex justify-between text-xs font-medium text-zinc-500 mb-3 pb-2 border-b border-zinc-800">
          <span>Member</span>
          <span>Amount</span>
        </div>
        
        <ScrollArea className="h-100">
          <ul className="space-y-4 pt-2">
            {members.map((item) => {
              const balance = balances[item] || 0;
              const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.abs(balance));
              
              return (
                <li key={item} className="flex justify-between items-center pb-3 border-b border-zinc-900 last:border-0">
                  <span className="text-sm font-medium">{item}</span>
                  <span className={`text-sm ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {balance < 0 ? '-' : ''}{formattedAmount}
                  </span>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </div>
    </div>
  );
}