export const totalPaid = (expenses, members) => {
    let initialBalances = Object.fromEntries(members.map(m => [m, 0]))
    let total = expenses.reduce((acc, { paidBy, amount }) => {
        acc[paidBy] += amount;
        return acc
    }, initialBalances)
    return total
}

export const splitEvenly = (total, n) => {
    let newTotal = Math.round(total*100)
    let base = Math.round(newTotal/n)
    let cents = newTotal%n
    let arr = new Array(n).fill(base).map((num, i) => (i < cents ? num + 1 : num)/100)
    return arr
}


export const totalOwed = (expenses, members) => {
    let totalBal = Object.fromEntries(members.map(n => [n, 0]))
    let totalExp = expenses.reduce((acc, { amount, participants }) => {
        const shares = splitEvenly(amount, participants.length)
        participants.forEach((person, index) => {
            acc[person] += shares[index]
        })
        return acc
    }, totalBal)
    return totalExp
}

export const balances = (paid, owed) => {
    let netBal = Object.fromEntries(
        Object.keys(paid).map(person => [
            person, paid[person] - owed[person]
        ])
    )
    return netBal
}

export const verify = (obj) => {
    const sum = Object.values(obj).reduce((acc, item) => acc + item, 0)
    return Math.abs(sum) < 0.01;
}

// If 2 members are tied at the top, it will return the array of those 2 member's names
export const biggestSpender = (obj) => {
    const maxAmount = Math.max(...Object.values((obj)))
    const result = Object.entries(obj)
        .filter(n => n[1] === maxAmount)
        .map(n => n[0])
    if (result.length === 1) {
        return result[0]
    } else return result
}

export const byMember = (obj, name) => {
    return obj.filter(({ paidBy, participants }) => {
        return paidBy === name || participants.includes(name)
    })
    .map(({desc}) => desc)
}

export const search = (obj, name) => {
    return obj.filter(({ desc }) =>
        desc.toLowerCase().includes(name.toLowerCase())
    )
    .map(item => item.desc).join()
}

export const filterExpenses = (obj, {member, search}) => {
    return obj.filter(({ paidBy, participants, desc }) => {
        const members = participants.includes(member) || !member || paidBy == member
        const item = desc.toLowerCase().includes(search.toLowerCase()) || !search
        return members && item
    })

}

export const summary = (expenses, members) => {
    let total = Object.values(totalPaid(expenses, members)).reduce((acc, item) => acc + item, 0)
    let count = expenses.length
    let average = total/count
    let biggest = biggestSpender(totalPaid(expenses, members))
    return {total, count, average, biggest}
}