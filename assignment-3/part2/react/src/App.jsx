import { useState } from "react";
import { totalPaid, totalOwed, balances, summary } from "./core/calculator";
import LeftColumn from "./components/LeftColumn";
import RightColumn from "./components/RightColumn";

export default function App() {
  const [state, setState] = useState({
    members: ["rahul", "aisha", "kabir"],

    expenses: [
      {
        id: 1,
        desc: "Milk",
        amount: 60,
        paidBy: "rahul",
        participants: ["rahul", "aisha", "kabir"],
      },
      {
        id: 2,
        desc: "Gas",
        amount: 960,
        paidBy: "aisha",
        participants: ["rahul", "aisha", "kabir"],
      },
      {
        id: 3,
        desc: "Wifi",
        amount: 840,
        paidBy: "rahul",
        participants: ["rahul", "aisha"],
      },
    ],
    filter: { memberId: null, search: "" },
  });
  const paid = totalPaid(state.expenses, state.members);
  const owed = totalOwed(state.expenses, state.members);
  const totalBalance = balances(paid, owed);
  const summaryData = summary(state.expenses, state.members)

  const handleAddMember = () => {};
  const handleDelMember = () => {};
  return (
    <main className="w-full h-screen bg-black overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 h-full max-w-7xl mx-auto">
        <LeftColumn
          members={state.members}
          balances={totalBalance}
        />

        <div className="bg-white p-4 shadow-md rounded-xl text-gray-400">
          Middle Column (Pending)
        </div>
        <RightColumn
          summary={summaryData}
        />
      </div>
    </main>
  );
}
