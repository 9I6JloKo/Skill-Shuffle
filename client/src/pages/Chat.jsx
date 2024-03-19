import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { Row, Col, Stack } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import cryptoJs from 'crypto-js';
import { Client } from '@stomp/stompjs';
import axios from 'axios';

import { API_SERVER, WEBSOCKET_URL, SERVER_URL, ENCRYPTION_KEY } from '../config';
import { useAuth } from '../components/AuthContext';

import imagePlaceholder from '../assets/icons/image-placeholder.svg';

function Chat() {
  const { authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chats, setChats] = useState([]);
  const clientRef = useRef(null);
  const [choosenChat, setChoosenChat] = useState({});
  const [messageContent, setMessageContent] = useState("");
  const messagesListRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Scroll to the bottom of the current chat
  useLayoutEffect(() => {
    scrollToBottom();
  }, [choosenChat]);

  useEffect(() => {
    const encryptedChatId = new URLSearchParams(location.search).get('c');
    if (encryptedChatId) {
      try {
        const decryptedChatId = cryptoJs.AES.decrypt(encryptedChatId, ENCRYPTION_KEY).toString(cryptoJs.enc.Utf8);
        if (decryptedChatId === '' || isNaN(decryptedChatId)) {
          console.error('Invalid decrypted chat ID');
          return;
        }
        console.log("Decrypted Chat ID:", decryptedChatId);
        getChatMessages(decryptedChatId);
      } catch (error) {
        console.error("Error decrypting chat ID:", error);
      }
    }
  }, [location.search]);

  useEffect(() => {
    axios.get(`${API_SERVER}/auth/confirm`, { withCredentials: true })
      .then(response => {
        // Create a new WebSocket client
        const newClient = new Client();
        const websocketUrl = `ws://${WEBSOCKET_URL}`;

        // Connect to the WebSocket after receiving the JWT token
        newClient.configure({
          brokerURL: websocketUrl,
          connectHeaders: {
            Authorization: `Bearer ${response.data.access_token}`
          },
        });

        newClient.activate();
        clientRef.current = newClient;
      });
  }, []);

  useEffect(() => {
    axios.get(`${API_SERVER}/chats`, { withCredentials: true })
      .then(response => {
        setChats(response.data);
      })
      .catch(error => {
        if (error.response) {
          console.error(error.response.data.message);
        }
      });
  }, []);

  const getChats = async () => {
    try {
      const response = await axios.get(`${API_SERVER}/chats`, { withCredentials: true });
      setChats(response.data);
    } catch (error) {
      if (error.response) {
        console.error(error.response.data.message);
      }
    }
  };

  const getChatMessages = async (chatId) => {
    try {
      const response = await axios.get(`${API_SERVER}/chats/${chatId}`, { withCredentials: true });
      setChoosenChat(response.data);
      subscribeToChatMessages(response.data);
    } catch (error) {
      if (error.response) {
        console.error(error.response.data.message);
      }
    }
  };

  const sendMessage = () => {
    setMessageContent('');
    const destination = `/app/chat/${choosenChat.id}`;
    const message = {
      sender: {
        nickname: authUser.nickname,
        first_name: authUser.first_name,
        last_name: authUser.last_name,
        avatar_url: authUser.avatar_url
      },
      chat: { id: choosenChat.id },
      content: messageContent,
      timestamp: new Date().toISOString()
    };
    if (clientRef.current != null) {
      // Send the message to the server
      clientRef.current.publish({
        destination,
        body: JSON.stringify(message),
      });
    }
  };

  // Function to handle Enter key press
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };

  const subscribeToChatMessages = (chat) => {
    const destination = `/user/chat/${chat.id}`;
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe(); // Unsubscribe from previous chat
    }
    const newSubscription = clientRef.current.subscribe(destination, (receivedMessage) => {
      // Process the received message
      const message = JSON.parse(receivedMessage.body);

      // Update the chat history with the new message
      setChoosenChat((prevChat) => ({
        ...prevChat,
        messages: [...prevChat.messages, ...message],
      }));
    });
    subscriptionRef.current = newSubscription; // Store the new subscription
  };

  const formatTimestampForMessage = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}:${minutes}`;
  }

  const formatTimestampForChatContainer = (timestamp) => {
    const date = new Date(timestamp);
    const currentDate = new Date();
    const difference = currentDate - date;

    if (difference > 31536000000) {
      // dd/mmm/yyyy if the message was sent more than a year ago
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } else if (difference > 86400000) {
      // dd/mmm if the message was sent less than a year ago but more than a day ago
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } else {
      // hh:mm if the message was sent less than a day ago
      return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: 'numeric' });
    }
  }

  const scrollToBottom = () => {
    if (messagesListRef.current) {
      messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
    }
  };

  return (
    <Row className="chat-page">
      <Col className="chat-list" lg={3}>
        {chats.map(chat => (
          <Row className='chat-container' key={chat.id} onClick={() => {
            const encryptedChatId = cryptoJs.AES.encrypt(chat.id.toString(), ENCRYPTION_KEY).toString();
            navigate(`/messenger?c=${encryptedChatId}`);
          }}>
            <Col lg={2} className='chat-avatar d-flex justify-content-center'>
              <img
                src={chat.avatar_url !== null ? `${SERVER_URL}/${chat.avatar_url}` : imagePlaceholder}
                alt={chat.name}
                width={50}
                height={50}
                style={{ borderRadius: 50, objectFit: 'cover' }}
              />
            </Col>
            <Col className='chat-info p-0'>
              <p className='chat-name d-flex justify-content-between'>
                {chat.name}
                <span>{formatTimestampForChatContainer(chat.last_message.timestamp)}</span>
              </p>
              <p className='last-message'>{chat.last_message.content}</p>
            </Col>
          </Row>
        ))}
      </Col>
      {choosenChat.id === undefined ? (
        <Col className='chat-box non-selected' key={choosenChat.id}>
          <p className='no-chat-selected'>Select a chat to start messaging</p>
        </Col>
      ) :
        <Col className='chat-box d-flex flex-nowrap flex-column' key={choosenChat.id}>
          <Row className='chat-header'>
            <Col lg={1}>
              <img
                src={choosenChat.avatar_url !== null ? `${SERVER_URL}/${choosenChat.avatar_url}` : imagePlaceholder}
                alt={choosenChat.name}
                width={50}
                height={50}
                style={{ borderRadius: 50, objectFit: 'cover' }}
              />
            </Col>
            <Col>
              <p className='chat-name'>{choosenChat.name}</p>
            </Col>
          </Row>
          <Row className='messages-list p-0' ref={messagesListRef}>
            <Stack direction='vertical' gap={2}>
              {choosenChat.messages && choosenChat.messages.map((message, index) => (
                <div
                  className={`message d-flex ${message.sender && message.sender.nickname === authUser.nickname ? 'own-message' : 'other-message'}`}
                  key={index}
                >
                  <img
                    src={message.sender && message.sender.avatar_url ? `${SERVER_URL}/${message.sender.avatar_url}` : imagePlaceholder}
                    alt={message.sender && message.sender.first_name}
                    width={30}
                    height={30}
                    style={{ borderRadius: 50, objectFit: 'cover' }}
                  />
                  <div className="message-content">
                    <p><strong>{message.sender && message.sender.first_name}</strong></p>
                    <p>{message.content}</p>
                  </div>
                  <div className="message-time-container">
                    <p className='message-time'>{formatTimestampForMessage(message.timestamp)}</p>
                  </div>
                </div>
              ))}
            </Stack>
          </Row>
          <Row className="message-input p-0">
            <input
              type='text'
              aria-label='Message'
              placeholder="Message"
              value={messageContent}
              onChange={(event) => { setMessageContent(event.target.value); }}
              onKeyDown={handleKeyPress}
            />
            <button className='btn btn-outline-primary' onClick={sendMessage}>Send</button>
          </Row>
        </Col>
      }
    </Row>
  );
}

export default Chat;