"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCookie } from "../../lib/utils";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Doctor { id: number; user: { id: number; full_name: string }; specialization: string; }
interface Message { text: string; senderId: string; isMe: boolean; }
interface RoomMeta { title: string; spec: string; notice: string; }

function escapeHTML(str: string) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

export default function ChatPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [roomMap, setRoomMap] = useState<Map<string, RoomMeta>>(new Map());
  const [currentRoom, setCurrentRoom] = useState<string>("");
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState("Offline");
  const socketRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getCookie("accessToken")) { router.push("/login"); return; }
    loadDoctors();
  }, [router]);

  const loadDoctors = async () => {
    try {
      const res = await fetch(`${BASE}/doctors`);
      const data = await res.json();
      const list: Doctor[] = data.doctors ?? [];
      setDoctors(list);

      const map = new Map<string, RoomMeta>();
      list.forEach(d => {
        map.set(String(d.user.id), {
          title: d.user.full_name,
          spec: d.specialization,
          notice: `Started chat with ${d.user.full_name}`,
        });
      });
      setRoomMap(map);

      if (list.length > 0) {
        const firstId = String(list[0].user.id);
        setCurrentRoom(firstId);
      }

      initSocket();
    } catch (e) {
      console.error("Failed to load doctors:", e);
    }
  };

  const initSocket = async () => {
    // Dynamic import to avoid SSR issues
    const { io } = await import("socket.io-client");
    const userId = getCookie("userId");
    const socket = io(BASE, { auth: { id: userId } });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setSocketId(socket.id?.substring(0, 8) ?? "");
    });
    socket.on("disconnect", () => {
      setConnected(false);
      setSocketId("Offline");
    });
    socket.on("message", (data: { message: string; userId: string }) => {
      const msg: Message = { text: data.message, senderId: data.userId, isMe: false };
      setMessages(prev => {
        const room = data.userId;
        return { ...prev, [room]: [...(prev[room] ?? []), msg] };
      });
    });

    return () => { socket.disconnect(); };
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentRoom]);

  const switchRoom = (id: string) => setCurrentRoom(id);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !currentRoom || !socketRef.current) return;
    socketRef.current.emit("message", { message: text, userId: currentRoom });
    const msg: Message = { text, senderId: "me", isMe: true };
    setMessages(prev => ({ ...prev, [currentRoom]: [...(prev[currentRoom] ?? []), msg] }));
    setInput("");
  };

  const currentMeta = roomMap.get(currentRoom);
  const currentMessages = messages[currentRoom] ?? [];

  return (
    <div className="h-full flex items-center justify-center p-4" style={{height:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",fontFamily:"system-ui,sans-serif"}}>
      <div style={{width:"100%",maxWidth:"900px",height:"85vh",background:"rgba(30,41,59,0.5)",backdropFilter:"blur(20px)",border:"1px solid rgba(71,85,105,0.5)",borderRadius:"1rem",boxShadow:"0 25px 50px rgba(0,0,0,0.5)",display:"flex",overflow:"hidden"}}>

        {/* SIDEBAR */}
        <aside style={{width:"256px",background:"rgba(15,23,42,0.4)",borderRight:"1px solid rgba(71,85,105,0.6)",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"1rem",borderBottom:"1px solid rgba(71,85,105,0.6)"}}>
            <h2 style={{fontSize:"11px",fontWeight:700,letterSpacing:"0.1em",color:"#94a3b8",textTransform:"uppercase",margin:0}}>Chat Channels</h2>
          </div>
          <nav style={{flex:1,padding:"0.75rem",overflowY:"auto",display:"flex",flexDirection:"column",gap:"0.5rem"}}>
            {doctors.length === 0 && <p style={{fontSize:"12px",color:"#64748b",textAlign:"center",marginTop:"1rem"}}>Loading doctors…</p>}
            {Array.from(roomMap.entries()).map(([id, meta]) => {
              const active = id === currentRoom;
              return (
                <button key={id} onClick={()=>switchRoom(id)}
                  style={{width:"100%",textAlign:"left",padding:"0.75rem",borderRadius:"0.75rem",display:"flex",flexDirection:"column",gap:"4px",cursor:"pointer",border:active?"1px solid rgba(99,102,241,0.3)":"1px solid transparent",background:active?"rgba(99,102,241,0.1)":"transparent",transition:"all 0.15s"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%"}}>
                    <span style={{fontWeight:500,fontSize:"13px",color:active?"#e2e8f0":"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{meta.title}</span>
                    <span style={{width:"8px",height:"8px",borderRadius:"50%",background:active?"#818cf8":"transparent",flexShrink:0}}></span>
                  </div>
                  <span style={{fontSize:"10px",fontFamily:"monospace",color:"#64748b"}}>{meta.spec}</span>
                </button>
              );
            })}
          </nav>
          <div style={{padding:"1rem",background:"rgba(15,23,42,0.6)",borderTop:"1px solid rgba(71,85,105,0.4)",display:"flex",flexDirection:"column",gap:"6px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{width:"10px",height:"10px",borderRadius:"50%",background:connected?"#10b981":"#f43f5e",transition:"background 0.3s"}}></span>
              <span style={{fontSize:"12px",color:connected?"#34d399":"#fb7185",fontWeight:500}}>{connected?"Online":"Disconnected"}</span>
            </div>
            <div style={{fontSize:"10px",fontFamily:"monospace",color:"#64748b",background:"rgba(30,41,59,0.5)",padding:"4px 8px",borderRadius:"6px",border:"1px solid rgba(71,85,105,0.3)"}}>UID: {socketId}</div>
          </div>
        </aside>

        {/* CHAT WINDOW */}
        <div style={{flex:1,display:"flex",flexDirection:"column",background:"rgba(30,41,59,0.2)"}}>
          <header style={{padding:"1rem 1.5rem",background:"rgba(30,41,59,0.8)",borderBottom:"1px solid rgba(71,85,105,0.6)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <h1 style={{fontSize:"14px",fontWeight:600,letterSpacing:"0.05em",color:"#f1f5f9",margin:0}}>{currentMeta?.title ?? "—"}</h1>
              <p style={{fontSize:"12px",fontFamily:"monospace",color:"#64748b",margin:0}}>{currentMeta?`${currentMeta.spec} · ID: ${currentRoom}`:"Select a channel"}</p>
            </div>
          </header>

          <main style={{flex:1,overflowY:"auto",padding:"1.5rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
            {currentMeta && (
              <div style={{display:"flex",justifyContent:"center"}}>
                <span style={{fontSize:"11px",fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase",color:"#64748b",background:"rgba(15,23,42,0.4)",padding:"4px 12px",borderRadius:"100px",border:"1px solid rgba(30,41,59,0.8)"}}>
                  {currentMeta.notice}
                </span>
              </div>
            )}
            {currentMessages.map((msg, i) => (
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:msg.isMe?"flex-end":"flex-start"}}>
                <span style={{fontSize:"11px",color:"#94a3b8",marginBottom:"4px",paddingLeft:"4px"}}>
                  {msg.isMe ? "You" : `${currentMeta?.title ?? "User"}`}
                </span>
                <div style={{maxWidth:"80%",padding:"10px 16px",borderRadius:"1rem",fontSize:"14px",lineHeight:1.6,wordBreak:"break-word",background:msg.isMe?"#4f46e5":"rgba(51,65,85,0.8)",color:msg.isMe?"#fff":"#e2e8f0",borderTopRightRadius:msg.isMe?"4px":"1rem",borderTopLeftRadius:msg.isMe?"1rem":"4px"}}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef}/>
          </main>

          <footer style={{padding:"1rem",background:"rgba(30,41,59,0.8)",borderTop:"1px solid rgba(71,85,105,0.6)"}}>
            <form onSubmit={sendMessage} style={{display:"flex",gap:"8px",alignItems:"center"}}>
              <input
                type="text"
                placeholder="Send room message..."
                value={input}
                onChange={e=>setInput(e.target.value)}
                style={{flex:1,background:"rgba(15,23,42,0.8)",color:"#f1f5f9",fontSize:"14px",padding:"14px 16px",borderRadius:"12px",border:"1px solid rgba(71,85,105,0.8)",outline:"none",fontFamily:"system-ui,sans-serif"}}
              />
              <button type="submit" style={{background:"#4f46e5",color:"#fff",fontWeight:500,fontSize:"14px",padding:"14px 20px",borderRadius:"12px",border:"none",cursor:"pointer",boxShadow:"0 4px 14px rgba(79,70,229,0.3)"}}>
                Send
              </button>
            </form>
          </footer>
        </div>
      </div>
    </div>
  );
}
