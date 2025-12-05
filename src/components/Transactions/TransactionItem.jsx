import Button from '../UI/Button'
import TransactionForm from '../Transaction/TransactionForm'
import { useState } from 'react' 
export default function TransactionItem({ item, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)

  function handleSave(updated) {
    onUpdate(item.id, updated)
    setEditing(false)
  }

  const amountColor = item.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border">
      <div className="flex-1">
        {editing ? (
          <TransactionForm
            initial={item}
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div>
            <div className="flex items-baseline gap-3">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-300">{item.date}</p>
              <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold" style={{background:item.type==='income'?'#d1fae5':'#fee2e2',color:item.type==='income'?'#065f46':'#991b1b'}}>{item.type === 'income' ? 'Income' : 'Expense'}</span>
            </div>
            <p className={`${amountColor} font-medium mt-1`}>${Number(item.amount).toFixed(2)}</p>
            {Array.isArray(item.tags) && item.tags.length > 0 && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 flex flex-wrap gap-2">
                {item.tags.map((tag, idx) => (
                  <span key={idx} className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">#{tag}</span>
                ))}
              </div>
            )}
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-100">{item.category.name}</p>
          </div>
        )}
      </div>
      <div className="ml-4 flex flex-col gap-2">
        {editing ? null : (
          <>
            <Button className="bg-yellow-500 hover:bg-yellow-600" onClick={() => setEditing(true)}>Edit</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => onDelete(item.id)}>Delete</Button>
          </>
        )}
      </div>
    </div>
  )
}
