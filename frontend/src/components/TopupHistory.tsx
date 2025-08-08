import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';
import { 
  History,
  Loader2,
  RefreshCw,
  Calendar,
  CreditCard,
  Hash
} from 'lucide-react';

interface TopupTransaction {
  id: number;
  reference: string;
  merchant_ref: string;
  quantity: number;
  total_amount: number;
  discount_percentage: number;
  discount_amount: number;
  final_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  paid_at?: string;
}

interface TopupHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TopupHistory({ open, onOpenChange }: TopupHistoryProps) {
  const [transactions, setTransactions] = useState<TopupTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTransactions();
    }
  }, [open]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getTopupHistory();
      
      if (response.data.success && response.data.data) {
        setTransactions(response.data.data);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load transaction history',
      });
    } finally {
      setIsLoading(false);
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PAID': { variant: 'default' as const, label: 'Paid', className: 'bg-green-500' },
      'UNPAID': { variant: 'secondary' as const, label: 'Unpaid', className: 'bg-yellow-500' },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Top Up History
          </DialogTitle>
          <DialogDescription>
            View your quota top-up transaction history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {transactions.length} transaction(s) found
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadTransactions}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No transactions found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your top-up history will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{transaction.quantity} Quota Purchase</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {transaction.reference || transaction.merchant_ref}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(transaction.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-medium">{formatCurrency(transaction.final_amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Payment Method</p>
                        <p className="font-medium">{transaction.payment_method}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>
                      {transaction.paid_at && (
                        <div>
                          <p className="text-muted-foreground">Paid</p>
                          <p className="font-medium">{formatDate(transaction.paid_at)}</p>
                        </div>
                      )}
                    </div>

                    {transaction.discount_amount > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(transaction.total_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount ({transaction.discount_percentage}%):</span>
                          <span>-{formatCurrency(transaction.discount_amount)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>{formatCurrency(transaction.final_amount)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
