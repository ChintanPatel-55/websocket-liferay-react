import React, { useState, useEffect, useRef } from "react";

const ChatWidget = () => {
    // --- State: Chat & Connection ---
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [targetUserId, setTargetUserId] = useState("");
    const [targetUserName, setTargetUserName] = useState(""); // New: Store partner name
    const [inputText, setInputText] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    // --- State: User List Sidebar ---
    const [userList, setUserList] = useState([]);
    const [filteredUserList, setFilteredUserList] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSidebar, setShowSidebar] = useState(true);

    // --- Refs ---
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const lastTypedTime = useRef(0);

    // --- Liferay Context ---
    const myUserId = window.Liferay?.ThemeDisplay?.getUserId() || "Guest";
    const myName = window.Liferay?.ThemeDisplay?.getUserName() || "Me";
    const siteGroupId = window.Liferay?.ThemeDisplay?.getSiteGroupId();

    // 1. FETCH USERS (The New Feature)
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = () => {
        // Fetch users from Liferay's standard Headless API
        // Filter: status eq 0 (Active Users)
        Liferay.Util.fetch(
            `/o/headless-admin-user/v1.0/user-accounts?filter=status eq 0&sort=name:asc`
        )
            .then(response => response.json())
            .then(data => {
                if (data.items) {
                    // Filter out MYSELF from the list
                    const others = data.items.filter(u => String(u.id) !== String(myUserId));
                    setUserList(others);
                    setFilteredUserList(others);
                }
            })
            .catch(error => {
                console.error("Error fetching users:", error);
                // Fallback: If you don't have permission for all users, try site users
                // fetchSiteUsers();
            });
    };

    // Filter list when search term changes
    useEffect(() => {
        const lowerSearch = searchTerm.toLowerCase();
        const filtered = userList.filter(u =>
            u.name.toLowerCase().includes(lowerSearch) ||
            u.emailAddress.toLowerCase().includes(lowerSearch)
        );
        setFilteredUserList(filtered);
    }, [searchTerm, userList]);


    // 2. WEB SOCKET CONNECTION
    useEffect(() => {
        if (myUserId === "Guest") return;
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const url = `${protocol}//${window.location.host}/o/ws/chat?userId=${myUserId}`;

        socketRef.current = new WebSocket(url);
        socketRef.current.onopen = () => setConnected(true);
        socketRef.current.onmessage = (event) => {
            const data = event.data;
            if (data === "SIGNAL_TYPING") {
                setIsTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
                return;
            }
            setIsTyping(false);
            setMessages((prev) => [...prev, data]);
            setTimeout(scrollToBottom, 100);
        };
        socketRef.current.onclose = () => setConnected(false);
        return () => { socketRef.current?.close(); };
    }, [myUserId]);

    // 3. LOAD HISTORY (When clicking a user)
    useEffect(() => {
        if (targetUserId && myUserId !== "Guest") {
            setMessages([]);
            fetchHistory();
        }
    }, [targetUserId]);

    const selectUser = (user) => {
        setTargetUserId(user.id);
        setTargetUserName(user.name);
        // On mobile, maybe hide sidebar after selection
        if (window.innerWidth < 600) setShowSidebar(false);
    };

    const fetchHistory = () => {
        // NOTE: Ensure 'receiverId' matches your Liferay Object Field Name exactly!
        const filter = `(senderId eq ${myUserId} and receiverId eq ${targetUserId}) or (senderId eq ${targetUserId} and receiverId eq ${myUserId})`;

        Liferay.Util.fetch(
            `/o/c/chatmessages?filter=${encodeURIComponent(filter)}&sort=id:asc&pageSize=50`
        )
            .then(response => response.json())
            .then(data => {
                if (data.items) {
                    const history = data.items.map(item => {
                        const isMe = String(item.senderId) === String(myUserId);
                        // Use the real name if we selected a user, otherwise generic
                        const nameToUse = isMe ? myName : (targetUserName || "Partner");
                        return `[Private] ${nameToUse}: ${item.messageText}`;
                    });
                    setMessages(history);
                    setTimeout(scrollToBottom, 200);
                }
            })
            .catch(error => console.error("Error loading history", error));
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = () => {
        if (!targetUserId || !inputText) return;
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const payload = { type: "MESSAGE", toUserId: parseInt(targetUserId), text: inputText };
            socketRef.current.send(JSON.stringify(payload));
            setInputText("");
        }
    };

    const handleInputChange = (e) => {
        setInputText(e.target.value);
        const now = Date.now();
        if (now - lastTypedTime.current > 2000 && targetUserId) {
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                const payload = { type: "TYPING", toUserId: parseInt(targetUserId), text: "" };
                socketRef.current.send(JSON.stringify(payload));
                lastTypedTime.current = now;
            }
        }
    };

    const parseMessage = (msg) => {
        let isMine = false;
        let content = msg;
        let sender = "System";
        if (msg.startsWith("[Private]")) {
            const match = msg.match(/\[Private\] (.*?): (.*)/);
            if (match) {
                sender = match[1];
                content = match[2];
                isMine = (sender === myName);
            }
        }
        return { isMine, sender, content, isSystem: sender === "System" };
    };

    return (
        <div style={styles.mainContainer}>
            {/* --- LEFT SIDEBAR: User List --- */}
            {showSidebar && (
                <div style={styles.sidebar}>
                    <div style={styles.sidebarHeader}>
                        <span style={{fontWeight:'bold'}}>Contacts</span>
                        <div style={styles.onlineBadge}>{filteredUserList.length} Found</div>
                    </div>
                    <div style={{padding:'8px'}}>
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>
                    <div style={styles.userList}>
                        {filteredUserList.map(user => (
                            <div
                                key={user.id}
                                onClick={() => selectUser(user)}
                                style={{
                                    ...styles.userItem,
                                    background: String(user.id) === String(targetUserId) ? '#e6f7ff' : 'transparent'
                                }}
                            >
                                <div style={styles.avatar}>{user.name.charAt(0)}</div>
                                <div style={{overflow:'hidden'}}>
                                    <div style={styles.userName}>{user.name}</div>
                                    {/*<div style={styles.userEmail}>{user.emailAddress}</div>*/}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- RIGHT SIDE: Chat Window --- */}
            <div style={styles.chatContainer}>
                <div style={styles.header}>
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                        <button onClick={() => setShowSidebar(!showSidebar)} style={styles.toggleBtn}>☰</button>
                        <div style={{display:'flex', flexDirection:'column'}}>
                            <span style={{fontSize:'14px', fontWeight:'bold'}}>
                                {targetUserName ? `Chat with ${targetUserName}` : "Select a User"}
                            </span>
                            <span style={{fontSize:'10px', opacity: 0.8}}>My ID: {myUserId}</span>
                        </div>
                    </div>

                    {/* --- UPDATED LABEL HERE --- */}
                    <span style={{ color: connected ? "#fff" : "#ffcccc", fontSize:'10px', background: connected ? 'rgba(255,255,255,0.2)' : 'rgba(255,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                        {connected ? "⚡ Connected" : "⚠ Offline"}
                    </span>
                </div>

                <div style={styles.messageArea}>
                    {!targetUserId && (
                        <div style={styles.emptyState}>
                            <div style={{fontSize:'40px'}}>👋</div>
                            <p>Select a user from the left to start chatting.</p>
                        </div>
                    )}

                    {messages.map((msg, index) => {
                        const { isMine, sender, content, isSystem } = parseMessage(msg);
                        if (isSystem) return <div key={index} style={styles.systemMessage}>{msg}</div>;
                        return (
                            <div key={index} style={{...styles.msgRow, justifyContent: isMine ? 'flex-end' : 'flex-start'}}>
                                {!isMine && <div style={styles.tinyAvatar}>{sender.charAt(0)}</div>}
                                <div style={isMine ? styles.bubbleMine : styles.bubbleOther}>
                                    {!isMine && <div style={styles.senderName}>{sender}</div>}
                                    {content}
                                </div>
                            </div>
                        );
                    })}
                    {isTyping && <div style={styles.typingIndicator}>Typing...</div>}
                    <div ref={messagesEndRef} />
                </div>

                <div style={styles.controls}>
                    <input
                        type="text"
                        placeholder={targetUserId ? "Type a message..." : "Select a user first..."}
                        value={inputText}
                        disabled={!targetUserId}
                        onChange={handleInputChange}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        style={styles.inputMsg}
                    />
                    <button onClick={handleSendMessage} disabled={!targetUserId} style={styles.sendBtn}>➤</button>
                </div>
            </div>
            <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
        </div>
    );
};

const styles = {
    mainContainer: { display: 'flex', width: '100%', height: '400px', border: "1px solid #e0e0e0", borderRadius: "8px", background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflow:'hidden' },

    // Sidebar Styles
    sidebar: { width: '220px', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', background: '#f9f9f9' },
    sidebarHeader: { padding: '10px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background:'#eee' },
    onlineBadge: { fontSize:'10px', background:'#4caf50', color:'#fff', padding:'2px 6px', borderRadius:'10px' },
    searchInput: { width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize:'12px' },
    userList: { flex: 1, overflowY: 'auto' },
    userItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s' },
    userName: { fontSize: '13px', fontWeight: '500', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    userEmail: { fontSize: '10px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

    // Chat Area Styles (Right Side)
    chatContainer: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' },
    header: { background: "#075e54", color: "#fff", padding: "10px 15px", display: "flex", justifyContent: "space-between", alignItems: 'center', height: '50px' },
    toggleBtn: { background:'transparent', border:'none', color:'#fff', fontSize:'18px', cursor:'pointer', marginRight:'8px' },

    messageArea: { flex: 1, overflowY: "auto", padding: "15px", display: "flex", flexDirection: "column", gap: "8px", background: '#efe7dd' },
    emptyState: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#999', textAlign:'center', padding:'20px' },

    msgRow: { display: 'flex', alignItems: 'flex-end', gap: '8px' },
    tinyAvatar: { width:'24px', height:'24px', borderRadius:'50%', background:'#ccc', color:'#fff', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'5px' },
    avatar: { width:'32px', height:'32px', borderRadius:'50%', background:'#007bff', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'14px', flexShrink: 0 },

    bubbleMine: { padding: "8px 12px", borderRadius: "10px 10px 0 10px", background: "#dcf8c6", color: "#111", fontSize: "14px", maxWidth: "80%", boxShadow: "0 1px 1px rgba(0,0,0,0.1)" },
    bubbleOther: { padding: "8px 12px", borderRadius: "10px 10px 10px 0", background: "#fff", color: "#111", fontSize: "14px", maxWidth: "80%", boxShadow: "0 1px 1px rgba(0,0,0,0.1)" },
    senderName: { fontSize: '10px', color: '#e57373', fontWeight: 'bold', marginBottom: '2px' },
    systemMessage: { textAlign: 'center', fontSize: '11px', color: '#888', margin:'5px 0' },

    controls: { padding: "10px", background: "#f0f0f0", borderTop: "1px solid #ddd", display: "flex", gap: "8px" },
    inputMsg: { flex: 1, padding: "10px", border: "1px solid #ccc", borderRadius: "20px", fontSize: "14px", outline:'none' },
    sendBtn: { background: "#075e54", color: "#fff", border: "none", width:'35px', height:'35px', borderRadius: "50%", cursor: "pointer", display:'flex', alignItems:'center', justifyContent:'center' },
    typingIndicator: { fontSize: '11px', color: '#888', marginLeft: '35px', fontStyle: 'italic' }
};

export default ChatWidget;