import { Building2, Mail, Phone, MapPin, FileText, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AttachmentList } from '@/components/attachments/AttachmentList';
import { Supplier } from '@/hooks/useSuppliers';
import { maskCPF, maskCNPJ } from '@/lib/masks';

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

        <div className="space-y-6">
          {/* Status and Tags */}
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

          {/* Contact Information */}
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

          {/* Address */}
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

          {/* Notes */}
          {supplier.notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Observações</p>
              <p className="text-sm bg-muted/50 p-3 rounded-lg">{supplier.notes}</p>
            </div>
          )}

          <Separator />

          {/* Attachments */}
          <AttachmentList
            recordType="supplier"
            recordId={supplier.id}
            defaultBoletoUrl={supplier.default_boleto_url}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
