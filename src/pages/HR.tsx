import { useState } from "react";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Receipt, Calculator, Plus, UserPlus, Wallet } from "lucide-react";
import { format } from "date-fns";

export default function HR() {
  const { employees, isLoading } = useEmployees();
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('employees');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recursos Humanos</h1>
          <p className="text-muted-foreground">Gestão de funcionários e folha de pagamento quinzenal.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === 'employees' ? 'default' : 'outline'} onClick={() => setActiveTab('employees')}>
            <Users className="mr-2 h-4 w-4" /> Funcionários
          </Button>
          <Button variant={activeTab === 'payroll' ? 'default' : 'outline'} onClick={() => setActiveTab('payroll')}>
            <Receipt className="mr-2 h-4 w-4" /> Folha de Pagamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Folha Mensal Estimada</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                employees?.reduce((acc: number, emp: Employee) => acc + Number(emp.salary), 0) || 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Próximo Pagamento</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15/{format(new Date(), 'MM/yyyy')}</div>
          </CardContent>
        </Card>
      </div>

      {activeTab === 'employees' ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lista de Funcionários</CardTitle>
            <Button size="sm"><UserPlus className="mr-2 h-4 w-4" /> Novo Funcionário</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Salário Base</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees?.map((emp: Employee) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.role}</TableCell>
                    <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(emp.salary)}</TableCell>
                    <TableCell>{emp.admission_date ? format(new Date(emp.admission_date), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {emp.status === 'active' ? 'Ativo' : emp.status === 'vacation' ? 'Férias' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Editar</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!employees || employees.length === 0) && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">
                      Nenhum funcionário cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Processamento de Folha (Quinzenal)</CardTitle>
            <Button size="sm" variant="secondary"><Calculator className="mr-2 h-4 w-4" /> Gerar Folha do Período</Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10 text-muted-foreground italic">
              Selecione um período para visualizar ou processar a folha de pagamento.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
