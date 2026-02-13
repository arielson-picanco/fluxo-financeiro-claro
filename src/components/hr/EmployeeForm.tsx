import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Camera } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";

interface FormProps {
  employee?: Employee;
  onSuccess?: () => void;
}

export function EmployeeForm({ employee, onSuccess }: FormProps) {
  const isEditing = !!employee;
  const { createEmployee, updateEmployee } = useEmployees();
  const { uploadFile } = useFileUpload('employee_photos');
  const [open, setOpen] = React.useState(false);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(employee?.photo_url || null);

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: employee || {
      status: 'active',
      salary: 0,
      vt_value: 0,
      vr_value: 0,
    }
  });

  const status = watch("status");

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
      
      if (isEditing && employee?.id) {
        const url = await uploadFile(file, employee.id);
        if (url) updateEmployee.mutate({ id: employee.id, photo_url: url });
      }
    }
  };

  const onSubmit = async (data: any) => {
    // Tratamento rigoroso de datas para evitar erro de string vazia no Postgres
    const payload = {
      ...data,
      salary: parseFloat(data.salary) || 0,
      vt_value: parseFloat(data.vt_value) || 0,
      vr_value: parseFloat(data.vr_value) || 0,
      admission_date: data.admission_date || new Date().toISOString().split('T')[0],
      resignation_date: data.resignation_date && data.resignation_date !== "" ? data.resignation_date : null,
      pix_key: data.pix_key || null,
      bank_name: data.bank_name || null,
      notes: data.notes || null,
      sector: data.sector || null,
    };

    if (isEditing) {
      updateEmployee.mutate({ id: employee.id, ...payload }, {
        onSuccess: () => {
          setOpen(false);
          if (onSuccess) onSuccess();
        }
      });
    } else {
      createEmployee.mutate(payload, {
        onSuccess: () => {
          reset();
          setOpen(false);
          if (onSuccess) onSuccess();
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          {isEditing ? "Editar" : <><UserPlus className="h-4 w-4" /> Novo Funcionário</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Editar: ${employee.name}` : "Cadastrar Novo Funcionário"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          {/* Foto e Dados Básicos */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/20">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground/40" />
                )}
                <input 
                  type="file" 
                  id="photo-upload" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                <label 
                  htmlFor="photo-upload" 
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <span className="text-white text-xs font-medium">Alterar Foto</span>
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground">JPG ou PNG, máx 2MB</p>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Nome Completo</Label>
                <Input {...register("name", { required: true })} placeholder="Ex: João Silva" />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input {...register("document", { required: true })} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  defaultValue={employee?.status || 'active'} 
                  onValueChange={(v) => setValue("status", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="vacation">Férias</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Profissional */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <Label>Função / Cargo</Label>
              <Input {...register("role", { required: true })} placeholder="Ex: Vendedor" />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Input {...register("sector")} placeholder="Ex: Comercial" />
            </div>
            <div className="space-y-2">
              <Label>Salário Base (R$)</Label>
              <Input type="number" step="0.01" {...register("salary", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Data de Admissão</Label>
              <Input type="date" {...register("admission_date", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Data de Saída</Label>
              <Input type="date" {...register("resignation_date")} disabled={status === 'active'} />
            </div>
          </div>

          {/* Financeiro / Bancário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Banco</Label>
              <Input {...register("bank_name")} placeholder="Ex: Itaú, Nubank..." />
            </div>
            <div className="space-y-2">
              <Label>Chave PIX</Label>
              <Input {...register("pix_key")} placeholder="CPF, E-mail, Celular..." />
            </div>
            <div className="space-y-2">
              <Label>Vale Transporte (Diário)</Label>
              <Input type="number" step="0.01" {...register("vt_value")} />
            </div>
            <div className="space-y-2">
              <Label>Vale Refeição (Diário)</Label>
              <Input type="number" step="0.01" {...register("vr_value")} />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações / Histórico</Label>
            <Textarea 
              {...register("notes")} 
              placeholder="Anotações sobre o funcionário, comportamento, acordos..." 
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={createEmployee.isPending || updateEmployee.isPending}>
              {isEditing ? "Salvar Alterações" : "Cadastrar Funcionário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
