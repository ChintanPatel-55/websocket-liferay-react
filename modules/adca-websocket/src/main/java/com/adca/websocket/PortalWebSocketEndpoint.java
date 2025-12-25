package com.adca.websocket;


import com.liferay.object.model.ObjectDefinition;
import com.liferay.object.service.ObjectDefinitionLocalService;
import com.liferay.object.service.ObjectEntryLocalService;
import com.liferay.portal.kernel.json.JSONArray;
import com.liferay.portal.kernel.json.JSONFactoryUtil;
import com.liferay.portal.kernel.json.JSONObject;
import com.liferay.portal.kernel.model.User;
import com.liferay.portal.kernel.service.ServiceContext;
import com.liferay.portal.kernel.service.UserLocalService;
import com.liferay.portal.kernel.util.GetterUtil;
import jakarta.websocket.*;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

import java.io.IOException;
import java.io.Serializable;
import java.util.*;

/**
 * @author root500
 */
@Component(
	property = {
        "org.osgi.http.websocket.endpoint.path=/o/ws/chat"
	},
    service = Endpoint.class
)
public class PortalWebSocketEndpoint extends Endpoint {

    private static final Set<Session> _sessions = Collections.synchronizedSet(new HashSet<>());

    @Reference
    private UserLocalService _userLocalService;

    @Reference
    private ObjectEntryLocalService _objectEntryLocalService;

    @Reference
    private ObjectDefinitionLocalService _objectDefinitionLocalService;

    @Override
    public void onOpen(Session session, EndpointConfig endpointConfig) {

            String userIdStr = getQueryParam(session.getQueryString(), "userId");
            long userId = GetterUtil.getLong(userIdStr);
            String realName = "Guest user";

            if (userId > 0) {
                try {
                    User user = _userLocalService.getUser(userId);
                    realName = user.getFullName();
                } catch (Exception e) {
                    System.out.println("Could not find the user wit id : " + userId);
                }
            }

            session.getUserProperties().put("userId", userId);
            session.getUserProperties().put("realName", realName);
            _sessions.add(session);

            broadcastOnlineUsers();

            session.addMessageHandler(new MessageHandler.Whole<String>() {
            @Override
            public void onMessage(String jsonMessage) {
                try {

                    JSONObject jsonObject = JSONFactoryUtil.createJSONObject(jsonMessage);

                    long toUserId = jsonObject.getLong("toUserId");
                    String type = jsonObject.getString("type", "MESSAGE");

                    if ("TYPING".equals(type)) {
                        // Just notify the other user that we are typing
                        sendTypingSignal(session, toUserId);
                    } else {
                        // Normal Chat Message logic
                        String text = jsonObject.getString("text");
                        sendPrivateMessage(session, toUserId, text);
                        saveToLiferayObject(session, toUserId, text);
                    }

                } catch (Exception e) {
                    // Fallback if not JSON (optional)
                    System.out.println("Invalid message format: " + e.getMessage());
                }
            }
        });
    }

    public void saveToLiferayObject(Session session, long receiverId, String text) {
        System.out.println(">>> DEBUG: saveToLiferayObject INVOKED with text: " + text);

        try {
            long senderId = (Long) session.getUserProperties().get("userId");
            User sender = _userLocalService.getUser(senderId);
            long companyId = sender.getCompanyId();
            long userId = senderId;


            ObjectDefinition def = _objectDefinitionLocalService.getObjectDefinition(
                    companyId,
                    "C_ChatMessage"
                        );

            if (def == null) {
                System.out.println("Could not find object definition with id : " + companyId);
                return;
            }

            Map<String, Serializable> map = new HashMap<>();
            map.put("messageText", text);
            map.put("senderId", senderId);
            map.put("receiverId", receiverId);

            ServiceContext  serviceContext = new ServiceContext();
            serviceContext.setCompanyId(companyId);
            serviceContext.setUserId(userId);
            serviceContext.setScopeGroupId(0);

            _objectEntryLocalService.addObjectEntry(
                    0L,
                    userId,
                    def.getObjectDefinitionId(),
                    0L,
                    null,
                    map,
                    serviceContext
            );
            System.out.println("Message save to DB!!" );
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void sendTypingSignal(Session senderSession, long toUserId) {
        synchronized (_sessions) {
            for (Session session : _sessions) {
                Long sUserId = (Long) session.getUserProperties().get("userId");
                if (sUserId != null && sUserId == toUserId) {
                    // Send a simple "TYPING" string to the receiver
                    sendText(session, "SIGNAL_TYPING");
                }
            }
        }
    }

    private void sendPrivateMessage(Session senderSession, long toUserId, String message) {
        String senderName = (String) senderSession.getUserProperties().get("realName");
        String formattedMsg = "[Private] " + senderName + ": " + message;

        synchronized (_sessions) {
            for (Session session : _sessions) {
                Long sUserId = (Long) session.getUserProperties().get("userId");
                if (sUserId != null && sUserId == toUserId) {
                    sendText(session,formattedMsg);
                }
                if (session.equals(senderSession)) {
                    sendText(session, formattedMsg);
                }
            }
        }
    }

//    private void broadcast(String message) {
//        synchronized (_sessions) {
//            for (Session session : _sessions) {
//                if (session.isOpen()) {
//                    try {
//                        session.getBasicRemote().sendText(message);
//                    } catch (IOException e) {
//                        e.printStackTrace();
//                    }
//                }
//            }
//        }
//    }

    private void sendText(Session s, String msg) {
        if (s.isOpen()) {
            try {
                s.getBasicRemote().sendText(msg);
            } catch (IOException e) { e.printStackTrace(); }
        }
    }

    private String getQueryParam(String queryString,String key) {
        if (queryString != null) {
            for (String param : queryString.split("&")) {
                String[] pair = param.split("=");
                if (pair.length == 2 && pair[0].equals(key)) {
                    return pair[1];
                }
            }
        }
        return null;
    }

    private void broadcastOnlineUsers() {
        try {
            JSONArray activeIds = JSONFactoryUtil.createJSONArray();
            synchronized (_sessions) {
                for (Session session : _sessions) {
                    Long sUserId = (Long) session.getUserProperties().get("userId");
                    if (sUserId != null && sUserId > 0) {
                        activeIds.put(sUserId);
                    }
                }
            }

            JSONObject msg = JSONFactoryUtil.createJSONObject();
            msg.put("type", "ONLINE_USERS");
            msg.put("activeIds", activeIds);

            String jsonString = msg.toString();

            synchronized (_sessions) {
                for (Session session : _sessions) {
                    if (session.isOpen()) {
                        session.getBasicRemote().sendText(jsonString);
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void onClose(Session session, CloseReason closeReason) {
        _sessions.remove(session);
        String name = (String) session.getUserProperties().get("realName");
        broadcastOnlineUsers();
    }

    @Override
    public void onError(Session session, Throwable throwable) {
        _sessions.remove(session);
        throwable.printStackTrace();
    }
}