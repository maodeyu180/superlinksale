let authToken = localStorage.getItem('authToken');

document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        showDashboard();
    } else {
        showLoginModal();
    }
});

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    loadLinks();
    loadTemplates();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = data.access_token;
            localStorage.setItem('authToken', authToken);
            errorDiv.textContent = '';
            showDashboard();
        } else {
            errorDiv.textContent = '密码错误，请重试';
        }
    } catch (error) {
        errorDiv.textContent = '登录失败，请稍后重试';
    }
});

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    showLoginModal();
}

document.querySelectorAll('.menu-item[data-tab]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;
        
        document.querySelectorAll('.menu-item[data-tab]').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(tab + 'Tab').classList.add('active');
        
        if (tab === 'links') {
            loadLinks();
        } else if (tab === 'templates') {
            loadTemplates();
        }
    });
});

async function loadLinks() {
    try {
        const response = await fetch('/api/links', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const links = await response.json();
            displayLinks(links);
            updateLinkStats(links);
        } else if (response.status === 401) {
            logout();
        }
    } catch (error) {
        console.error('Failed to load links:', error);
    }
}

function displayLinks(links) {
    const tbody = document.getElementById('linksTableBody');

    if (links.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">暂无数据</td></tr>';
        return;
    }

    tbody.innerHTML = links.map(link => `
        <tr>
            <td class="short-code-cell">${link.short_code}</td>
            <td>${link.title || '-'}</td>
            <td class="url-cell" title="${link.original_url || '-'}">${link.original_url || '-'}</td>
            <td>${link.click_count}</td>
            <td>${link.expire_at ? new Date(link.expire_at).toLocaleString('zh-CN') : '永久'}</td>
            <td>${new Date(link.created_at).toLocaleString('zh-CN')}</td>
            <td class="action-buttons">
                <button class="btn-copy" onclick="copyFullLink(event, '${link.short_code}')" title="复制完整链接">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke-width="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke-width="2"/>
                    </svg>
                </button>
                <button class="btn-edit" onclick="editLink('${link.short_code}')">编辑</button>
                <button class="btn-danger" onclick="deleteLink('${link.short_code}')">删除</button>
            </td>
        </tr>
    `).join('');
}

function updateLinkStats(links) {
    const totalLinks = links.length;
    const totalClicks = links.reduce((sum, link) => sum + link.click_count, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLinks = links.filter(link => new Date(link.created_at) >= today).length;
    
    animateValue('totalLinksCount', 0, totalLinks, 1000);
    animateValue('totalClicksCount', 0, totalClicks, 1000);
    animateValue('todayLinksCount', 0, todayLinks, 1000);
}

function animateValue(id, start, end, duration) {
    const element = document.getElementById(id);
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}

async function loadTemplates() {
    try {
        const response = await fetch('/api/templates', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const templates = await response.json();
            displayTemplates(templates);
            updateTemplateSelect(templates);
        } else if (response.status === 401) {
            logout();
        }
    } catch (error) {
        console.error('Failed to load templates:', error);
    }
}

function displayTemplates(templates) {
    const grid = document.getElementById('templatesGrid');
    
    if (templates.length === 0) {
        grid.innerHTML = `
            <div class="template-card empty-state">
                <div class="empty-icon">📝</div>
                <p>暂无模板</p>
                <p class="empty-hint">点击上方按钮创建第一个模板</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = templates.map(template => `
        <div class="template-card">
            <div class="template-header">
                <div>
                    <div class="template-name">${template.name}</div>
                    <div class="template-meta">创建于 ${new Date(template.created_at).toLocaleDateString('zh-CN')}</div>
                </div>
            </div>
            <div class="template-body">
                ${template.title ? `
                    <div class="template-field">
                        <div class="template-field-label">标题</div>
                        <div class="template-field-value">${template.title}</div>
                    </div>
                ` : ''}
                ${template.description ? `
                    <div class="template-field">
                        <div class="template-field-label">描述</div>
                        <div class="template-field-value">${template.description}</div>
                    </div>
                ` : ''}
                ${template.notes ? `
                    <div class="template-field">
                        <div class="template-field-label">备注</div>
                        <div class="template-field-value">${template.notes}</div>
                    </div>
                ` : ''}
            </div>
            <div class="template-actions">
                <button class="btn-edit" onclick="editTemplate(${template.id})">编辑</button>
                <button class="btn-danger" onclick="deleteTemplate(${template.id})">删除</button>
            </div>
        </div>
    `).join('');
}

function updateTemplateSelect(templates) {
    const select = document.getElementById('templateSelect');
    select.innerHTML = '<option value="">选择模板快速填充</option>' + 
        templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

function showCreateLinkModal() {
    document.getElementById('linkModalTitle').textContent = '创建短链接';
    document.getElementById('linkSubmitText').textContent = '创建';
    document.getElementById('linkForm').reset();
    document.getElementById('linkId').value = '';
    document.getElementById('linkModal').style.display = 'flex';
}

function closeLinkModal() {
    document.getElementById('linkModal').style.display = 'none';
}

document.getElementById('linkForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const linkId = document.getElementById('linkId').value;
    const maxClicksValue = document.getElementById('linkMaxClicks').value;
    const data = {
        original_url: document.getElementById('linkOriginalUrl').value,
        title: document.getElementById('linkTitle').value || null,
        description: document.getElementById('linkDescription').value || null,
        expire_at: document.getElementById('linkExpireAt').value || null,
        max_clicks: maxClicksValue ? parseInt(maxClicksValue) : null
    };
    
    try {
        const url = linkId ? `/api/links/${linkId}` : '/api/links';
        const method = linkId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeLinkModal();
            loadLinks();
        } else if (response.status === 401) {
            logout();
        } else {
            alert('操作失败，请重试');
        }
    } catch (error) {
        alert('操作失败，请重试');
    }
});

async function editLink(shortCode) {
    try {
        const response = await fetch(`/api/links/${shortCode}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const link = await response.json();
            document.getElementById('linkModalTitle').textContent = '编辑短链接';
            document.getElementById('linkSubmitText').textContent = '保存';
            document.getElementById('linkId').value = shortCode;
            document.getElementById('linkOriginalUrl').value = link.original_url;
            document.getElementById('linkTitle').value = link.title || '';
            document.getElementById('linkDescription').value = link.description || '';
            
            if (link.expire_at) {
                const date = new Date(link.expire_at);
                const offset = date.getTimezoneOffset();
                const localDate = new Date(date.getTime() - offset * 60 * 1000);
                document.getElementById('linkExpireAt').value = localDate.toISOString().slice(0, 16);
            } else {
                document.getElementById('linkExpireAt').value = '';
            }

            document.getElementById('linkMaxClicks').value = link.max_clicks || '';

            document.getElementById('linkModal').style.display = 'flex';
        }
    } catch (error) {
        alert('加载失败，请重试');
    }
}

