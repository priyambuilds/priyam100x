import { useEffect, useState } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { ChatPane } from './components/ChatPane'
import { NewChatModal } from './components/NewChatModal'
import { Sidebar } from './components/Sidebar'
import { ChatProvider, useChat } from './state/ChatProvider'

function Shell() {
  const { state, dismissNotice } = useChat()
  const [showNew, setShowNew] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const active = state.activeRoomId

  useEffect(() => {
    if (!state.notice) return
    const t = setTimeout(dismissNotice, 4000)
    return () => clearTimeout(t)
  }, [state.notice, dismissNotice])

  if (!state.me) return <AuthScreen />

  return (
    <div className="flex h-full">
      {/* On phones show either the list or the chat; on md+ show both. */}
      <div className={`${active && mobileChatOpen ? 'hidden' : 'flex'} h-full w-full md:flex md:w-auto`}>
        <Sidebar onNewChat={() => setShowNew(true)} onSelect={() => setMobileChatOpen(true)} />
      </div>
      <main className={`${active && mobileChatOpen ? 'flex' : 'hidden'} h-full min-w-0 flex-1 md:flex`}>
        {active && state.rooms[active]
          ? <ChatPane key={active} roomId={active} onBack={() => setMobileChatOpen(false)} />
          : <div className="m-auto text-center text-slate-500"><p className="text-lg">Pick a conversation</p><p className="text-sm">or start a new one</p></div>}
      </main>
      {showNew && <NewChatModal onClose={() => setShowNew(false)} onOpened={() => setMobileChatOpen(true)} />}
      {state.notice && (
        <div role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-rose-600 px-4 py-2 text-sm shadow-lg">
          {state.notice}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return <ChatProvider><Shell /></ChatProvider>
}
