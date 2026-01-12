# QQ-likeWebsocketChatSimulator

A web-based instant messaging system that simulates core features of QQ Web, built with modern web technologies including WebSocket, Node.js, and MySQL.
![image](https://github.com/Psychofish-c/QQ-likeWebsocketChatSimulator/blob/main/img/777f9dde-1a8b-45dc-ab48-3a6d86b6c5df.png)
## 🚀 Features

### Core Chat Functionality
- **Real-time Text Messaging**: Point-to-point instant text chat
- **Emoji Support**: Send, receive, and display emojis in messages
- **Image Sharing**: Upload, send, and display images in chat
- **User Presence**: Real-time online user list with status indicators

### Session Management
- **Group Chat**: "Everyone" chat room for all online users
- **Private Chat**: One-on-one private conversations
- **Session Isolation**: Separate message storage for each chat session
- **Unread Message Indicators**: Visual badges for unread messages

### Message Management
- **Local Storage**: Messages stored locally using browser's localStorage
- **Offline Access**: View historical messages when offline
- **Export/Import**: Backup and restore chat history via Base64-encoded TXT files
- **Message Persistence**: Messages preserved between browser sessions

### User System
- **Auto Registration**: New users automatically registered on first login
- **User Authentication**: Secure login with password hashing
- **Online Status**: Real-time user presence tracking

## 🛠️ Technology Stack

### Frontend
- **HTML5 & CSS3**: Responsive and modern UI
- **Vanilla JavaScript**: No framework dependencies
- **WebSocket API**: Real-time bidirectional communication
- **LocalStorage API**: Client-side message persistence
- **Base64 Encoding**: Message serialization for export/import

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web server framework
- **WebSocket (ws)**: Real-time communication protocol
- **MySQL**: Relational database for user management

### Development Tools
- **NPM**: Package management
- **Nodemon**: Development server with hot reload

## 📋 Prerequisites

### Required Software
- **Node.js** (v14.0.0 or higher)
- **MySQL** (v5.7 or higher)
- **Modern Web Browser** (Chrome 90+, Firefox 88+, Edge 90+)

### Required Ports
- **3000**: HTTP Server (configurable)
- **3001**: WebSocket Server (configurable)
- **3306**: MySQL Database (default)

## 🚀 Deployment Steps

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/Psychofish-c/QQ-likeWebsocketChatSimulator
cd QQ-likeWebsocketChatSimulator

# Create directory structure
mkdir -p server client/css client/js client/assets database
```
### 2.Database Setup
```sql
-- Log into MySQL
mysql -u root -p

-- Create database
CREATE DATABASE IF NOT EXISTS web_chat DEFAULT CHARACTER SET utf8mb4;

-- Use the database
USE web_chat;

-- Create users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Insert test users (password: 123456)
INSERT INTO users (username, password) VALUES
('user1', MD5('123456')),
('user2', MD5('123456')),
('user3', MD5('123456'));

-- Verify creation
SELECT * FROM users;
```
### 3.Backend Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Configure database connection
# Edit server/config.js with your MySQL credentials
```
### 4. Frontend Setup
```bash
# Copy all provided client files to their respective directories
# Ensure the following files are in place:
# - client/index.html (Login page)
# - client/chat.html (Main chat interface)
# - client/css/style.css (Styles)
# - client/js/login.js (Login logic)
# - client/js/chat-core.js (Core chat functionality)
# - client/js/chat-simple.js (Chat interface)
```
### 5. Start the Application
```bash
# Start the server (from server directory)
npm start

# Or for development with auto-reload
npm run dev
```
### 6. Access the Application

1. Open your browser
2. Navigate to: `http://localhost:3000`
3. Login with test credentials:
   - Username: `user1`, `user2`, or `user3`
   - Password: `123456`

## ⚙️ Customization Options

1. **Change Ports**: Modify ports in `server/config.js`
2. **Add More Emojis**: Edit emoji list in `client/js/chat-simple.js`
3. **Modify UI Styles**: Edit `client/css/style.css`
4. **Change Database**: Update connection settings in config

## 🧪 Testing the System

### Multi-User Testing
1. Open multiple browser windows/tabs
2. Log in with different users in each window
3. Test features:
   - Send messages in group chat
   - Start private conversations
   - Send images and emojis
   - Export/import chat history
   - Test user online/offline status

### Feature Verification Checklist
- [ ] User login/registration works
- [ ] Online user list updates in real-time
- [ ] Group messages broadcast to all users
- [ ] Private messages only visible to participants
- [ ] Emojis display correctly
- [ ] Images upload and display properly
- [ ] Chat history persists after refresh
- [ ] Export/import functions work
- [ ] Unread message indicators appear
- [ ] User selection states are visible

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Windows
taskkill /F /IM node.exe

# Linux/Mac
pkill -f node

# Or change ports in config.js
```
#### 2. MySQL Connection Errors
- Verify MySQL service is running
- Check credentials in `config.js`
- Ensure database and table exist

#### 3. Messages Not Displaying
- Clear browser cache: `Ctrl + Shift + R`
- Check WebSocket connection in browser console
- Verify localStorage is not disabled

#### 4. Images Not Sending
- Ensure images are under 5MB
- Check browser console for errors
- Verify file reading permissions

### Debug Mode
Enable debug logging by uncommenting console.log statements in:
- `server/server.js`
- `client/js/chat-simple.js`

## 📁 Project Structure
```
qq-web-chat/
├── server/                 # Backend server
│   ├── server.js          # Main server file
│   ├── config.js          # Configuration
│   ├── db.js             # Database operations
│   └── package.json      # Node.js dependencies
├── client/                # Frontend files
│   ├── index.html        # Login page
│   ├── chat.html         # Main chat interface
│   ├── css/
│   │   └── style.css     # Stylesheet
│   └── js/
│       ├── login.js      # Login handling
│       ├── chat-core.js  # Core chat logic
│       └── chat-simple.js # Chat interface
├── database/
│   └── init.sql          # Database schema
└── README.md             # This file
```
## 🔧 Future Enhancements

### Planned Features
1. **Message Encryption**: End-to-end encryption for private chats
2. **File Transfer**: Support for various file types
3. **Message Recall**: Ability to recall sent messages
4. **Read Receipts**: See when messages are read
5. **Group Creation**: User-created chat groups
6. **Voice/Video Calls**: WebRTC integration
7. **Database Message Storage**: Server-side message persistence
8. **User Profiles**: Avatar and status message support

### Technical Improvements
1. **React/Vue Migration**: Modern frontend framework
2. **TypeScript Integration**: Type safety
3. **Docker Deployment**: Containerization
4. **Redis Integration**: Caching and session management
5. **JWT Authentication**: Enhanced security
6. **Unit Tests**: Comprehensive test coverage

## 📄 License

This project is open source and available for educational purposes. Feel free to modify and distribute with proper attribution.

## 🙏 Acknowledgments

### Credits
- **Emoji Support**: Unicode emoji characters
- **UI Design**: Inspired by modern chat applications
- **Icons**: Font Awesome for interface icons
- **WebSocket Protocol**: Real-time communication standard

### Special Thanks
- Contributors and testers who helped refine the system
- Open source community for invaluable resources and tools
- Modern web standards that make real-time communication possible

### Educational Purpose
This project was developed as an educational exercise to demonstrate:
- Real-time web application development
- WebSocket implementation
- Client-server architecture
- Database integration with Node.js
- Local storage utilization
- Responsive web design principles

## 🤝 Contributing

Contributions are welcome! Please feel free to:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request
4. Report bugs or suggest features via issues

## 📞 Support

For questions or issues:
1. Check the troubleshooting section
2. Review the code comments
3. Open an issue on GitHub
4. Contact the maintainers
5. ![image](https://github.com/Psychofish-c/QQ-likeWebsocketChatSimulator/blob/main/img/b582f39087daa3ec7a8b4f60e29ea029.jpg)
