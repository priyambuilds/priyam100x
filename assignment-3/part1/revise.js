const members = ["rahul", "aisha", "kabir"];

const expenses = [
  { id: 1, desc: "Milk", amount: 60,  paidBy: "rahul", participants: ["rahul", "aisha", "kabir"] },
  { id: 2, desc: "Gas",  amount: 960, paidBy: "aisha", participants: ["rahul", "aisha", "kabir"] },
  { id: 3, desc: "Wifi", amount: 840, paidBy: "rahul", participants: ["rahul", "aisha"] }
];

const totalPaid = (expenses, members) => {
    const inititalBal = Object.fromEntries(members.map(m => [m, 0]))
    const total = expenses.reduce((acc, {paidBy, amount}) => {
        acc[paidBy] += amount
        return acc
    }, inititalBal)
    return total
}
console.log(totalPaid(expenses, members))

const splitEvenly = (total, split) => {
    const newTotal = total * 100;
    const base = Math.round(newTotal / split)
    const cents = total%split
    const output = new Array(split).fill(base).map((num, i) => (
        (i < cents ? num + cents : num)/100
    ))
    return output
}
console.log(splitEvenly(100, 3))

const totalOwed = (expenses, members) => {
    const initialObj = Object.fromEntries(members.map(m => [m, 0]))
    const output = expenses.reduce((acc, { amount, participants }) => {
        const shares = splitEvenly(amount, participants.length);
        participants.forEach((m, index) => acc[m] += shares[index])
        return acc
    }, initialObj)
    return output
}
console.log(totalOwed(expenses, members))

const netBal = (totalPaid, totalOwed) => {
    for (item in totalPaid) {
        totalPaid[item] = totalPaid[item] - totalOwed[item]
    }
    return totalPaid
}
console.log(netBal(totalPaid(expenses, members), totalOwed(expenses, members)))

const verify = (netBal) => {
    total = 0;
    for(item in netBal) {
        total += netBal[item];
    }
    if (total==0) {
        return true
    } else {
        return false
    }
}
console.log(verify(netBal(totalPaid(expenses, members), totalOwed(expenses, members))))

const biggestSpender = (totalPaid) => {
    let output = 0;
    let member = ""
    for (item in totalPaid) {
        if (output < totalPaid[item]) {
            output = totalPaid[item];
            member = item
        }
    }
    return member
}

console.log(biggestSpender(totalPaid(expenses, members)))

const filter = (expenses, mem) => {
    return expenses.filter(expenses => expenses.participants.includes(mem))
}
console.log(filter(expenses, "kabir"))

const search = (expenses, keyword) => {
    return expenses.filter(exp => exp.desc.toLowerCase().includes(keyword))
}
console.log(search(expenses, "wi"))

const filterExp = (expenses, {member, search}) => {
    return expenses.filter(exp => {
        const filterMem = !member || exp.participants.includes(member);
        const filterSearch = !search || exp.desc.includes(search);
        return filterMem && filterExp;
    })
}
console.log(filterExp(expenses, { member: null, search: "" }))

const summary = (expenses, members) => {
    let total = Object.values(totalPaid(expenses, members)).reduce((acc, item) => acc + item, 0)
    let count = expenses.length
    let average = total/count
    let biggest = biggestSpender(totalPaid(expenses, members))
    return {total, count, average, biggest}
}
console.log(summary(expenses, members))