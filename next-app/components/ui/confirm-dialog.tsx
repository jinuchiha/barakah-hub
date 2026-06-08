'use client';
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription,
} from './dialog';
import { Button } from './button';
import { Input } from './input';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open, onOpenChange, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive = false, onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
          <Button
            type="button"
            onClick={() => { onOpenChange(false); onConfirm(); }}
            className={destructive ? 'bg-red-500/15 text-[#f08585] hover:bg-red-500/25 border-red-500/30' : ''}
            variant={destructive ? 'ghost' : 'gold'}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
}

export function PromptDialog({
  open, onOpenChange, title, description,
  placeholder = '', confirmLabel = 'Confirm', onConfirm,
}: PromptDialogProps) {
  const [value, setValue] = useState('');

  function submit() {
    const v = value;
    setValue('');
    onOpenChange(false);
    onConfirm(v);
  }

  function cancel() {
    setValue('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) cancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-2">
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={cancel}>Cancel</Button>
          <Button type="button" variant="gold" onClick={submit}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
