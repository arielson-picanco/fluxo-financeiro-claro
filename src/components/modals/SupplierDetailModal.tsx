import { Building2, Mail, Phone, MapPin, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttachmentList } from '@/components/attachments/AttachmentList';
import { Supplier } from '@/hooks/useSuppliers';
import { maskCPF, maskCNPJ } from '@/lib/masks';

// Importações dos novos componentes de Notas Fiscais
import { SupplierInvoicesList } from "@/components/suppliers/SupplierInvoicesList";
import { SupplierInvoiceForm } from "@/components/suppliers/SupplierInvoiceForm";
interface SupplierDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}

export function SupplierDetailModal({ open, onOpenChange, supplier }: SupplierDetailModalProps) {
  if (!supplier) return null;

  const formatDocument = (doc: string | null, type: string | null) => {
    if (!doc) return 'Não informado';
    if (type === 'cpf') return maskCPF(doc);
    if (type === 'cnpj') return maskCNPJ(doc);
    return doc;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="block">{supplier.name}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {formatDocument(supplier.document, supplier.document_type)}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Dados e Contato</TabsTrigger>
            <TabsTrigger value="invoices">Notas Fiscais (NFs)</TabsTrigger>
          </TabsList>

          {/* ABA 1: DETALHES GERAIS */}
          <TabsContent value="details" className="space-y-6 mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                {supplier.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
              {supplier.category && (
                <Badge variant="outline">{supplier.category}</Badge>
              )}
              {supplier.tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              {supplier.email && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{supplier.email}</p>
                  </div>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-muted">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm font-medium">{supplier.phone}</p>
                  </div>
                </div>
              )}
            </div>

            {(supplier.address || supplier.city || supplier.state) && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-muted">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Endereço</p>
                  <p className="text-sm font-medium">
                    {[supplier.address, supplier.city, supplier.state]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            )}

            {supplier.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observações</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{supplier.notes}</p>
              </div>
            )}

            <Separator />
            <AttachmentList
              recordType="supplier"
              recordId={supplier.id}
              defaultBoletoUrl={supplier.default_boleto_url}
            />
          </TabsContent>

          {/* ABA 2: NOTAS FISCAIS */}
          <TabsContent value="invoices" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Histórico de Faturas</h3>
                <p className="text-sm text-muted-foreground">Gerencie as NFs de produtos deste fornecedor</p>
              </div>
              <SupplierInvoiceForm supplierId={supplier.id} />
            </div>
            <SupplierInvoicesList supplierId={supplier.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}