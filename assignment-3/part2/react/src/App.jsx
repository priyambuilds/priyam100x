import { useEffect, useState } from "react";
import { totalPaid, totalOwed, balances, summary, filterExpenses } from "./core/calculator";
import LeftColumn from "./components/LeftColumn";
import RightColumn from "./components/RightColumn";
import ExpenseTable from "./components/Table";
import ExpenseForm from "./components/Forum";
import { Toaster, toast } from "sonner";
export default function App() {
  const [state, setState] = useState(() => {
    const savedData = localStorage.getItem("bill-splitter-data")

    if (savedData) {
      return JSON.parse(savedData);
    }

    return {
      members: [],
      expenses: [], 
      filter: { memberId: null, search: "" },
    }
  });

  useEffect(() => {
    localStorage.setItem("bill-splitter-data", JSON.stringify(state))
  })

  const handleFilterChange = (key, value) => {
    setState(prev => ({
      ...prev,
      filter: {...prev.filter, [key]: value}
    }))
  }

  const displayedExp = filterExpenses(state.expenses, state.filter)

  const handleAddExpense = (newExpense) => {
    setState((prevState) => ({
      ...prevState, expenses: [...prevState.expenses, newExpense]
    }))
    toast.success("Expense added successfully")
  }
  const handleDelExpense = (delExpenseId) => {
    setState((prevState) => ({
      ...prevState, expenses: prevState.expenses.filter((exp) => exp.id !== delExpenseId)
    }))
    toast.success("Expense deleted successfully")
  }

  const handleAddMembers = (newMember) => {
    const cleanName = newMember.trim().toLowerCase();
    if (!cleanName) return "Name cannot be empty";
    if(state.members.includes(cleanName)) return `${cleanName} is already a member`
    setState((prevState) => ({
      ...prevState,
      members: [...prevState.members, cleanName],
    }))
    toast.success(`${cleanName} added to the group`)
    return null
  }
  const handleDeleteMember = (delMember) => {
    const cleanName = delMember.trim().toLowerCase();
    const checkExpense = state.expenses.some((exp) => exp.participants.includes(cleanName) || exp.paidBy.includes(cleanName))
    if (checkExpense) return `Cannot delete ${delMember}: They are a part of an existing expense`
    
    setState((prevState) => ({
      ...prevState,
      members: prevState.members.filter((m) => m !== delMember),
    }))
    toast(`${delMember} deleted successfully`)
    return null
  }

  const paid = totalPaid(state.expenses, state.members);
  const owed = totalOwed(state.expenses, state.members);
  const totalBalance = balances(paid, owed);
  const summaryData = summary(state.expenses, state.members)

  return (
    <main className="w-full h-screen bg-black overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 h-full max-w-7xl mx-auto">
        <LeftColumn
          members={state.members}
          balances={totalBalance}
          onAddMember={handleAddMembers}
          onDelMember={handleDeleteMember}
        />
        <div className="bg-black p-4 shadow-md rounded-xl text-gray-400">
          <ExpenseForm
            members={state.members}
            onAddExpense={handleAddExpense}
          />
          <ExpenseTable
            expenses={displayedExp}
            onDelExpense={handleDelExpense}
            filter={state.filter}
            onFilterChange={handleFilterChange}
            members={state.members}
          />
        </div>
        <RightColumn
          summary={summaryData}
        />
      </div>
      <Toaster position="top-right" theme="dark" />
    </main>
  );
}
