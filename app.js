// Endereço da API. No deploy, substitua localhost pelo IP público ou domínio da VM do backend.
const API_BASE_URL = 'http://localhost:3000';

const productList = document.querySelector('#products');
const addProductForm = document.querySelector('#add-product-form');
const updateProductForm = document.querySelector('#update-product-form');
const updatePanel = document.querySelector('#update-panel');
const searchProductForm = document.querySelector('#search-product-form');
const searchResult = document.querySelector('#search-result');
const productCount = document.querySelector('#product-count');
const appMessage = document.querySelector('#app-message');

function formatPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price)) return `R$ ${value}`;
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function showMessage(message, type = 'success') {
  appMessage.textContent = message;
  appMessage.className = `app-message visible ${type}`;
  window.clearTimeout(showMessage.timeout);
  showMessage.timeout = window.setTimeout(() => {
    appMessage.className = 'app-message';
  }, 4500);
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    const message = data && typeof data === 'object'
      ? (data.message || data.error || `Erro HTTP ${response.status}`)
      : (data || `Erro HTTP ${response.status}`);
    throw new Error(message);
  }

  return data;
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';

  const info = document.createElement('div');
  info.className = 'product-info';

  const titleRow = document.createElement('div');
  titleRow.className = 'product-title-row';

  const title = document.createElement('h3');
  title.textContent = product.name ?? 'Produto sem nome';

  const id = document.createElement('span');
  id.className = 'product-id';
  id.textContent = `#${product.id}`;

  titleRow.append(title, id);

  const description = document.createElement('p');
  description.className = 'product-description';
  description.textContent = product.description || 'Sem descrição cadastrada';

  const price = document.createElement('p');
  price.className = 'product-price';
  price.textContent = formatPrice(product.price);

  info.append(titleRow, description, price);

  const actions = document.createElement('div');
  actions.className = 'product-actions';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'button button-edit';
  editButton.textContent = 'Editar';
  editButton.addEventListener('click', () => openUpdateForm(product));

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'button button-delete';
  deleteButton.textContent = 'Excluir';
  deleteButton.addEventListener('click', async () => {
    const confirmed = window.confirm(`Deseja realmente excluir "${product.name}"?`);
    if (!confirmed) return;

    try {
      await deleteProduct(product.id);
      showMessage('Produto excluído com sucesso.');
      await fetchProducts();
    } catch (error) {
      showMessage(`Não foi possível excluir o produto: ${error.message}`, 'error');
    }
  });

  actions.append(editButton, deleteButton);
  card.append(info, actions);
  return card;
}

// Consulta todos os produtos (GET /products).
async function fetchProducts() {
  productList.innerHTML = '<div class="loading-state">Carregando produtos...</div>';
  productCount.textContent = 'Carregando...';

  try {
    const products = await request(`${API_BASE_URL}/products`);
    if (!Array.isArray(products)) {
      throw new Error('A resposta da API não está no formato esperado (lista de produtos).');
    }

    productList.innerHTML = '';
    productCount.textContent = `${products.length} ${products.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`;

    if (products.length === 0) {
      productList.innerHTML = '<div class="empty-state"><span>▧</span><strong>Nenhum produto cadastrado</strong><p>Use o formulário ao lado para adicionar o primeiro produto.</p></div>';
      return;
    }

    products.forEach(product => productList.appendChild(createProductCard(product)));
  } catch (error) {
    productList.innerHTML = `<div class="error-state">Não foi possível carregar os produtos.<br><small>${escapeHtml(error.message)}</small></div>`;
    productCount.textContent = 'Falha ao consultar a API';
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
}

// Cadastra produto (POST /products).
async function addProduct(name, price, description) {
  return request(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price: Number(price), description })
  });
}

// Exclui produto (DELETE /products/:id).
async function deleteProduct(id) {
  return request(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

// Atualiza produto (PUT /products/:id).
async function updateProduct(id, name, price, description) {
  return request(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price: Number(price), description })
  });
}

// Consulta um produto pelo ID (GET /products/:id).
async function getProductById(id) {
  const data = await request(`${API_BASE_URL}/products/${encodeURIComponent(id)}`);

  // O backend atual retorna uma lista ([]) mesmo na consulta por ID.
  // Normaliza a resposta para trabalhar com um único produto no frontend.
  if (Array.isArray(data)) return data.length > 0 ? data[0] : null;
  return data;
}

function openUpdateForm(product) {
  document.querySelector('#update-id').value = product.id;
  document.querySelector('#update-name').value = product.name ?? '';
  document.querySelector('#update-description').value = product.description ?? '';
  document.querySelector('#update-price').value = product.price ?? '';
  updatePanel.hidden = false;
  updatePanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.querySelector('#update-name').focus();
}

function closeUpdateForm() {
  updateProductForm.reset();
  updatePanel.hidden = true;
}

addProductForm.addEventListener('submit', async event => {
  event.preventDefault();

  const name = addProductForm.elements.name.value.trim();
  const description = addProductForm.elements.description.value.trim();
  const price = addProductForm.elements.price.value;

  try {
    await addProduct(name, price, description);
    addProductForm.reset();
    showMessage('Produto cadastrado com sucesso.');
    await fetchProducts();
  } catch (error) {
    showMessage(`Não foi possível cadastrar o produto: ${error.message}`, 'error');
  }
});

updateProductForm.addEventListener('submit', async event => {
  event.preventDefault();

  const id = document.querySelector('#update-id').value;
  const name = document.querySelector('#update-name').value.trim();
  const description = document.querySelector('#update-description').value.trim();
  const price = document.querySelector('#update-price').value;

  try {
    await updateProduct(id, name, price, description);
    closeUpdateForm();
    showMessage('Produto atualizado com sucesso.');
    await fetchProducts();
  } catch (error) {
    showMessage(`Não foi possível atualizar o produto: ${error.message}`, 'error');
  }
});

searchProductForm.addEventListener('submit', async event => {
  event.preventDefault();
  const id = searchProductForm.elements.id.value.trim();

  searchResult.innerHTML = '<p class="search-feedback">Consultando...</p>';

  try {
    const product = await getProductById(id);
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      throw new Error('A API não retornou um produto válido para esse ID.');
    }

    searchResult.innerHTML = '';
    const resultCard = document.createElement('div');
    resultCard.className = 'search-product-card';

    const name = document.createElement('strong');
    name.textContent = product.name ?? 'Produto sem nome';

    const productId = document.createElement('span');
    productId.textContent = `ID: ${product.id}`;

    const description = document.createElement('p');
    description.textContent = product.description || 'Sem descrição cadastrada';

    const price = document.createElement('b');
    price.textContent = formatPrice(product.price);

    resultCard.append(name, productId, description, price);
    searchResult.appendChild(resultCard);
  } catch (error) {
    searchResult.innerHTML = '';
    const feedback = document.createElement('p');
    feedback.className = 'search-feedback error-text';
    feedback.textContent = `Produto não encontrado ou erro na consulta: ${error.message}`;
    searchResult.appendChild(feedback);
  }
});

document.querySelector('#cancel-update').addEventListener('click', closeUpdateForm);
document.querySelector('#refresh-products').addEventListener('click', fetchProducts);

// Atualiza a listagem automaticamente após as operações, sem recarregar a página.
fetchProducts();
