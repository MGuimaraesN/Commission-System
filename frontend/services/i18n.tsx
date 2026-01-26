import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'pt-BR' | 'en-US';

const dictionary = {
  'pt-BR': {
    common: {
      dashboard: "Dashboard",
      serviceOrders: "Ordens de Serviço",
      periods: "Períodos",
      brands: "Marcas",
      reports: "Relatórios",
      settings: "Configurações",
      signOut: "Sair",
      menu: "Menu",
      authenticated: "Autenticado",
      cancel: "Cancelar",
      save: "Salvar",
      delete: "Excluir",
      edit: "Editar",
      actions: "Ações",
      search: "Buscar...",
      all: "Todos",
      date: "Data",
      value: "Valor",
      filtersActive: "Filtros Ativos",
      required: "Obrigatório",
      optional: "Opcional",
      yes: "Sim",
      no: "Não",
      back: "Voltar"
    },
    status: {
      ALL: "Todos Status",
      PENDING: "Pendente",
      PAID: "Pago"
    },
    dashboard: {
      title: "Visão Geral",
      subtitle: "Métricas de desempenho em tempo real e análises.",
      orders: "Ordens",
      commission: "Comissão",
      vsYesterday: "vs ontem",
      currentMonth: "Mês Atual",
      totalGenerated: "Total gerado de comissão",
      bestPeriod: "Melhor Período",
      noDataYet: "Sem dados",
      currentPeriod: "Período Atual",
      cycleCommission: "Comissão do ciclo atual",
      totalCommission: "Comissão Total",
      allTimeEarnings: "Ganhos totais",
      historyTitle: "Histórico de Comissões",
      orderStatus: "Status dos Pedidos",
      total: "Total",
      topBrands: "Top Marcas",
      byCommission: "Por comissão total",
      topCustomers: "Top Clientes",
      byVolume: "Por valor de serviço",
      noBrandData: "Sem dados de marca disponíveis.",
      noCustomerData: "Sem dados de cliente disponíveis."
    },
    orders: {
      title: "Ordens de Serviço",
      subtitle: "Gerencie pedidos, pagamentos e histórico.",
      exportCsv: "Exportar CSV",
      newOrder: "Nova Ordem (N)",
      bulkSelected: "selecionados",
      markPaid: "Marcar Pago (P)",
      deleteTitle: "Excluir Ordem?",
      deleteBulkTitle: "Excluir {count} Ordens?",
      deleteMsg: "Esta ação não pode ser desfeita. Ordens em períodos pagos serão ignoradas.",
      auditLog: "Log de Auditoria",
      noHistory: "Nenhum histórico registrado.",
      editTitle: "Editar Ordem",
      newTitle: "Nova Ordem de Serviço",
      osNumber: "Número O.S",
      date: "Data",
      customer: "Cliente",
      brand: "Marca",
      selectBrand: "Selecione a Marca",
      value: "Valor do Serviço (R$)",
      paymentMethod: "Método de Pagamento",
      none: "Nenhum / Não especificado",
      calcCommission: "Comissão",
      searchPlaceholder: "Buscar ordens (F)...",
      allBrands: "Todas Marcas",
      resetFilters: "Limpar Filtros",
      noOrdersFound: "Nenhuma ordem encontrada",
      noOrdersMsg: "Ajuste os filtros ou crie uma nova ordem de serviço.",
      paidOn: "Pago em",
      errorRequired: "Preencha todos os campos obrigatórios.",
      errorPositive: "Valor do serviço deve ser positivo.",
      errorFuture: "Data não pode ser no futuro."
    },
    periods: {
      title: "Períodos",
      subtitle: "Gerencie fechamentos quinzenais de comissão.",
      openPeriod: "Período Aberto",
      closedPaid: "Fechado & Pago",
      serviceOrders: "Ordens de Serviço",
      totalVolume: "Valor Total",
      commissionTotal: "Total Comissão",
      paidOn: "Pago em",
      markAsPaid: "Marcar como Pago",
      noPeriods: "Nenhum período ainda",
      noPeriodsMsg: "Períodos são gerados automaticamente ao criar a primeira ordem de serviço.",
      confirmClose: "Fechar este período irá bloquear todas as ordens associadas e marcá-las como PAGO. Continuar?"
    },
    brands: {
      title: "Marcas",
      subtitle: "Gerencie as marcas disponíveis para ordens.",
      newBrand: "Nova Marca",
      editBrand: "Editar Marca",
      brandName: "Nome da Marca",
      saveBrand: "Salvar Marca",
      searchPlaceholder: "Buscar marcas...",
      noBrands: "Nenhuma marca encontrada",
      errorRequired: "Nome da marca é obrigatório",
      confirmDelete: "Tem certeza? Isso não removerá o nome da marca de ordens históricas."
    },
    reports: {
      title: "Relatórios",
      subtitle: "Gere relatórios em PDF e Excel para contabilidade.",
      thisMonth: "Este Mês",
      lastMonth: "Mês Passado",
      startDate: "Data Início",
      endDate: "Data Fim",
      sortBy: "Ordenar Por",
      defaultSort: "Data (Padrão)",
      brandSort: "Marca",
      summaryOnly: "Apenas Resumo (Sem lista de itens)",
      totalOrders: "Total Ordens",
      totalVolume: "Valor Total",
      totalCommission: "Total Comissão",
      genPdf: "Gerar Relatório PDF",
      exportExcel: "Exportar Excel",
      preview: "Prévia do Relatório",
      noData: "Sem dados para os filtros selecionados.",
      // PDF Specific
      commissionReport: "Relatório de Comissão",
      summaryReport: "Resumo Gerencial",
      period: "Período de Referência",
      generatedOn: "Gerado em",
      page: "Página",
      of: "de",
      confidential: "Documento Confidencial",
      endOfSummary: "*** Fim do Relatório Gerencial ***",
      status: "Status"
    },
    settings: {
      title: "Configurações",
      subtitle: "Configure regras globais, detalhes da empresa e backups.",
      commConfig: "Configuração de Comissão",
      important: "Nota Importante",
      importantMsg: "Alterar a porcentagem fixa afetará apenas novas ordens. Ordens existentes manterão o valor calculado na criação.",
      fixedPercentage: "Porcentagem Fixa de Comissão (%)",
      companyProfile: "Perfil da Empresa (Para Relatórios)",
      companyInfoMsg: "Opcional. Se preenchido, aparecerá no cabeçalho dos relatórios PDF.",
      companyName: "Nome da Empresa",
      cnpj: "CNPJ / Tax ID",
      address: "Endereço",
      contact: "Telefone / Email",
      logoUrl: "URL do Logo (Opcional)",
      primaryColor: "Cor Principal (Hex #)",
      brandingMsg: "Personalize a aparência dos seus relatórios PDF.",
      dataMgmt: "Gerenciamento de Dados",
      dataMsg: "Exporte seus dados para um arquivo JSON para segurança ou transferência.",
      exportBackup: "Exportar Backup",
      importBackup: "Importar Backup",
      saveAll: "Salvar Alterações",
      saved: "Salvo!",
      restoreConfirm: "Restaurar este backup substituirá TODOS os dados atuais. Isso não pode ser desfeito. Tem certeza?",
      restoreSuccess: "Backup restaurado com sucesso. Recarregando...",
      restoreFail: "Falha ao restaurar backup. Formato inválido."
    },
    login: {
      welcome: "Bem-vindo de volta",
      subtitle: "Insira suas credenciais para acessar o painel",
      email: "Endereço de Email",
      password: "Senha",
      signIn: "Entrar",
      mockEnv: "Ambiente de Teste • Qualquer senha funciona"
    }
  },
  'en-US': {
    common: {
      dashboard: "Dashboard",
      serviceOrders: "Service Orders",
      periods: "Periods",
      brands: "Brands",
      reports: "Reports",
      settings: "Settings",
      signOut: "Sign Out",
      menu: "Menu",
      authenticated: "Authenticated",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      actions: "Actions",
      search: "Search...",
      all: "All",
      date: "Date",
      value: "Value",
      filtersActive: "Filters Active",
      required: "Required",
      optional: "Optional",
      yes: "Yes",
      no: "No",
      back: "Back"
    },
    status: {
      ALL: "All Status",
      PENDING: "Pending",
      PAID: "Paid"
    },
    dashboard: {
      title: "Dashboard Overview",
      subtitle: "Real-time performance metrics and analytics.",
      orders: "Orders",
      commission: "Commission",
      vsYesterday: "vs yest.",
      currentMonth: "Current Month",
      totalGenerated: "Total commission generated",
      bestPeriod: "Best Period",
      noDataYet: "No data yet",
      currentPeriod: "Current Period",
      cycleCommission: "Ongoing cycle commission",
      totalCommission: "Total Commission",
      allTimeEarnings: "All time earnings",
      historyTitle: "Commission History",
      orderStatus: "Order Status",
      total: "Total",
      topBrands: "Top Brands",
      byCommission: "By total commission",
      topCustomers: "Top Customers",
      byVolume: "By total service value",
      noBrandData: "No brand data available yet.",
      noCustomerData: "No customer data available yet."
    },
    orders: {
      title: "Service Orders",
      subtitle: "Manage orders, payments and history.",
      exportCsv: "Export CSV",
      newOrder: "New Order (N)",
      bulkSelected: "selected",
      markPaid: "Mark Paid (P)",
      deleteTitle: "Delete Order?",
      deleteBulkTitle: "Delete {count} Orders?",
      deleteMsg: "This action cannot be undone. Orders in paid periods will be skipped.",
      auditLog: "Audit Log",
      noHistory: "No history recorded.",
      editTitle: "Edit Order",
      newTitle: "New Service Order",
      osNumber: "O.S Number",
      date: "Date",
      customer: "Customer",
      brand: "Brand",
      selectBrand: "Select Brand",
      value: "Service Value (R$)",
      paymentMethod: "Payment Method",
      none: "None / Unspecified",
      calcCommission: "Commission",
      searchPlaceholder: "Search orders (F)...",
      allBrands: "All Brands",
      resetFilters: "Reset Filters",
      noOrdersFound: "No orders found",
      noOrdersMsg: "Adjust filters or create a new service order.",
      paidOn: "Paid on",
      errorRequired: "Please fill in all required fields.",
      errorPositive: "Service value must be a positive number.",
      errorFuture: "Order date cannot be in the future."
    },
    periods: {
      title: "Periods",
      subtitle: "Manage bi-weekly commission closures.",
      openPeriod: "Open Period",
      closedPaid: "Closed & Paid",
      serviceOrders: "Service Orders",
      totalVolume: "Total Value",
      commissionTotal: "Commission Total",
      paidOn: "Paid on",
      markAsPaid: "Mark as Paid",
      noPeriods: "No periods yet",
      noPeriodsMsg: "Periods are automatically generated when you create your first service order.",
      confirmClose: "Closing this period will lock all associated orders and mark them as PAID. This cannot be undone. Continue?"
    },
    brands: {
      title: "Brands",
      subtitle: "Manage brands available for service orders.",
      newBrand: "New Brand",
      editBrand: "Edit Brand",
      brandName: "Brand Name",
      saveBrand: "Save Brand",
      searchPlaceholder: "Search brands...",
      noBrands: "No brands found",
      errorRequired: "Brand name is required",
      confirmDelete: "Are you sure? This will not remove the brand name from existing historical orders."
    },
    reports: {
      title: "Reports",
      subtitle: "Generate PDF and Excel reports for accounting.",
      thisMonth: "This Month",
      lastMonth: "Last Month",
      startDate: "Start Date",
      endDate: "End Date",
      sortBy: "Sort By",
      defaultSort: "Date (Default)",
      brandSort: "Brand",
      summaryOnly: "Generate Summary Only (No item list)",
      totalOrders: "Total Orders",
      totalVolume: "Total Value",
      totalCommission: "Total Commission",
      genPdf: "Generate PDF Report",
      exportExcel: "Export Excel",
      preview: "Report Preview",
      noData: "No data available for the selected filters.",
      // PDF Specific
      commissionReport: "Commission Report",
      summaryReport: "Executive Summary",
      period: "Reference Period",
      generatedOn: "Generated On",
      page: "Page",
      of: "of",
      confidential: "Confidential Document",
      endOfSummary: "*** End of Executive Summary ***",
      status: "Status"
    },
    settings: {
      title: "Settings",
      subtitle: "Configure global rules, company details and backups.",
      commConfig: "Commission Configuration",
      important: "Important Note",
      importantMsg: "Changing the fixed commission percentage will only affect newly created service orders. Existing orders will retain their calculated commission value.",
      fixedPercentage: "Fixed Commission Percentage (%)",
      companyProfile: "Company Profile (For Reports)",
      companyInfoMsg: "Optional. If filled, it will appear on the header of generated PDF reports.",
      companyName: "Company Name",
      cnpj: "CNPJ / Tax ID",
      address: "Address",
      contact: "Phone / Email",
      logoUrl: "Logo URL (Optional)",
      primaryColor: "Primary Color (Hex #)",
      brandingMsg: "Customize the look and feel of your PDF reports.",
      dataMgmt: "Data Management",
      dataMsg: "Export your data to a JSON file for safe keeping or transfer.",
      exportBackup: "Export Backup",
      importBackup: "Import Backup",
      saveAll: "Save All Changes",
      saved: "Saved!",
      restoreConfirm: "Restoring this backup will overwrite ALL current data. This cannot be undone. Are you sure?",
      restoreSuccess: "Backup restored successfully. Reloading...",
      restoreFail: "Failed to restore backup. Invalid file format."
    },
    login: {
      welcome: "Welcome Back",
      subtitle: "Enter your credentials to access the dashboard",
      email: "Email Address",
      password: "Password",
      signIn: "Sign In",
      mockEnv: "Mock Environment • Any password works"
    }
  }
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('pt-BR');

  useEffect(() => {
    const stored = localStorage.getItem('commission_sys_lang') as Language;
    if (stored && (stored === 'pt-BR' || stored === 'en-US')) {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('commission_sys_lang', lang);
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split('.');
    let value: any = dictionary[language];
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key as keyof typeof value];
      } else {
        return path; // Fallback to key if missing
      }
    }

    if (typeof value !== 'string') return path;

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        value = value.replace(`{${key}}`, String(val));
      });
    }

    return value;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};