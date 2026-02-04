import { useState, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { SupplierModal } from "@/components/modals/SupplierModal";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { useSuppliers, Supplier, SupplierInsert } from "@/hooks/useSuppliers";
import { formatCurrency } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function Suppliers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  
  const { canWrite, isAdmin } = useAuth();
  const { 
    suppliers, 
    isLoading, 
    createSupplier, 
    updateSupplier, 
    deleteSupplier,
    isCreating,
    isUpdating,
    isDeleting,
  } = useSuppliers();

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.document && s.document.includes(searchQuery)) ||
    (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenCreate = () => {
    setSelectedSupplier(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = (data: SupplierInsert | (SupplierInsert & { id: string })) => {
    if ('id' in data) {
      const { id, ...updates } = data;
      updateSupplier({ id, ...updates }, {
        onSuccess: () => setIsModalOpen(false),
      });
    } else {
      createSupplier(data, {
        onSuccess: () => setIsModalOpen(false),
      });
    }
  };

  const handleConfirmDelete = () => {
    if (supplierToDelete) {
      deleteSupplier(supplierToDelete.id, {
        onSuccess: () => {
          setIsDeleteModalOpen(false);
          setSupplierToDelete(null);
        },
      });
    }
  };

  // Reset modal form when closing
  useEffect(() => {
    if (!isModalOpen) {
      setSelectedSupplier(null);
    }
  }, [isModalOpen]);

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
        {canWrite && (
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Fornecedor
          </Button>
        )}
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

      {/* Loading State */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-12 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
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
                          {supplier.document || "Sem documento"}
                        </p>
                      </div>
                    </div>
                    {canWrite && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(supplier)}>
                            Editar
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleOpenDelete(supplier)}
                            >
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={supplier.is_active ? "default" : "secondary"}>
                      {supplier.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    {supplier.category && (
                      <Badge variant="outline">{supplier.category}</Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{supplier.phone}</span>
                      </div>
                    )}
                    {(supplier.city || supplier.state) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{[supplier.city, supplier.state].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
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
                {suppliers.length === 0 
                  ? "Comece cadastrando seu primeiro fornecedor"
                  : "Tente ajustar os filtros de busca"
                }
              </p>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <SupplierModal
        key={selectedSupplier?.id || 'new'}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        supplier={selectedSupplier}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
      />

      <DeleteConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Excluir fornecedor"
        description={`Tem certeza que deseja excluir o fornecedor "${supplierToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
