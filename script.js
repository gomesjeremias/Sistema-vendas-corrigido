// Configuração da API
const API_BASE_URL = window.location.origin + '/api';

// Estado global da aplicação
let currentUser = null;
let authToken = null;

// Utilitários
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Funções de utilidade
function showLoading() {
    $('#loading-overlay').classList.add('active');
}

function hideLoading() {
    $('#loading-overlay').classList.remove('active');
}

function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <h4>${title}</h4>
        <p>${message}</p>
    `;
    
    $('#toast-container').appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

// Funções de API
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        ...options
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro na requisição');
        }

        return data;
    } catch (error) {
        console.error('Erro na API:', error);
        throw error;
    }
}

// Autenticação
async function login(email, password) {
    try {
        showLoading();
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: { email, password }
        });

        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        showMainSystem();
        showToast('Sucesso', 'Login realizado com sucesso!', 'success');
    } catch (error) {
        showToast('Erro', error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function register(name, email, password) {
    try {
        showLoading();
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: { name, email, password }
        });

        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        showMainSystem();
        showToast('Sucesso', 'Conta criada com sucesso!', 'success');
    } catch (error) {
        showToast('Erro', error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function changePassword(currentPassword, newPassword) {
    try {
        showLoading();
        await apiRequest('/auth/change-password', {
            method: 'PUT',
            body: { currentPassword, newPassword }
        });

        showToast('Sucesso', 'Senha alterada com sucesso!', 'success');
        closeModal();
    } catch (error) {
        showToast('Erro', error.message, 'error');
    } finally {
        hideLoading();
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showLoginScreen();
}

// Navegação entre telas
function showScreen(screenId) {
    $$('.screen').forEach(screen => screen.classList.remove('active'));
    $(`#${screenId}`).classList.add('active');
}

function showLoginScreen() {
    showScreen('login-screen');
}

function showRegisterScreen() {
    showScreen('register-screen');
}

function showMainSystem() {
    showScreen('main-system');
    $('#user-name').textContent = currentUser?.name || 'Usuário';
    loadDashboard();
}

// Navegação entre seções
function showSection(sectionId) {
    $$('.content-section').forEach(section => section.classList.remove('active'));
    $(`#${sectionId}-section`).classList.add('active');
    
    $$('.nav-item').forEach(item => item.classList.remove('active'));
    $(`.nav-item[data-section="${sectionId}"]`).classList.add('active');
    
    // Carregar dados da seção
    switch(sectionId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'clientes':
            loadClientes();
            break;
        case 'fornecedores':
            loadFornecedores();
            break;
        case 'produtos':
            loadProdutos();
            break;
        case 'vendas':
            loadVendas();
            break;
    }
}

// Modal
function showModal(title, content) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = content;
    $('#crud-modal').classList.add('active');
}

function closeModal() {
    $('#crud-modal').classList.remove('active');
    $('#change-password-modal').classList.remove('active');
}

// Dashboard
async function loadDashboard() {
    try {
        showLoading();
        const data = await apiRequest('/dashboard');
        
        // Atualizar estatísticas
        $('#total-a-pagar').textContent = formatCurrency(data.resumo.totalAPagar);
        $('#total-pago').textContent = formatCurrency(data.resumo.totalPago);
        $('#total-clientes').textContent = data.resumo.totalClientes;
        $('#total-vendas').textContent = data.resumo.totalVendas;
        
        // Atualizar listas
        updateClientesAPagar(data.vendasAPagar);
        updateClientesPago(data.vendasPagas);
        updateProdutosEstoqueBaixo(data.produtosEstoqueBaixo);
        
        // Atualizar gráfico
        updateVendasChart(data.vendasMensais);
        
    } catch (error) {
        showToast('Erro', 'Erro ao carregar dashboard', 'error');
    } finally {
        hideLoading();
    }
}

function updateClientesAPagar(vendas) {
    const container = $('#clientes-a-pagar');
    if (vendas.length === 0) {
        container.innerHTML = '<p>Nenhuma venda a pagar</p>';
        return;
    }
    
    container.innerHTML = vendas.map(venda => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${venda.cliente.nome}</h4>
                <p>${formatDate(venda.dataVenda)}</p>
            </div>
            <div class="list-item-value">${formatCurrency(venda.total)}</div>
        </div>
    `).join('');
}

function updateClientesPago(vendas) {
    const container = $('#clientes-pago');
    if (vendas.length === 0) {
        container.innerHTML = '<p>Nenhuma venda paga</p>';
        return;
    }
    
    container.innerHTML = vendas.map(venda => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${venda.cliente.nome}</h4>
                <p>${formatDate(venda.dataVenda)}</p>
            </div>
            <div class="list-item-value">${formatCurrency(venda.total)}</div>
        </div>
    `).join('');
}

