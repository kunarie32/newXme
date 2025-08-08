import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  apiService, 
  DashboardData, 
  WindowsVersion, 
  InstallData, 
  CreateInstallRequest,
  TopupTransaction
} from '@/services/api';
import { 
  Code, 
  LogOut, 
  User, 
  Settings, 
  Bell,
  Monitor,
  History,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  Clock,
  Shield,
  CreditCard
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import TopupModal from '@/components/TopupModal';
import TopupHistory from '@/components/TopupHistory';

interface PaymentModalData {
  reference: string;
  checkout_url: string;
  qr_url?: string;
  pay_code?: string;
  payment_name: string;
  final_amount: number;
  status: string;
  expired_time: number;
}

export default function UserDashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [windowsVersions, setWindowsVersions] = useState<WindowsVersion[]>([]);
  const [installHistory, setInstallHistory] = useState<InstallData[]>([]);
  const [topupHistory, setTopupHistory] = useState<TopupTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTopup, setIsLoadingTopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'history' | 'topup'>('install');
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showTopupHistory, setShowTopupHistory] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalData, setPaymentModalData] = useState<PaymentModalData | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TopupTransaction | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  
  // Install form state
  const [installForm, setInstallForm] = useState<CreateInstallRequest>({
    ip: '',
    passwd_vps: '',
    win_ver: '',
    passwd_rdp: ''
  });

  const { state, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  // Load topup history when topup tab is selected
  useEffect(() => {
    if (activeTab === 'topup') {
      loadTopupHistory();
    }
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [dashboardResponse, versionsResponse, historyResponse] = await Promise.all([
        apiService.getDashboard(),
        apiService.getWindowsVersions(),
        apiService.getInstallHistory()
      ]);

      if (dashboardResponse.data.data) {
        setDashboardData(dashboardResponse.data.data);
      }
      
      if (versionsResponse.data.data) {
        setWindowsVersions(versionsResponse.data.data);
      }
      
      if (historyResponse.data.data) {
        setInstallHistory(historyResponse.data.data);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load data',
        description: error.message || 'Please try refreshing the page.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTopupHistory = async () => {
    try {
      setIsLoadingTopup(true);
      const response = await apiService.getTopupHistory();
      
      if (response.data.success && response.data.data) {
        setTopupHistory(response.data.data);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load topup history',
        description: error.response?.data?.message || 'Please try again.',
      });
    } finally {
      setIsLoadingTopup(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      navigate('/');
    }
  };

  const handleInstallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!installForm.ip || !installForm.win_ver) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'IP address and Windows version are required.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await apiService.createInstall(installForm);
      
      toast({
        title: 'Install Request Created',
        description: 'Your Windows installation request has been submitted successfully.',
      });

      // Reset form and reload data
      setInstallForm({
        ip: '',
        passwd_vps: '',
        win_ver: '',
        passwd_rdp: ''
      });
      
      await loadData();
      setActiveTab('history');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to create install request',
        description: error.response?.data?.message || 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'running':
        return <Badge variant="outline" className="text-blue-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTopupStatusBadge = (status: string) => {
    const statusConfig = {
      'PAID': { variant: 'default' as const, label: 'Paid', className: 'bg-green-500' },
      'UNPAID': { variant: 'secondary' as const, label: 'Unpaid', className: 'bg-yellow-500' },
      'PENDING': { variant: 'secondary' as const, label: 'Pending', className: 'bg-yellow-500' },
      'EXPIRED': { variant: 'destructive' as const, label: 'Expired', className: '' },
      'FAILED': { variant: 'destructive' as const, label: 'Failed', className: '' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { variant: 'secondary' as const, label: status, className: '' };

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handlePayTransaction = (transaction: TopupTransaction) => {
    if (transaction.checkout_url) {
      setPaymentModalData({
        reference: transaction.reference,
        checkout_url: transaction.checkout_url,
        qr_url: transaction.qr_url || undefined,
        pay_code: transaction.pay_code,
        payment_name: transaction.payment_method,
        final_amount: transaction.final_amount,
        status: transaction.status,
        expired_time: transaction.expired_time
      });
      setShowPaymentModal(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Payment URL not available',
        description: 'This transaction cannot be paid. Please create a new topup.',
      });
    }
  };

  const handleViewDetails = (transaction: TopupTransaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  const isTransactionPayable = (transaction: TopupTransaction) => {
    if (transaction.status !== 'UNPAID' && transaction.status !== 'PENDING') {
      return false;
    }
    
    // Check if not expired
    const now = Math.floor(Date.now() / 1000);
    return transaction.expired_time > now;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p className="text-muted-foreground">Failed to load dashboard data</p>
          <Button onClick={loadData} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const user = dashboardData.user;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Code className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">XME Projects</h1>
              <p className="text-sm text-muted-foreground">User Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.profile?.avatar_url} />
                    <AvatarFallback>
                      {user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">{user.username}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Welcome back, {user.profile?.first_name || user.username}!
              </h2>
              <p className="text-muted-foreground">
                Manage your Windows installations
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!user.is_verified && (
                <Badge variant="destructive">
                  Email not verified
                </Badge>
              )}
              {user.admin === 1 && (
                <Badge variant="secondary">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
          </div>

          {!user.is_verified && (
            <Card className="border-yellow-500/20 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Please verify your email address
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      You need to verify your email to access all features.
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => navigate('/verify-email')}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Verify Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Quota</p>
                  <p className="text-2xl font-bold text-foreground">{user.quota || 0}</p>
                </div>
                <div className="h-12 w-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-3">
                <Button 
                  onClick={() => setShowTopupModal(true)}
                  size="sm" 
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Topup Quota
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Installs</p>
                  <p className="text-2xl font-bold text-foreground">{dashboardData.stats.totalVPS}</p>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Monitor className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Installs</p>
                  <p className="text-2xl font-bold text-foreground">{dashboardData.stats.activeConnections}</p>
                </div>
                <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-foreground">95%</p>
                </div>
                <div className="h-12 w-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === 'install' ? 'default' : 'outline'}
            onClick={() => setActiveTab('install')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Install
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            onClick={() => setActiveTab('history')}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            History
          </Button>
          <Button
            variant={activeTab === 'topup' ? 'default' : 'outline'}
            onClick={() => setActiveTab('topup')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Topup History
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'install' && (
          <Card>
            <CardHeader>
              <CardTitle>Install Windows</CardTitle>
              <CardDescription>
                Create a new Windows installation on your VPS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInstallSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ip">IPv4 Address *</Label>
                    <Input
                      id="ip"
                      type="text"
                      placeholder="192.168.1.100"
                      value={installForm.ip}
                      onChange={(e) => setInstallForm(prev => ({ ...prev, ip: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passwd_vps">VPS Password</Label>
                    <Input
                      id="passwd_vps"
                      type="password"
                      placeholder="Enter VPS password"
                      value={installForm.passwd_vps}
                      onChange={(e) => setInstallForm(prev => ({ ...prev, passwd_vps: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="win_ver">Windows Version *</Label>
                    <Select
                      value={installForm.win_ver}
                      onValueChange={(value) => setInstallForm(prev => ({ ...prev, win_ver: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Windows version" />
                      </SelectTrigger>
                      <SelectContent>
                        {windowsVersions.map((version) => (
                          <SelectItem key={version.id} value={version.slug}>
                            {version.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passwd_rdp">RDP Password</Label>
                    <Input
                      id="passwd_rdp"
                      type="password"
                      placeholder="Enter RDP password"
                      value={installForm.passwd_rdp}
                      onChange={(e) => setInstallForm(prev => ({ ...prev, passwd_rdp: e.target.value }))}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Install Request...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Submit Install Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === 'history' && (
          <Card>
            <CardHeader>
              <CardTitle>Install History</CardTitle>
              <CardDescription>
                View your Windows installation history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {installHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Monitor className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No installations yet</p>
                  <Button 
                    onClick={() => setActiveTab('install')} 
                    className="mt-4"
                  >
                    Create Your First Install
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Windows Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installHistory.map((install) => (
                      <TableRow key={install.id}>
                        <TableCell className="font-mono">{install.ip}</TableCell>
                        <TableCell>{install.win_ver}</TableCell>
                        <TableCell>{getStatusBadge(install.status)}</TableCell>
                        <TableCell>
                          {new Date(install.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'topup' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Topup History</CardTitle>
                  <CardDescription>
                    View your quota topup transaction history
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={loadTopupHistory}
                    disabled={isLoadingTopup}
                  >
                    {isLoadingTopup ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <History className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTopup ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : topupHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">No transactions found</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your topup history will appear here
                  </p>
                  <Button 
                    onClick={() => setShowTopupModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Make Your First Topup
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {topupHistory.map((transaction) => (
                    <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <CreditCard className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{transaction.quantity} Quota Purchase</p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(transaction.final_amount)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTopupStatusBadge(transaction.status)}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            {formatDate(transaction.created_at)}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(transaction)}
                            >
                              View Details
                            </Button>
                            {isTransactionPayable(transaction) && (
                              <Button
                                size="sm"
                                onClick={() => handlePayTransaction(transaction)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Topup Modal */}
      <TopupModal 
        open={showTopupModal}
        onOpenChange={setShowTopupModal}
        onSuccess={() => {
          // Reload dashboard data after successful topup
          loadData();
          // Also reload topup history if we're on that tab
          if (activeTab === 'topup') {
            loadTopupHistory();
          }
        }}
      />

      {/* Payment Modal for existing transactions */}
      {paymentModalData && (
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Complete Payment
              </DialogTitle>
              <DialogDescription>
                Complete your payment for transaction {paymentModalData.reference}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {paymentModalData.qr_url && (
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg border">
                    <img
                      src={paymentModalData.qr_url}
                      alt="Payment QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                </div>
              )}

              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Reference:</span>
                      <span className="font-mono text-xs">{paymentModalData.reference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-semibold">{formatCurrency(paymentModalData.final_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment:</span>
                      <span>{paymentModalData.payment_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant="secondary">{paymentModalData.status}</Badge>
                    </div>
                    {paymentModalData.pay_code && (
                      <div className="flex justify-between">
                        <span>Pay Code:</span>
                        <span className="font-mono">{paymentModalData.pay_code}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(paymentModalData.checkout_url, '_blank');
                  }}
                  className="flex-1"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Open Payment Page
                </Button>
                <Button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transaction Details
              </DialogTitle>
              <DialogDescription>
                Detailed information for transaction {selectedTransaction.reference}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference:</span>
                      <span className="font-mono text-xs">{selectedTransaction.reference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Merchant Ref:</span>
                      <span className="font-mono text-xs">{selectedTransaction.merchant_ref}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-medium">{selectedTransaction.quantity} quota</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Method:</span>
                      <span className="font-medium">{selectedTransaction.payment_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getTopupStatusBadge(selectedTransaction.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">{formatDate(selectedTransaction.created_at)}</span>
                    </div>
                    {selectedTransaction.paid_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid:</span>
                        <span className="font-medium">{formatDate(selectedTransaction.paid_at)}</span>
                      </div>
                    )}
                    {selectedTransaction.pay_code && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pay Code:</span>
                        <span className="font-mono">{selectedTransaction.pay_code}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {selectedTransaction.discount_amount > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Price Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedTransaction.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({selectedTransaction.discount_percentage}%):</span>
                      <span>-{formatCurrency(selectedTransaction.discount_amount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedTransaction.final_amount)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                {isTransactionPayable(selectedTransaction) && (
                  <Button
                    onClick={() => {
                      setShowTransactionDetails(false);
                      handlePayTransaction(selectedTransaction);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowTransactionDetails(false)}
                  className={isTransactionPayable(selectedTransaction) ? "flex-1" : "w-full"}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}