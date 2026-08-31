export default function RightColumn({ summary }) {
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

  return (
    <div className="flex flex-col h-full bg-black text-white p-4 md:pl-8">
      <h2 className="text-3xl font-semibold mb-8 tracking-tight ">Summary :</h2>

      <div className="flex flex-col w-full max-w-sm">
        <div className="flex justify-between items-center py-4 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-300">Total spent:</span>
          <span className="text-sm font-medium text-green-500">
            {formatCurrency(summary.total || 0)}
          </span>
        </div>
        
        <div className="flex justify-between items-center py-4 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-300">No of expenses:</span>
          <span className="text-sm font-medium text-green-500">
            {summary.count || 0}
          </span>
        </div>
        
        <div className="flex justify-between items-center py-4 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-300">Average expense:</span>
          <span className="text-sm font-medium text-green-500">
            {formatCurrency(summary.average || 0)}
          </span>
        </div>
        
        <div className="flex justify-between items-center py-4 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-300">Biggest spender:</span>
          <span className="text-sm font-medium text-zinc-100 capitalize">
            {summary.biggest || "-"}
          </span>
        </div>
      </div>
    </div>
  );
}