function updateProdutosEstoqueBaixo(produtos) {
    const container = $('#produtos-estoque-baixo');
    if (produtos.length === 0) {
        container.innerHTML = '<p>Todos os produtos com estoque adequado</p>';
        return;
    }
    
    container.innerHTML = produtos.map(produto => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${produto.nome}</h4>
                <p>${produto.fornecedor.nome}</p>
            </div>
            <div class="list-item-value">${produto.estoque} unidades</div>
        </div>
    `).join('');
}

function updateVendasChart(vendasMensais) {
    const ctx = $('#vendas-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: vendasMensais.map(v => v.mes),
            datasets: [{
                label: 'Vendas Mensais',
                data: vendasMensais.map(v => v.total),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Clientes
async function loadClientes() {
    try {
        showLoading();
        const clientes = await apiRequest('/clientes');
        updateClientesTable(clientes);
    } catch (error) {
        showToast('Erro', 'Erro ao carregar clientes', 'error');
    } finally {
        hideLoading();
    }
}

function updateClientesTable(clientes) {
    const tbody = $('#clientes-table tbody');
    tbody.innerHTML = clientes.map(cliente => `
        <tr>
            <td>${cliente.nome}</td>
            <td>${cliente.email}</td>
            <td>${cliente.telefone || '-'}</td>
            <td>${cliente.cpfCnpj}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-warning" onclick="editCliente(${cliente.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteCliente(${cliente.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showClienteForm(cliente = null) {
    const isEdit = !!cliente;
    const title = isEdit ? 'Editar Cliente' : 'Novo Cliente';
    
    const content = `
        <form id="cliente-form">
            <div class="form-group">
                <label for="cliente-nome">Nome</label>
                <input type="text" id="cliente-nome" name="nome" value="${cliente?.nome || ''}" required>
            </div>
            <div class="form-group">
                <label for="cliente-email">Email</label>
                <input type="email" id="cliente-email" name="email" value="${cliente?.email || ''}" required>
            </div>
            <div class="form-group">
                <label for="cliente-telefone">Telefone</label>
                <input type="text" id="cliente-telefone" name="telefone" value="${cliente?.telefone || ''}">
            </div>
            <div class="form-group">
                <label for="cliente-endereco">Endereço</label>
                <textarea id="cliente-endereco" name="endereco">${cliente?.endereco || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="cliente-cpfcnpj">CPF/CNPJ</label>
                <input type="text" id="cliente-cpfcnpj" name="cpfCnpj" value="${cliente?.cpfCnpj || ''}" required>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary modal-cancel">Cancelar</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Atualizar' : 'Criar'}</button>
            </div>
        </form>
    `;
    
    showModal(title, content);
    
    $('#cliente-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        try {
            showLoading();
            if (isEdit) {
                await apiRequest(`/clientes/${cliente.id}`, {
                    method: 'PUT',
                    body: data
                });
                showToast('Sucesso', 'Cliente atualizado com sucesso!', 'success');
            } else {
                await apiRequest('/clientes', {
                    method: 'POST',
                    body: data
                });
                showToast('Sucesso', 'Cliente criado com sucesso!', 'success');
            }
            closeModal();
            loadClientes();
        } catch (error) {
            showToast('Erro', error.message, 'error');
        } finally {
            hideLoading();
        }
    };
}

async function editCliente(id) {
    try {
        const cliente = await apiRequest(`/clientes/${id}`);
        showClienteForm(cliente);
    } catch (error) {
        showToast('Erro', 'Erro ao carregar cliente', 'error');
    }
}

async function deleteCliente(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    try {
        showLoading();
        await apiRequest(`/clientes/${id}`, { method: 'DELETE' });
        showToast('Sucesso', 'Cliente excluído com sucesso!', 'success');
        loadClientes();
    } catch (error) {
        showToast('Erro', error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Fornecedores
async function loadFornecedores() {
    try {
        showLoading();
        const fornecedores = await apiRequest('/fornecedores');
        updateFornecedoresTable(fornecedores);
    } catch (error) {
        showToast('Erro', 'Erro ao carregar fornecedores', 'error');
    } finally {
        hideLoading();
    }
}

function updateFornecedoresTable(fornecedores) {
    const tbody = $('#fornecedores-table tbody');
    tbody.innerHTML = fornecedores.map(fornecedor => `
        <tr>
            <td>${fornecedor.nome}</td>
            <td>${fornecedor.email}</td>
            <td>${fornecedor.telefone || '-'}</td>
            <td>${fornecedor.cnpj}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-warning" onclick="editFornecedor(${fornecedor.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteFornecedor(${fornecedor.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showFornecedorForm(fornecedor = null) {
    const isEdit = !!fornecedor;
    const title = isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor';
    
    const content = `
        <form id="fornecedor-form">
            <div class="form-group">
                <label for="fornecedor-nome">Nome</label>
                <input type="text" id="fornecedor-nome" name="nome" value="${fornecedor?.nome || ''}" required>
            </div>
            <div class="form-group">
                <label for="fornecedor-email">Email</label>
                <input type="email" id="fornecedor-email" name="email" value="${fornecedor?.email || ''}" required>
            </div>
            <div class="form-group">
                <label for="fornecedor-telefone">Telefone</label>
                <input type="text" id="fornecedor-telefone" name="telefone" value="${fornecedor?.telefone || ''}">
            </div>
            <div class="form-group">
                <label for="fornecedor-endereco">Endereço</label>
                <textarea id="fornecedor-endereco" name="endereco">${fornecedor?.endereco || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="fornecedor-cnpj">CNPJ</label>
                <input type="text" id="fornecedor-cnpj" name="cnpj" value="${fornecedor?.cnpj || ''}" required>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary modal-cancel">Cancelar</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Atualizar' : 'Criar'}</button>
            </div>
        </form>
    `;
    
    showModal(title, content);
    
    $('#fornecedor-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        try {
            showLoading();
            if (isEdit) {
                await apiRequest(`/fornecedores/${fornecedor.id}`, {
                    method: 'PUT',
                    body: data
                });
                showToast('Sucesso', 'Fornecedor atualizado com sucesso!', 'success');
            } else {
                await apiRequest('/fornecedores', {
                    method: 'POST',
                    body: data
                });
                showToast('Sucesso', 'Fornecedor criado com sucesso!', 'success');
            }
            closeModal();
            loadFornecedores();
        } catch (error) {
            showToast('Erro', error.message, 'error');
        } finally {
            hideLoading();
        }
    };
}

async function editFornecedor(id) {
    try {
        const fornecedor = await apiRequest(`/fornecedores/${id}`);
        showFornecedorForm(fornecedor);
    } catch (error) {
        showToast('Erro', 'Erro ao carregar fornecedor', 'error');
    }
}

async function deleteFornecedor(id) {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;
    
    try {
        showLoading();
        await apiRequest(`/fornecedores/${id}`, { method: 'DELETE' });
        showToast('Sucesso', 'Fornecedor excluído com sucesso!', 'success');
        loadFornecedores();
    } catch (error) {
        showToast('Erro', error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Produtos
async function loadProdutos() {
    try {
        showLoading();
        const produtos = await apiRequest('/produtos');
        updateProdutosTable(produtos);
    } catch (error) {
        showToast('Erro', 'Erro ao carregar produtos', 'error');
    } finally {
        hideLoading();
    }
}

function updateProdutosTable(produtos) {
    const tbody = $('#produtos-table tbody');
    tbody.innerHTML = produtos.map(produto => `
        <tr>
            <td>${produto.nome}</td>
            <td>${produto.categoria}</td>
            <td>${formatCurrency(produto.preco)}</td>
            <td>${produto.estoque}</td>
            <td>${produto.fornecedor.nome}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-warning" onclick="editProduto(${produto.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteProduto(${produto.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function showProdutoForm(produto = null) {
    try {
        // Carregar fornecedores para o select
        const fornecedores = await apiRequest('/fornecedores');
        
        const isEdit = !!produto;
        const title = isEdit ? 'Editar Produto' : 'Novo Produto';
        
        const content = `
            <form id="produto-form">
                <div class="form-group">
                    <label for="produto-nome">Nome</label>
                    <input type="text" id="produto-nome" name="nome" value="${produto?.nome || ''}" required>
                </div>
                <div class="form-group">
                    <label for="produto-descricao">Descrição</label>
                    <textarea id="produto-descricao" name="descricao">${produto?.descricao || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="produto-preco">Preço</label>
                    <input type="number" step="0.01" id="produto-preco" name="preco" value="${produto?.preco || ''}" required>
                </div>
                <div class="form-group">
                    <label for="produto-categoria">Categoria</label>
                    <input type="text" id="produto-categoria" name="categoria" value="${produto?.categoria || ''}" required>
                </div>
                <div class="form-group">
                    <label for="produto-estoque">Estoque</label>
                    <input type="number" id="produto-estoque" name="estoque" value="${produto?.estoque || ''}" required>
                </div>
                <div class="form-group">
                    <label for="produto-fornecedor">Fornecedor</label>
                    <select id="produto-fornecedor" name="fornecedorId" required>
                        <option value="">Selecione um fornecedor</option>
                        ${fornecedores.map(f => `
                            <option value="${f.id}" ${produto?.fornecedorId === f.id ? 'selected' : ''}>
                                ${f.nome}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary modal-cancel">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Atualizar' : 'Criar'}</button>
                </div>
            </form>
        `;
        
        showModal(title, content);
        
        $('#produto-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                showLoading();
                if (isEdit) {
                    await apiRequest(`/produtos/${produto.id}`, {
                        method: 'PUT',
                        body: data
                    });
                    showToast('Sucesso', 'Produto atualizado com sucesso!', 'success');
                } else {
                    await apiRequest('/produtos', {
                        method: 'POST',
                        body: data
                    });
                    showToast('Sucesso', 'Produto criado com sucesso!', 'success');
                }
                closeModal();
                loadProdutos();
            } catch (error) {
                showToast('Erro', error.message, 'error');
            } finally {
                hideLoading();
            }
        };
    } catch (error) {
        showToast('Erro', 'Erro ao carregar fornecedores', 'error');
    }
}

async function editProduto(id) {
    try {
        const produto = await apiRequest(`/produtos/${id}`);
        showProdutoForm(produto);
    } catch (error) {
        showToast('Erro', 'Erro ao carregar produto', 'error');
    }
}

async function deleteProduto(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
        showLoading();
        await apiRequest(`/produtos/${id}`, { method: 'DELETE' });
        showToast('Sucesso', 'Produto excluído com sucesso!', 'success');
        loadProdutos();
    } catch (error) {
        showToast('Erro', error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Vendas
async function loadVendas() {
    try {
        showLoading();
        const vendas = await apiRequest('/vendas');
        updateVendasTable(vendas);
    } catch (error) {
        showToast('Erro', 'Erro ao carregar vendas', 'error');
    } finally {
        hideLoading();
    }
}

function updateVendasTable(vendas) {
    const tbody = $('#vendas-table tbody');
    tbody.innerHTML = vendas.map(venda => `
        <tr>
            <td>${formatDate(venda.dataVenda)}</td>
            <td>${venda.cliente.nome}</td>
            <td>${formatCurrency(venda.total)}</td>
            <td>
                <span class="status-badge ${venda.status.toLowerCase().replace('_', '-')}">
                    ${venda.status === 'A_PAGAR' ? 'A Pagar' : 'Pago'}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-success" onclick="toggleVendaStatus(${venda.id}, '${venda.status}')">
                        <i class="fas fa-${venda.status === 'A_PAGAR' ? 'check' : 'undo'}"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteVenda(${venda.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function showVendaForm() {
    try {
        // Carregar clientes e produtos
        const [clientes, produtos] = await Promise.all([
            apiRequest('/clientes'),
            apiRequest('/produtos')
        ]);
        
        const content = `
            <form id="venda-form">
                <div class="form-group">
                    <label for="venda-cliente">Cliente</label>
                    <select id="venda-cliente" name="clienteId" required>
                        <option value="">Selecione um cliente</option>
                        ${clientes.map(c => `
                            <option value="${c.id}">${c.nome}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Produtos</label>
                    <div id="produtos-venda">
                        <div class="produto-item">
                            <select name="produtoId" required>
                                <option value="">Selecione um produto</option>
                                ${produtos.map(p => `
                                    <option value="${p.id}" data-preco="${p.preco}" data-estoque="${p.estoque}">
                                        ${p.nome} - ${formatCurrency(p.preco)} (Estoque: ${p.estoque})
                                    </option>
                                `).join('')}
                            </select>
                            <input type="number" name="quantidade" placeholder="Quantidade" min="1" required>
                            <button type="button" class="btn btn-danger" onclick="removeProdutoItem(this)">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" class="btn btn-secondary" onclick="addProdutoItem()">
                        <i class="fas fa-plus"></i> Adicionar Produto
                    </button>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary modal-cancel">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Criar Venda</button>
                </div>
            </form>
        `;
        
        showModal('Nova Venda', content);
        
        $('#venda-form').onsubmit = async (e) => {
            e.preventDefault();
            
            const clienteId = $('#venda-cliente').value;
            const produtoItems = $$('#produtos-venda .produto-item');
            
            const itens = Array.from(produtoItems).map(item => {
                const produtoSelect = item.querySelector('select[name="produtoId"]');
                const quantidadeInput = item.querySelector('input[name="quantidade"]');
                
                return {
                    produtoId: produtoSelect.value,
                    quantidade: parseInt(quantidadeInput.value)
                };
            }).filter(item => item.produtoId && item.quantidade);
            
            if (itens.length === 0) {
                showToast('Erro', 'Adicione pelo menos um produto à venda', 'error');
                return;
            }
            
            try {
                showLoading();
                await apiRequest('/vendas', {
                    method: 'POST',
                    body: { clienteId, itens }
                });
                showToast('Sucesso', 'Venda criada com sucesso!', 'success');
                closeModal();
                loadVendas();
                loadDashboard(); // Atualizar dashboard
            } catch (error) {
                showToast('Erro', error.message, 'error');
            } finally {
                hideLoading();
            }
        };
    } catch (error) {
        showToast('Erro', 'Erro ao carregar dados para venda', 'error');
    }
}

function addProdutoItem() {
    const container = $('#produtos-venda');
    const firstItem = container.querySelector('.produto-item');
    const newItem = firstItem.cloneNode(true);
    
    // Limpar valores
    newItem.querySelector('select').value = '';
    newItem.querySelector('input').value = '';
    
    container.appendChild(newItem);
}

function removeProdutoItem(button) {
    const container = $('#produtos-venda');
    if (container.children.length > 1) {
        button.closest('.produto-item').remove();
    }
}

async function toggleVendaStatus(id, currentStatus) {
    const newStatus = currentStatus === 'A_PAGAR' ? 'PAGO' : 'A_PAGAR';
    
    try {
        showLoading();
        await apiRequest(`/vendas/${id}/status`, {
            method: 'PUT',
            body: { status: newStatus }
        });
        showToast('Sucesso', 'Status da venda atualizado!', 'success');
        loadVendas();
        loadDashboard(); // Atualizar dashboard
    } catch (error) {
        showToast('Erro', error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteVenda(id) {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;
    
    try {
        showLoading();
        await apiRequest(`/vendas/${id}`, { method: 'DELETE' });
        showToast('Sucesso', 'Venda excluída com sucesso!', 'success');
        loadVendas();
        loadDashboard(); // Atualizar dashboard
    } catch (error) {
        showToast('Erro', error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function clearAllVendas() {
    if (!confirm('Tem certeza que deseja excluir TODAS as vendas? Esta ação não pode ser desfeita.')) return;
    
    try {
        showLoading();
        await apiRequest('/vendas', { method: 'DELETE' });
        showToast('Sucesso', 'Todas as vendas foram excluídas!', 'success');
        loadVendas();
        loadDashboard(); // Atualizar dashboard
    } catch (error) {
        showToast('Erro', error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se há token salvo
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showMainSystem();
    } else {
        showLoginScreen();
    }
    
    // Event listeners para login/registro
    $('#login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        await login(email, password);
    });
    
    $('#register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        const password = formData.get('password');
        await register(name, email, password);
    });
    
    $('#show-register').addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterScreen();
    });
    
    $('#show-login').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginScreen();
    });
    
    // Event listeners para navegação
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
        });
    });
    
    // Event listeners para botões de ação
    $('#logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
    
    $('#change-password-btn').addEventListener('click', (e) => {
        e.preventDefault();
        $('#change-password-modal').classList.add('active');
    });
    
    $('#change-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        await changePassword(currentPassword, newPassword);
    });
    
    // Event listeners para botões CRUD
    $('#add-cliente-btn').addEventListener('click', () => showClienteForm());
    $('#add-fornecedor-btn').addEventListener('click', () => showFornecedorForm());
    $('#add-produto-btn').addEventListener('click', () => showProdutoForm());
    $('#add-venda-btn').addEventListener('click', () => showVendaForm());
    $('#clear-vendas-btn').addEventListener('click', () => clearAllVendas());
    
    // Event listeners para modais
    $$('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    $$('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    });
});

// Expor funções globalmente para uso nos event handlers inline
window.editCliente = editCliente;
window.deleteCliente = deleteCliente;
window.editFornecedor = editFornecedor;
window.deleteFornecedor = deleteFornecedor;
window.editProduto = editProduto;
window.deleteProduto = deleteProduto;
window.toggleVendaStatus = toggleVendaStatus;
window.deleteVenda = deleteVenda;
window.addProdutoItem = addProdutoItem;
window.removeProdutoItem = removeProdutoItem;

