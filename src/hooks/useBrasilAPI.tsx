import { useState } from 'react';
import { toast } from 'sonner';

export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  email: string;
  telefone: string;
}

export function useBrasilAPI() {
  const [isLoading, setIsLoading] = useState(false);

  const fetchCNPJ = async (cnpj: string): Promise<CNPJData | null> => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos');
      return null;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('CNPJ não encontrado');
        } else {
          toast.error('Erro ao consultar CNPJ');
        }
        return null;
      }

      const data = await response.json();
      
      toast.success('Dados do CNPJ carregados com sucesso!');
      
      return {
        cnpj: data.cnpj,
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        municipio: data.municipio || '',
        uf: data.uf || '',
        cep: data.cep || '',
        email: data.email || '',
        telefone: data.ddd_telefone_1 || '',
      };
    } catch (error) {
      console.error('Erro ao consultar BrasilAPI:', error);
      toast.error('Erro de conexão ao consultar CNPJ');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchCNPJ,
    isLoading,
  };
}
