import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RightColumn({ summary }) {
  return (
    <Card className="flex flex-col h-full bg-black border-2 border-white rounded-none">
      <CardHeader className="pb-4 text-white">
        <CardTitle>Members</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col">
        <ScrollArea className="mx-2 px-2">
          <ul className="space-y-2 text-white">
            <li className="flex justify-between border-b pb-1 font-semibold">
              <span>total spent: {summary.total}</span>
              <span>no of expenses: {summary.count}</span>
              <span>average expense: {summary.average}</span>
              <span>biggest spender: {summary.biggest}</span>
            </li>
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
