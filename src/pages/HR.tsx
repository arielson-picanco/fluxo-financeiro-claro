import { useState } from "react";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Receipt, Calculator, Wallet, Eye, Trash2, Search, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EmployeeForm } from "@/components/hr/EmployeeForm";
import { EmployeeDetails } from "@/components/hr/EmployeeDetails";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HR() {
  const { employees, isLoading, deleteEmployee, generatePayroll } = useEmployees();
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('employees');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados para geração de folha
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [payrollType, setPayrollType] = useState<'first_half' | 'second_half'>('first_half');

  const filteredEmployees = employees?.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.document.includes(searchTerm) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Deseja realmente remover o funcionário ${name}? Esta ação não pode ser desfeita.`)) {
      deleteEmployee.mutate(id);
    }
  };

  const handleGeneratePayroll = () => {
    const periodName = payrollType === 'first_half' ? 'Adiantamento (15)' : 'Saldo + Benefícios (30)';
    if (window.confirm(`Deseja gerar a folha de ${periodName} para ${payrollMonth}/${payrollYear}? Isso criará lançamentos automáticos no Contas a Pagar.`)) {
      generatePayroll.mutate({
        month: payrollMonth,
        year: payrollYear,
        type: payrollType
      });
    }
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recursos Humanos</h1>
          <p className="text-muted-foreground">Gestão de funcionários e folha de pagamento quinzenal.</p>
        </div>
        <div className="flex gap-2 bg-muted p-1 rounded-lg">
          <Button 
            variant={activeTab === 'employees' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setActiveTab('employees')}
            className="rounded-md"
          >
            <Users className="mr-2 h-4 w-4" /> Funcionários
          </Button>
          <Button 
            variant={activeTab === 'payroll' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setActiveTab('payroll')}
            className="rounded-md"
          >
            <Receipt className="mr-2 h-4 w-4" /> Folha de Pagamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Funcionários</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{employees?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Folha Mensal Estimada</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                employees?.reduce((acc: number, emp: Employee) => acc + Number(emp.salary), 0) || 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Próximo Pagamento</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">15/{format(new Date(), 'MM/yyyy')}</div>
          </CardContent>
        </Card>
      </div>

      {activeTab === 'employees' ? (
        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle>Lista de Funcionários</CardTitle>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nome, CPF ou cargo..." 
                  className="pl-9 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <EmployeeForm />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo / Setor</TableHead>
                    <TableHead>Salário Base</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees?.map((emp: Employee) => (
                    <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted overflow-hidden border">
                            {emp.photo_url ? (
                              <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                {emp.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          {emp.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{emp.role}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">{emp.sector || 'Geral'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(emp.salary)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {emp.admission_date ? format(new Date(emp.admission_date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          emp.status === 'active' ? 'bg-green-100 text-green-700' : emp.status === 'vacation' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {emp.status === 'active' ? 'Ativo' : emp.status === 'vacation' ? 'Férias' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => setSelectedEmployee(emp)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <EmployeeForm employee={emp} />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(emp.id, emp.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!filteredEmployees || filteredEmployees.length === 0) && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">
                        {searchTerm ? "Nenhum funcionário encontrado para esta busca." : "Nenhum funcionário cadastrado."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Processamento de Folha (Quinzenal)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 bg-muted/30 rounded-lg border border-dashed">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Mês</label>
                  <Select value={String(payrollMonth)} onValueChange={(v) => setPayrollMonth(Number(v))}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((name, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Ano</label>
                  <Select value={String(payrollYear)} onValueChange={(v) => setPayrollYear(Number(v))}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026].map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Período</label>
                  <Select value={payrollType} onValueChange={(v) => setPayrollType(v as any)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_half">Adiantamento (Dia 15)</SelectItem>
                      <SelectItem value="second_half">Saldo + Benefícios (Dia 30)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full gap-2" 
                  onClick={handleGeneratePayroll}
                  disabled={generatePayroll.isPending}
                >
                  {generatePayroll.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4" />
                  )}
                  Gerar Folha do Período
                </Button>
              </div>

              <div className="rounded-md border border-dashed p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="max-w-xs mx-auto">
                  <h3 className="font-semibold">Histórico de Processamento</h3>
                  <p className="text-sm text-muted-foreground">
                    Os registros de folha gerados aparecerão aqui e serão lançados automaticamente no seu Contas a Pagar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Detalhes do Funcionário */}
      <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil do Funcionário</DialogTitle>
          </DialogHeader>
          {selectedEmployee && <EmployeeDetails employee={selectedEmployee} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}