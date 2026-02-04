import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUsers, UserWithRole } from "@/hooks/useUsers";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, 
  Shield, 
  Building2,
  Save,
  Trash2,
  Users,
  Loader2,
  Camera,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { roleLabels, type AppRole } from "@/lib/supabase";
import { toast } from "sonner";

export default function Settings() {
  const { profile, isAdmin, updateProfile, user } = useAuth();
  const { users, isLoading: isLoadingUsers, updateRole, deleteUser, isUpdatingRole, isDeleting } = useUsers();
  const { uploadAvatar, isUploading } = useAvatarUpload();
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ name, phone });
      toast.success('Perfil atualizado com sucesso!');
    } catch {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
  };

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    updateRole({ userId, role: newRole });
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      deleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie seu perfil e preferências do sistema
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
          )}
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" />
            Empresa
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <div className="grid gap-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize suas informações de perfil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                        {profile?.name ? getInitials(profile.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? 'Enviando...' : 'Alterar foto'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG ou GIF. Máximo 2MB.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Segurança
                </CardTitle>
                <CardDescription>
                  Configure a segurança da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Alterar Senha</p>
                    <p className="text-sm text-muted-foreground">
                      Recomendamos trocar sua senha regularmente
                    </p>
                  </div>
                  <Button variant="outline">Alterar</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Gerenciar Usuários</CardTitle>
                    <CardDescription>
                      Visualize e altere permissões de usuários do sistema
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Permissão</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((userItem) => (
                        <TableRow key={userItem.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={userItem.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(userItem.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{userItem.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{userItem.email}</TableCell>
                          <TableCell>
                            <Select 
                              value={userItem.role} 
                              onValueChange={(value) => handleRoleChange(userItem.id, value as AppRole)}
                              disabled={userItem.id === user?.id || isUpdatingRole}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="financeiro">Financeiro</SelectItem>
                                <SelectItem value="visualizacao">Visualização</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              disabled={userItem.id === user?.id || userItem.role === 'admin'}
                              onClick={() => setUserToDelete(userItem)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Company Tab */}
        <TabsContent value="company" className="mt-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Dados da Empresa</CardTitle>
              <CardDescription>
                Informações da empresa para relatórios e documentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Razão Social</Label>
                  <Input defaultValue="Móveis e Eletro Ltda" />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input defaultValue="12.345.678/0001-90" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Endereço</Label>
                  <Input defaultValue="Rua das Empresas, 123 - Centro" />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input defaultValue="São Paulo" />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select defaultValue="SP">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SP">São Paulo</SelectItem>
                      <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                      <SelectItem value="MG">Minas Gerais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button>
                <Save className="h-4 w-4 mr-2" />
                Salvar Dados
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteConfirmModal
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="Remover usuário"
        description={`Tem certeza que deseja remover "${userToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteUser}
        isLoading={isDeleting}
      />
    </div>
  );
}
