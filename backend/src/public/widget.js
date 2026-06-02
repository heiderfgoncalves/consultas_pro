/**
 * Consultas PRO Widget - Integração White-Label
 * 
 * Script cliente para carregamento dinâmico e exibição de consultas diretamente no site do parceiro.
 * O esqueleto HTML é injetado sem estilos inline, permitindo estilização CSS customizada por parte do parceiro.
 */
(function() {
  class ConsultasProWidget {
    /**
     * @param {Object} options
     * @param {string} [options.token] - Token de API da Empresa Parceira (ou options.apiKey)
     * @param {string} [options.apiKey] - Token de API da Empresa Parceira (alternativa para options.token)
     * @param {string} [options.targetId] - ID do container HTML onde o widget será renderizado
     * @param {string} [options.externalUserId] - ID/Handle do cliente final para microgerenciamento de saldo
     * @param {string} [options.templateId] - ID do template de consulta a ser executado
     * @param {string} [options.apiBaseUrl] - URL base da API (opcional)
     */
    constructor(options) {
      if (!options) {
        console.error('ConsultasProWidget: Opções não fornecidas.');
        return;
      }
      this.token = options.token || options.apiKey;
      if (!this.token) {
        console.error('ConsultasProWidget: O parâmetro "token" ou "apiKey" é obrigatório.');
        return;
      }
      this.targetId = options.targetId;
      this.externalUserId = options.externalUserId;
      this.templateId = options.templateId;
      this.apiBaseUrl = (options.apiBaseUrl || options.baseUrl || window.location.origin || 'http://localhost:3333').replace(/\/$/, '');
      this.useDefaultStyles = options.useDefaultStyles !== false;

      if (this.useDefaultStyles) {
        this._injectDefaultStyles();
      }
    }

    /**
     * @private
     */
    _injectDefaultStyles() {
      const styleId = 'cpro-widget-default-styles';
      if (document.getElementById(styleId)) return;

      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Consultas PRO Widget — Estilos Premium White-Label */
        .cpro-widget-container {
          font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #334155;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
          padding: 28px;
          max-width: 850px;
          margin: 16px auto;
          transition: all 0.3s ease;
        }

        .cpro-widget-header {
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }

        .cpro-widget-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
        }

        .cpro-widget-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }

        .cpro-widget-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .cpro-section {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 20px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .cpro-section:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
        }

        .cpro-section-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: #4f46e5;
          margin: 0 0 16px 0;
          border-left: 4px solid #6366f1;
          padding-left: 10px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        /* Grid Inteligente de Dados */
        .cpro-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        }

        .cpro-grid-item {
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 14px;
          transition: border-color 0.2s ease;
        }

        .cpro-grid-item:hover {
          border-color: #cbd5e1;
        }

        .cpro-grid-label {
          font-size: 0.725rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 4px;
          letter-spacing: 0.03em;
        }

        .cpro-grid-value {
          font-size: 0.925rem;
          font-weight: 600;
          color: #1e293b;
          word-break: break-word;
        }

        /* Tabelas Modernas */
        .cpro-table-wrapper {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
        }

        .cpro-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
          text-align: left;
        }

        .cpro-table th {
          background: #f1f5f9;
          color: #475569;
          font-weight: 700;
          padding: 12px 16px;
          border-bottom: 2px solid #e2e8f0;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .cpro-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          color: #334155;
          font-weight: 500;
        }

        .cpro-table tr:last-child td {
          border-bottom: none;
        }

        .cpro-table tr:hover td {
          background: #f8fafc;
        }

        /* Loader e Spinner */
        .cpro-loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          max-width: 400px;
          margin: 32px auto;
        }

        .cpro-spinner {
          width: 40px;
          height: 40px;
          border: 3.5px solid rgba(99, 102, 241, 0.15);
          border-radius: 50%;
          border-top-color: #6366f1;
          animation: cpro-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          margin-bottom: 20px;
        }

        .cpro-loader-text {
          font-size: 0.9rem;
          color: #475569;
          margin: 0;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        /* Containers de Erro */
        .cpro-error-container {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          padding: 20px 24px;
          margin: 24px auto;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.03);
        }

        .cpro-error-text {
          color: #991b1b;
          font-size: 0.9rem;
          margin: 0;
          font-weight: 600;
          line-height: 1.5;
        }

        .cpro-no-data, .cpro-empty-section {
          font-size: 0.875rem;
          color: #64748b;
          font-style: italic;
          margin: 8px 0 0 0;
        }

        /* Estilos do Formulário de Busca White-Label */
        .cpro-search-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          margin-top: 16px;
        }

        .cpro-input-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .cpro-input {
          flex: 1;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px 16px;
          font-family: inherit;
          font-size: 0.95rem;
          color: #1e293b;
          transition: all 0.2s ease;
        }

        .cpro-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        .cpro-button {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-family: inherit;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
          white-space: nowrap;
        }

        .cpro-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
        }

        .cpro-button:active {
          transform: translateY(0);
        }

        @keyframes cpro-spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    /**
     * Inicializa a interface de busca do widget no container especificado por targetId.
     */
    init() {
      const targetId = this.targetId || 'cpro-widget-root';
      const container = document.getElementById(targetId);
      if (!container) {
        console.error(`ConsultasProWidget: Elemento alvo com ID "${targetId}" não encontrado.`);
        return;
      }

      container.innerHTML = '';

      const widgetWrapper = document.createElement('div');
      widgetWrapper.className = 'cpro-widget-container';

      // Header do widget
      const header = document.createElement('div');
      header.className = 'cpro-widget-header';

      const title = document.createElement('h3');
      title.className = 'cpro-widget-title';
      title.textContent = 'Consulta de Documentos';
      header.appendChild(title);

      const subtitle = document.createElement('p');
      subtitle.className = 'cpro-widget-subtitle';
      subtitle.textContent = 'Informe o CPF ou CNPJ para realizar a consulta';
      header.appendChild(subtitle);

      widgetWrapper.appendChild(header);

      // Formulário de busca
      const searchBox = document.createElement('div');
      searchBox.className = 'cpro-search-box';

      const inputGroup = document.createElement('div');
      inputGroup.className = 'cpro-input-group';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'cpro-input';
      input.placeholder = 'Digite o CPF ou CNPJ...';
      input.id = 'cpro-document-input';
      
      // Aplicar máscara básica ao digitar CPF/CNPJ
      input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
          // CPF: 000.000.000-00
          value = value.replace(/(\d{3})(\d)/, '$1.$2');
          value = value.replace(/(\d{3})(\d)/, '$1.$2');
          value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
          // CNPJ: 00.000.000/0000-00
          value = value.substring(0, 14);
          value = value.replace(/^(\d{2})(\d)/, '$1.$2');
          value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
          value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
          value = value.replace(/(\d{4})(\d)/, '$1-$2');
        }
        e.target.value = value;
      });

      inputGroup.appendChild(input);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cpro-button';
      button.textContent = 'Consultar';
      
      button.addEventListener('click', () => {
        const doc = input.value.replace(/\D/g, '');
        if (!doc) {
          alert('Por favor, digite um CPF ou CNPJ válido.');
          return;
        }
        if (doc.length !== 11 && doc.length !== 14) {
          alert('Documento inválido. O CPF deve ter 11 dígitos e o CNPJ 14 dígitos.');
          return;
        }

        // Executa a consulta
        this.renderConsultation(targetId, {
          subjectDocument: doc,
          externalUserId: this.externalUserId,
          templateId: this.templateId
        });
      });

      inputGroup.appendChild(button);
      searchBox.appendChild(inputGroup);
      widgetWrapper.appendChild(searchBox);
      container.appendChild(widgetWrapper);
    }

    /**
     * Emite uma consulta e inicia o monitoramento (polling) até a conclusão, renderizando o resultado no container.
     * 
     * @param {string} containerId - ID do elemento HTML onde o resultado será injetado
     * @param {Object} params - Parâmetros da consulta
     * @param {string} params.subjectDocument - CPF ou CNPJ a ser consultado
     * @param {string} [params.subjectType] - 'CPF' ou 'CNPJ' (padrão detectado automaticamente)
     * @param {string} [params.templateId] - ID do Template a ser executado
     * @param {string[]} [params.providerProductIds] - Lista de IDs de produtos (caso não use template)
     * @param {string} [params.externalUserId] - ID/Handle do cliente final para microgerenciamento de saldo
     */
    async renderConsultation(containerId, params) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`ConsultasProWidget: Elemento com ID "${containerId}" não encontrado.`);
        return;
      }

      // Detecção automática de tipo de documento se não fornecido
      let subjectType = params.subjectType;
      if (!subjectType && params.subjectDocument) {
        const cleanDoc = params.subjectDocument.replace(/\D/g, '');
        subjectType = cleanDoc.length > 11 ? 'CNPJ' : 'CPF';
      }

      this._showLoading(container, 'Iniciando processamento da consulta...');

      try {
        // 1. Cria a consulta (vai para a fila assíncrona)
        const response = await fetch(`${this.apiBaseUrl}/consultations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
            'X-API-Key': this.token
          },
          body: JSON.stringify({
            subjectDocument: params.subjectDocument,
            subjectType: subjectType || 'CPF',
            templateId: params.templateId,
            providerProductIds: params.providerProductIds,
            externalUserId: params.externalUserId
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Falha ao criar consulta');
        }

        const consultation = await response.json();
        const consultationId = consultation.data ? consultation.data.id : consultation.id;

        // 2. Inicia polling para verificar conclusão
        this._pollConsultation(container, consultationId);

      } catch (error) {
        this._showError(container, error.message || 'Erro inesperado ao emitir a consulta.');
      }
    }

    /**
     * @private
     */
    async _pollConsultation(container, consultationId) {
      const maxAttempts = 30; // 60 segundos no total (30 * 2s)
      let attempts = 0;

      const interval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(interval);
          this._showError(container, 'Tempo limite de processamento esgotado. Tente novamente.');
          return;
        }

        try {
          const response = await fetch(`${this.apiBaseUrl}/consultations/${consultationId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'X-API-Key': this.token
            }
          });

          if (!response.ok) {
            throw new Error('Erro ao obter status da consulta');
          }

          const res = await response.json();
          const consultation = res.data || res;

          if (consultation.status === 'COMPLETED') {
            clearInterval(interval);
            this._renderResult(container, consultation);
          } else if (consultation.status === 'FAILED') {
            clearInterval(interval);
            this._showError(container, consultation.errorMessage || 'Falha no processamento da consulta.');
          } else {
            // Continua em processamento/fila
            this._showLoading(container, `Processando consulta... (${attempts * 2}s)`);
          }

        } catch (error) {
          clearInterval(interval);
          this._showError(container, 'Erro na comunicação com a API de consultas.');
        }
      }, 2000);
    }

    /**
     * @private
     */
    _renderResult(container, consultation) {
      container.innerHTML = '';

      // Cria a estrutura do widget white-label com classes CSS limpas
      const widgetWrapper = document.createElement('div');
      widgetWrapper.className = 'cpro-widget-container';

      // Header do resultado
      const header = document.createElement('div');
      header.className = 'cpro-widget-header';

      const title = document.createElement('h3');
      title.className = 'cpro-widget-title';
      title.textContent = `Consulta realizada em ${new Date(consultation.createdAt).toLocaleDateString('pt-BR')}`;
      header.appendChild(title);

      const docInfo = document.createElement('p');
      docInfo.className = 'cpro-widget-subtitle';
      docInfo.textContent = `Documento consultado: ${this._maskDocument(consultation.subjectDocument)}`;
      header.appendChild(docInfo);

      widgetWrapper.appendChild(header);

      // Corpo com os dados da consulta (renderPayload ou mergedPayload)
      const body = document.createElement('div');
      body.className = 'cpro-widget-body';

      const payload = consultation.renderPayload || consultation.mergedPayload || {};
      
      if (Object.keys(payload).length === 0) {
        const noData = document.createElement('p');
        noData.className = 'cpro-no-data';
        noData.textContent = 'Nenhum registro encontrado para este documento.';
        body.appendChild(noData);
      } else {
        // Gera seções para as chaves principais do retorno
        for (const [sectionKey, data] of Object.entries(payload)) {
          if (!data) continue;
          
          const section = document.createElement('div');
          section.className = `cpro-section cpro-section-${sectionKey.toLowerCase()}`;

          const sectionTitle = document.createElement('h4');
          sectionTitle.className = 'cpro-section-title';
          sectionTitle.textContent = this._formatKeyLabel(sectionKey);
          section.appendChild(sectionTitle);

          if (Array.isArray(data)) {
            // Renderiza listas/tabelas
            if (data.length === 0) {
              const emptyLabel = document.createElement('p');
              emptyLabel.className = 'cpro-empty-section';
              emptyLabel.textContent = 'Nenhum registro cadastrado.';
              section.appendChild(emptyLabel);
            } else {
               const wrapper = document.createElement('div');
              wrapper.className = 'cpro-table-wrapper';

              const table = document.createElement('table');
              table.className = 'cpro-table';

              // Headers da tabela
              const thead = document.createElement('thead');
              const headerRow = document.createElement('tr');
              const keys = Object.keys(data[0] || {});
              
              keys.forEach(k => {
                const th = document.createElement('th');
                th.textContent = this._formatKeyLabel(k);
                headerRow.appendChild(th);
              });
              thead.appendChild(headerRow);
              table.appendChild(thead);

              // Linhas da tabela
              const tbody = document.createElement('tbody');
              data.forEach(row => {
                const tr = document.createElement('tr');
                keys.forEach(k => {
                  const td = document.createElement('td');
                  const val = row[k];
                  td.textContent = typeof val === 'object' ? JSON.stringify(val) : (val !== null && val !== undefined ? val : '—');
                  tr.appendChild(td);
                });
                tbody.appendChild(tr);
              });
              table.appendChild(tbody);
              wrapper.appendChild(table);
              section.appendChild(wrapper);
            }
          } else if (typeof data === 'object') {
            // Renderiza chave/valor em grid
            const grid = document.createElement('div');
            grid.className = 'cpro-grid';

            for (const [k, val] of Object.entries(data)) {
              const item = document.createElement('div');
              item.className = 'cpro-grid-item';

              const label = document.createElement('span');
              label.className = 'cpro-grid-label';
              label.textContent = this._formatKeyLabel(k);

              const value = document.createElement('span');
              value.className = 'cpro-grid-value';
              value.textContent = typeof val === 'object' ? JSON.stringify(val) : (val !== null && val !== undefined ? val : '—');

              item.appendChild(label);
              item.appendChild(value);
              grid.appendChild(item);
            }
            section.appendChild(grid);
          } else {
            // Campo de texto único
            const p = document.createElement('p');
            p.className = 'cpro-raw-value';
            p.textContent = String(data);
            section.appendChild(p);
          }

          body.appendChild(section);
        }
      }

      widgetWrapper.appendChild(body);
      container.appendChild(widgetWrapper);
    }

    /**
     * @private
     */
    _showLoading(container, message) {
      container.innerHTML = '';
      
      const loader = document.createElement('div');
      loader.className = 'cpro-loader-container';
      
      const spinner = document.createElement('div');
      spinner.className = 'cpro-spinner';
      loader.appendChild(spinner);
      
      const text = document.createElement('p');
      text.className = 'cpro-loader-text';
      text.textContent = message;
      loader.appendChild(text);
      
      container.appendChild(loader);
    }

    /**
     * @private
     */
    _showError(container, message) {
      container.innerHTML = '';
      
      const errorBox = document.createElement('div');
      errorBox.className = 'cpro-error-container';
      
      const text = document.createElement('p');
      text.className = 'cpro-error-text';
      text.textContent = message;
      errorBox.appendChild(text);
      
      container.appendChild(errorBox);
    }

    /**
     * @private
     */
    _formatKeyLabel(key) {
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^\w/, c => c.toUpperCase())
        .trim();
    }

    /**
     * @private
     */
    _maskDocument(doc) {
      if (!doc) return '';
      const clean = doc.replace(/\D/g, '');
      if (clean.length === 11) {
        return `${clean.substring(0, 3)}.***.***-${clean.substring(9)}`;
      } else if (clean.length === 14) {
        return `${clean.substring(0, 2)}.***.***/****-${clean.substring(12)}`;
      }
      return doc;
    }
  }

  // Registra globalmente no navegador
  window.ConsultasProWidget = ConsultasProWidget;
})();
