import React from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAbsences } from "@/hooks/useAbsences";
import { AlertCircle } from "lucide-react";

interface AbsenceModalProps {
  employeeId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function AbsenceModal({ employeeId, onSuccess, trigger }: AbsenceModalProps) {
  const [open, setOpen] = React.useState(false);
  const { createAbsence } = useAbsences(employeeId);
  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      reason: "",
      justified: false,
      employee_id: employeeId,
    }
  });

  const onSubmit = (data: any) => {
    createAbsence.mutate({
      ...data,
      justified: data.justified === "true" || data.justified === true,
    }, {
      onSuccess: () => {
        setOpen(false);
        reset();
        if (onSuccess) onSuccess();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="destructive" className="h-8">
            <AlertCircle className="h-4 w-4 mr-2" /> Registrar Falta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Falta / Ocorrência</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" {...register("date", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>Motivo / Descrição</Label>
            <Input {...register("reason", { required: true })} placeholder="Ex: Atestado médico, Falta injustificada..." />
          </div>
          <div className="space-y-2">
            <Label>Justificada?</Label>
            <Select defaultValue="false" onValueChange={(v) => setValue("justified", v === "true")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Não</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={createAbsence.isPending}>Registrar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