async function deleteLink(shortCode) {
    if (!confirm('确定要删除这个短链接吗？')) return;
    
    try {
        const response = await fetch(`/api/links/${shortCode}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            loadLinks();
        } else if (response.status === 401) {
            logout();
        } else {
            alert('删除失败，请重试');
        }
    } catch (error) {
        alert('删除失败，请重试');
    }
}

function showCreateTemplateModal() {
    document.getElementById('templateModalTitle').textContent = '创建模板';
    document.getElementById('templateSubmitText').textContent = '创建';
    document.getElementById('templateForm').reset();
    document.getElementById('templateId').value = '';
    document.getElementById('templateModal').style.display = 'flex';
}

function closeTemplateModal() {
    document.getElementById('templateModal').style.display = 'none';
}

document.getElementById('templateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const templateId = document.getElementById('templateId').value;
    const data = {
        name: document.getElementById('templateName').value,
        title: document.getElementById('templateTitle').value || null,
        description: document.getElementById('templateDescription').value || null,
        notes: document.getElementById('templateNotes').value || null
    };
    
    try {
        const url = templateId ? `/api/templates/${templateId}` : '/api/templates';
        const method = templateId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeTemplateModal();
            loadTemplates();
        } else if (response.status === 401) {
            logout();
        } else {
            alert('操作失败，请重试');
        }
    } catch (error) {
        alert('操作失败，请重试');
    }
});

async function editTemplate(templateId) {
    try {
        const response = await fetch(`/api/templates/${templateId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const template = await response.json();
            document.getElementById('templateModalTitle').textContent = '编辑模板';
            document.getElementById('templateSubmitText').textContent = '保存';
            document.getElementById('templateId').value = templateId;
            document.getElementById('templateName').value = template.name;
            document.getElementById('templateTitle').value = template.title || '';
            document.getElementById('templateDescription').value = template.description || '';
            document.getElementById('templateNotes').value = template.notes || '';
            document.getElementById('templateModal').style.display = 'flex';
        }
    } catch (error) {
        alert('加载失败，请重试');
    }
}

async function deleteTemplate(templateId) {
    if (!confirm('确定要删除这个模板吗？')) return;
    
    try {
        const response = await fetch(`/api/templates/${templateId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            loadTemplates();
        } else if (response.status === 401) {
            logout();
        } else {
            alert('删除失败，请重试');
        }
    } catch (error) {
        alert('删除失败，请重试');
    }
}

async function applyTemplate() {
    const templateId = document.getElementById('templateSelect').value;
    if (!templateId) return;
    
    try {
        const response = await fetch(`/api/templates/${templateId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const template = await response.json();
            if (template.title) {
                document.getElementById('linkTitle').value = template.title;
            }
            if (template.description) {
                document.getElementById('linkDescription').value = template.description;
            }
        }
    } catch (error) {
        console.error('Failed to apply template:', error);
    }
}

function copyFullLink(event, shortCode) {
    const fullUrl = window.location.origin + '/' + shortCode;

    navigator.clipboard.writeText(fullUrl).then(() => {
        const btn = event.target.closest('.btn-copy');
        const originalHTML = btn.innerHTML;

        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" stroke-width="2"/>
            </svg>
        `;
        btn.style.background = 'linear-gradient(135deg, #4ade80, #22c55e)';

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        alert('复制失败，请手动复制：' + fullUrl);
    });
}