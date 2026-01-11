// client/js/login.js
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    if (!username || !password) {
        errorMessage.textContent = '用户名和密码不能为空';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // 存储用户信息并跳转到聊天页面
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            window.location.href = 'chat.html';
        } else {
            errorMessage.textContent = data.message;
        }
    } catch (error) {
        console.error('登录错误:', error);
        errorMessage.textContent = '连接服务器失败';
    }
});