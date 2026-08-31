import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";    import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function LeftColumn({
    members = [],
    balances = {},
    onAddMember,
    onDelMember
}) 
{
    const [newMember, setNewMember] = useState("");
    const [delMember, setDelMember] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        const errorMessage = onAddMember(newMember);
        if (errorMessage) {
            setError(errorMessage);
        } else {
            setNewMember("");
            setError(null);
        }
        onAddMember(newMember)
    }

    const handleDelete = (e) => {
        e.preventDefault();
        if (!delMember) return;
        const errorMessage = onDelMember(delMember)
        if (errorMessage) {
            setError(errorMessage)
        }
        else {
            setDelMember("")
            setError(null)
        }
    }
    return (
        <Card className="flex flex-col h-full bg-black border-2 border-white rounded-none">
            <CardHeader className="pb-4 text-white">
                <CardTitle>
                    Members
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
                {error && (
                    <Alert variant="destructive" className="border-red-500 text-red-500 rounded-none">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <div>
                    <form onSubmit={handleSubmit}>
                        <Input
                            className="text-white"
                            value={newMember}
                            placeholder="eg: john"
                            onChange={(e) => setNewMember(e.target.value)}
                        />
                        <Button type="submit" variant="secondary">Add</Button>
                    </form>
                    <form onSubmit={handleDelete}>
                        <Select value={delMember} onValueChange={setDelMember}>
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
                        <Button type="submit" variant="destructive">Delete</Button>
                    </form>
                </div>
                <ScrollArea className="mx-2 px-2">
                    <ul className="space-y-2 text-white">
                        {members.map((item) => (
                            <li key={item} className="flex justify-between border-b pb-1">
                                <span className="font-semibold">{item}</span>
                                <span>₹{balances[item]}</span>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            </CardContent>
      </Card>
  )
}