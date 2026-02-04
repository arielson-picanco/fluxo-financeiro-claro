import { useState } from "react";
import { Plus, Search, MoreHorizontal, Building2, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Supplier {
  id: string;
  name: string;
  document: string;
  document_type: 'cpf' | 'cnpj';
  category: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  is_active: boolean;
  total_payable: number;
  total_paid: number;
}

const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'ABC Móveis Ltda',
    document: '12.345.678/0001-90',
    document_type: 'cnpj',
    category: 'Móveis',
    email: 'contato@abcmoveis.com',
    phone: '(11) 99999-9999',
    city: 'São Paulo',
    state: 'SP',
    is_active: true,
    total_payable: 45000,
    total_paid: 120000,
  },
  {
    id: '2',
    name: 'Eletros Plus',
    document: '98.765.432/0001-10',
    document_type: 'cnpj',
    category: 'Eletrodomésticos',
    email: 'vendas@eletrosplus.com',
    phone: '(11) 88888-8888',
    city: 'Campinas',
    state: 'SP',
    is_active: true,
    total_payable: 28500,
    total_paid: 85000,
  },
  {
    id: '3',
    name: 'Transportadora Veloz',
    document: '11.222.333/0001-44',
    document_type: 'cnpj',
    category: 'Transporte',
    email: 'logistica@veloz.com',
    phone: '(11) 77777-7777',
    city: 'Guarulhos',
    state: 'SP',
    is_active: true,
    total_payable: 5200,
    total_paid: 42000,
  },
  {
    id: '4',
    name: 'Colchões Sonho Bom',
    document: '55.666.777/0001-88',
    document_type: 'cnpj',
    category: 'Colchões',
    email: 'comercial@sonhobom.com',
    phone: '(11) 66666-6666',
    city: 'Osasco',
    state: 'SP',
    is_active: false,
    total_payable: 0,
    total_paid: 65000,
  },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default function Suppliers() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSuppliers = mockSuppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.document.includes(searchQuery) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">
            Gerencie seus fornecedores e parceiros comerciais
          </p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nome, CNPJ ou categoria..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="card-hover">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {supplier.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">
                      {supplier.document}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <DropdownMenuItem>Ver contas</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Desativar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={supplier.is_active ? "default" : "secondary"}>
                  {supplier.is_active ? "Ativo" : "Inativo"}
                </Badge>
                <Badge variant="outline">{supplier.category}</Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{supplier.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{supplier.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{supplier.city}, {supplier.state}</span>
                </div>
              </div>

              <div className="pt-3 border-t grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">A Pagar</p>
                  <p className="text-sm font-semibold font-mono text-destructive">
                    {formatCurrency(supplier.total_payable)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Pago</p>
                  <p className="text-sm font-semibold font-mono text-success">
                    {formatCurrency(supplier.total_paid)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Nenhum fornecedor encontrado</h3>
          <p className="text-muted-foreground">
            Tente ajustar os filtros de busca
          </p>
        </div>
      )}
    </div>
  );
}
