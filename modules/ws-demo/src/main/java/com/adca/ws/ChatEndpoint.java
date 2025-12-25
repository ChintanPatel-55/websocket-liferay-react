package com.adca.ws;

import com.liferay.portal.kernel.log.Log;
import com.liferay.portal.kernel.log.LogFactoryUtil;
import jakarta.websocket.*;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;
import org.osgi.service.component.annotations.Component;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

@Component(
        immediate = true,
        service = ChatEndpoint.class
)
@ServerEndpoint("/o/ws/chat/{userId}")
public class ChatEndpoint {

    private static final Log _log = LogFactoryUtil.getLog(ChatEndpoint.class);
    private static final Set<Session> _sessions = new CopyOnWriteArraySet<>();

    @OnOpen
    public void onOpen(Session session,  @PathParam("userId") String userId) {
        _sessions.add(session);
        session.getUserProperties().put("userId", userId);

        _log.info("========================================");
        _log.info("✅ WebSocket CONNECTED");
        _log.info("User ID: " + userId);
        _log.info("Session ID: " + session.getId());
        _log.info("Active Connections: " + _sessions.size());
        _log.info("========================================");

        try {
            session.getBasicRemote().sendText("Welcome! You are connected.");
        } catch (IOException e) {
            _log.error("Error sending welcome message", e);
        }
    }

    @OnMessage
    public void onMessage(String message, Session session) {
        String userId = (String) session.getUserProperties().get("userId");

        _log.info("MESSAGE from " + userId + ": " + message);

        try {
            session.getBasicRemote().sendText("Echo: " + message);
            _log.info("RESPONSE sent to " + userId);
        } catch (IOException e) {
            _log.error("Error sending message", e);
        }
    }

    @OnClose
    public void onClose(Session session) {
        _sessions.remove(session);
        String userId = (String) session.getUserProperties().get("userId");

        _log.info("========================================");
        _log.info("❌ WebSocket DISCONNECTED");
        _log.info("User ID: " + userId);
        _log.info("Remaining Connections: " + _sessions.size());
        _log.info("========================================");
    }

    @OnError
    public void onError(Session session, Throwable error) {
        String userId = (String) session.getUserProperties().get("userId");
        _log.error("WebSocket ERROR for user: " + userId, error);
    }
}
