import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";    import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LeftColumn({
    members = [],
    balances = {}
}) {
    return (
        <Card className="flex flex-col h-full bg-black border-2 border-white rounded-none">
            <CardHeader className="pb-4 text-white">
                <CardTitle>
                    Members
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
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